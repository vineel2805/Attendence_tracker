import React, { useState, useEffect } from 'react';
import { AppBar } from '@/app/components/AppBar';
import { BottomNav } from '@/app/components/BottomNav';
import { Input } from '@/app/components/Input';
import { Button } from '@/app/components/Button';
import { storage } from '@/utils/storage';
import { AppSettingsV2, SubjectV2, DayId, SubjectType, DayConfig } from '@/types';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';

type SettingsTab = 'periods' | 'subjects';

const DAY_LABELS: Array<{ id: DayId; label: string }> = [
  { id: 'Mon', label: 'Monday' },
  { id: 'Tue', label: 'Tuesday' },
  { id: 'Wed', label: 'Wednesday' },
  { id: 'Thu', label: 'Thursday' },
  { id: 'Fri', label: 'Friday' },
  { id: 'Sat', label: 'Saturday' },
  { id: 'Sun', label: 'Sunday' },
];

export const SettingsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('periods');

  // Edit mode states
  const [isEditingPeriods, setIsEditingPeriods] = useState(false);
  const [isEditingSubjects, setIsEditingSubjects] = useState(false);

  // Saved data (source of truth)
  const [savedSettings, setSavedSettings] = useState<AppSettingsV2 | null>(null);
  const [savedSubjects, setSavedSubjects] = useState<SubjectV2[]>([]);

  // Editing form data
  const [periodDurationStr, setPeriodDurationStr] = useState('');
  const [dayTotalsStr, setDayTotalsStr] = useState<Record<DayId, string>>({} as Record<DayId, string>);
  const [settingsError, setSettingsError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [editingSubjects, setEditingSubjects] = useState<SubjectV2[]>([]);
  const [subjectErrors, setSubjectErrors] = useState<Record<string, string>>({});

  const initPeriodsForm = (settings: AppSettingsV2) => {
    setPeriodDurationStr(settings.periodDurationMinutes.toString());
    const dayTotals: Record<DayId, string> = {} as Record<DayId, string>;
    DAY_LABELS.forEach(d => {
      dayTotals[d.id] = (settings.days[d.id]?.totalPeriods ?? 0).toString();
    });
    setDayTotalsStr(dayTotals);
    setFieldErrors({});
    setSettingsError('');
  };

  // Load initial data
  useEffect(() => {
    const loaded = storage.getSettingsV2();
    setSavedSettings(loaded);
    initPeriodsForm(loaded);

    const loadedSubjects = storage.getSubjectsV2();
    setSavedSubjects(loadedSubjects);
    setEditingSubjects(loadedSubjects);

    // Auto-enter edit mode if no data configured
    const hasPeriodsConfigured = Object.values(loaded.days).some((d: DayConfig) => d.totalPeriods > 0);
    if (!hasPeriodsConfigured) {
      setIsEditingPeriods(true);
    }
    if (loadedSubjects.length === 0) {
      setIsEditingSubjects(true);
    }
  }, []);

  const parsePositiveInt = (str: string, max?: number): { value: number | null; error: string } => {
    if (!str.trim()) {
      return { value: null, error: 'This field is required' };
    }
    const num = Number(str);
    if (isNaN(num) || !Number.isInteger(num)) {
      return { value: null, error: 'Must be a whole number' };
    }
    if (num < 0) {
      return { value: null, error: 'Cannot be negative' };
    }
    if (max !== undefined && num > max) {
      return { value: null, error: `Maximum ${max} allowed` };
    }
    return { value: num, error: '' };
  };

  const handlePeriodDurationChange = (value: string) => {
    setPeriodDurationStr(value);
    const parsed = parsePositiveInt(value);
    if (parsed.error) {
      setFieldErrors(prev => ({ ...prev, periodDuration: parsed.error }));
    } else {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next.periodDuration;
        return next;
      });
    }
    setSettingsError('');
  };

  const handleDayTotalChange = (dayId: DayId, value: string) => {
    setDayTotalsStr(prev => ({ ...prev, [dayId]: value }));
    const parsed = parsePositiveInt(value);
    if (parsed.error && parsed.value === null) {
      setFieldErrors(prev => ({ ...prev, [`day-${dayId}`]: parsed.error }));
    } else {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[`day-${dayId}`];
        return next;
      });
    }
    setSettingsError('');
  };

  const handleSaveSettings = () => {
    const errors: Record<string, string> = {};
    
    const periodDurationParsed = parsePositiveInt(periodDurationStr);
    if (periodDurationParsed.error || periodDurationParsed.value === null || periodDurationParsed.value <= 0) {
      errors.periodDuration = periodDurationParsed.error || 'Period duration must be greater than zero.';
    }

    DAY_LABELS.forEach(d => {
      const str = dayTotalsStr[d.id] ?? '0';
      const parsed = parsePositiveInt(str, 14); // Max 14 periods per day
      if (parsed.error || parsed.value === null || parsed.value < 0) {
        errors[`day-${d.id}`] = parsed.error || 'Total periods cannot be negative.';
      }
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSettingsError('Please fix all errors before saving.');
      return;
    }

    const periodDuration = periodDurationParsed.value!;
    const days: Record<DayId, DayConfig> = {} as Record<DayId, DayConfig>;
    DAY_LABELS.forEach(d => {
      const parsed = parsePositiveInt(dayTotalsStr[d.id] ?? '0');
      days[d.id] = { day: d.id, totalPeriods: parsed.value ?? 0 };
    });

    const newSettings: AppSettingsV2 = {
      periodDurationMinutes: periodDuration,
      days,
    };

    storage.setSettingsV2(newSettings);
    setSavedSettings(newSettings);
    setIsEditingPeriods(false);
    toast.success('Period settings saved!');
  };

  const handleCancelPeriods = () => {
    if (savedSettings) {
      initPeriodsForm(savedSettings);
    }
    setIsEditingPeriods(false);
  };

  const handleEditPeriods = () => {
    if (savedSettings) {
      initPeriodsForm(savedSettings);
    }
    setIsEditingPeriods(true);
  };

  const handleAddSubject = () => {
    const newSubject: SubjectV2 = {
      id: `subject-${Date.now()}`,
      name: '',
      type: 'theory',
    };
    setEditingSubjects(prev => [...prev, newSubject]);
    setSubjectErrors(prev => ({
      ...prev,
      [newSubject.id]: 'Subject name is required',
    }));
  };

  const handleSubjectChange = (id: string, patch: Partial<SubjectV2>) => {
    setEditingSubjects(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));

    setSubjectErrors(prev => {
      const next = { ...prev };
      const updated = editingSubjects.find(s => s.id === id);
      const nextName = patch.name ?? updated?.name ?? '';
      if (!nextName.trim()) {
        next[id] = 'Subject name is required';
      } else {
        delete next[id];
      }
      return next;
    });
  };

  const handleDeleteSubject = (id: string) => {
    setEditingSubjects(prev => prev.filter(s => s.id !== id));
    setSubjectErrors(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleSaveSubjects = () => {
    const errors: Record<string, string> = {};
    editingSubjects.forEach(s => {
      if (!s.name.trim()) errors[s.id] = 'Subject name is required';
    });
    setSubjectErrors(errors);
    if (Object.keys(errors).length > 0) return;
    
    storage.setSubjectsV2(editingSubjects);
    setSavedSubjects(editingSubjects);
    setIsEditingSubjects(false);
    toast.success('Subjects saved!');
  };

  const handleCancelSubjects = () => {
    setEditingSubjects(savedSubjects);
    setSubjectErrors({});
    setIsEditingSubjects(false);
  };

  const handleEditSubjects = () => {
    setEditingSubjects(savedSubjects);
    setSubjectErrors({});
    setIsEditingSubjects(true);
  };

  // Check if there's data configured
  const hasPeriodsConfigured = savedSettings && Object.values(savedSettings.days).some((d: DayConfig) => d.totalPeriods > 0);

  return (
    <div className="min-h-screen bg-bg-secondary pb-20">
      <AppBar title="Settings" showProfile={false} />

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Tabs */}
        <div className="bg-bg-primary p-2 rounded-[10px] border border-border flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('periods')}
            className={`flex-1 py-2 rounded-[8px] text-sm font-medium transition-colors ${
              activeTab === 'periods'
                ? 'bg-text-primary text-bg-primary'
                : 'bg-bg-muted text-text-primary hover:bg-border'
            }`}
          >
            Periods
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('subjects')}
            className={`flex-1 py-2 rounded-[8px] text-sm font-medium transition-colors ${
              activeTab === 'subjects'
                ? 'bg-text-primary text-bg-primary'
                : 'bg-bg-muted text-text-primary hover:bg-border'
            }`}
          >
            Subjects
          </button>
        </div>

        {/* PERIODS TAB */}
        {activeTab === 'periods' && (
          <div className="bg-bg-primary p-4 rounded-[10px] border border-border space-y-4">
            {/* Header with Edit button */}
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-text-primary">
                Period Configuration
              </h3>
              {!isEditingPeriods && hasPeriodsConfigured && (
                <Button
                  type="button"
                  variant="secondary"
                  className="px-3 py-2 text-xs"
                  onClick={handleEditPeriods}
                >
                  <Pencil className="w-3.5 h-3.5 inline mr-1" />
                  Edit
                </Button>
              )}
            </div>

            {isEditingPeriods ? (
              // EDIT MODE
              <>
                <div>
                  <Input
                    type="text"
                    inputMode="numeric"
                    label="Period Duration (minutes)"
                    value={periodDurationStr}
                    placeholder="45"
                    onChange={(e) => handlePeriodDurationChange(e.target.value)}
                    fullWidth
                    error={fieldErrors.periodDuration}
                  />
                  <p className="mt-1 text-xs text-text-muted">
                    Typical: 45 or 50 minutes per period
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-text-secondary">
                    Total Periods (per day)
                  </h4>
                  <p className="text-xs text-text-muted mb-2">
                    Maximum 14 periods per day recommended
                  </p>

                  <div className="space-y-3">
                    {DAY_LABELS.map(d => (
                      <div
                        key={d.id}
                        className="bg-bg-secondary p-3 rounded-[10px] border border-border"
                      >
                        <p className="text-sm font-medium text-text-primary mb-2">
                          {d.label}
                        </p>
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={dayTotalsStr[d.id] ?? ''}
                          onChange={(e) => handleDayTotalChange(d.id, e.target.value)}
                          fullWidth
                          error={fieldErrors[`day-${d.id}`]}
                        />
                        <p className="mt-1 text-xs text-text-muted">
                          Use 0 for a holiday (no periods)
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {settingsError && (
                  <p className="text-sm text-danger">{settingsError}</p>
                )}

                <div className="flex gap-3">
                  {hasPeriodsConfigured && (
                    <Button variant="secondary" fullWidth onClick={handleCancelPeriods}>
                      Cancel
                    </Button>
                  )}
                  <Button variant="primary" fullWidth onClick={handleSaveSettings}>
                    Save
                  </Button>
                </div>
              </>
            ) : (
              // VIEW MODE
              <div className="space-y-4">
                <div className="bg-bg-secondary p-3 rounded-[10px] border border-border">
                  <p className="text-xs text-text-muted mb-1">Period Duration</p>
                  <p className="text-sm font-medium text-text-primary">
                    {savedSettings?.periodDurationMinutes ?? 0} minutes
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-text-secondary mb-2">
                    Periods per Day
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {DAY_LABELS.map(d => {
                      const periods = savedSettings?.days[d.id]?.totalPeriods ?? 0;
                      return (
                        <div
                          key={d.id}
                          className={`p-3 rounded-[10px] border ${
                            periods === 0
                              ? 'bg-bg-muted border-border'
                              : 'bg-bg-secondary border-border'
                          }`}
                        >
                          <p className="text-xs text-text-muted">{d.label}</p>
                          <p className={`text-sm font-medium ${
                            periods === 0 ? 'text-text-muted' : 'text-text-primary'
                          }`}>
                            {periods === 0 ? 'Holiday' : `${periods} periods`}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SUBJECTS TAB */}
        {activeTab === 'subjects' && (
          <div className="bg-bg-primary p-4 rounded-[10px] border border-border space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-text-primary">
                Subjects ({isEditingSubjects ? editingSubjects.length : savedSubjects.length})
              </h3>
              {!isEditingSubjects && savedSubjects.length > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  className="px-3 py-2 text-xs"
                  onClick={handleEditSubjects}
                >
                  <Pencil className="w-3.5 h-3.5 inline mr-1" />
                  Edit
                </Button>
              )}
            </div>

            {isEditingSubjects ? (
              // EDIT MODE
              <>
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  onClick={handleAddSubject}
                >
                  <Plus className="w-4 h-4 inline mr-1" />
                  Add Subject
                </Button>

                {editingSubjects.length === 0 ? (
                  <p className="text-sm text-text-muted text-center py-4">
                    No subjects yet. Add your first subject above.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {editingSubjects.map((subject) => (
                      <div
                        key={subject.id}
                        className="bg-bg-secondary p-3 rounded-[10px] border border-border"
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-1 space-y-2">
                            <Input
                              type="text"
                              placeholder="Subject name"
                              value={subject.name}
                              onChange={(e) => handleSubjectChange(subject.id, { name: e.target.value })}
                              fullWidth
                              error={subjectErrors[subject.id]}
                            />

                            <div>
                              <label className="block mb-2 text-sm font-medium text-text-primary">
                                Type
                              </label>
                              <select
                                value={subject.type}
                                onChange={(e) =>
                                  handleSubjectChange(subject.id, { type: e.target.value as SubjectType })
                                }
                                className="w-full px-4 py-3 rounded-[10px] border border-border bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-text-primary/20"
                              >
                                <option value="theory">Theory</option>
                                <option value="lab">Lab</option>
                              </select>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteSubject(subject.id)}
                            className="p-2 rounded-lg bg-danger/10 hover:bg-danger/20 transition-colors"
                            aria-label="Delete subject"
                          >
                            <Trash2 className="w-4 h-4 text-danger" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3">
                  {savedSubjects.length > 0 && (
                    <Button variant="secondary" fullWidth onClick={handleCancelSubjects}>
                      Cancel
                    </Button>
                  )}
                  <Button 
                    type="button" 
                    variant="primary" 
                    fullWidth 
                    onClick={handleSaveSubjects}
                    disabled={editingSubjects.length === 0}
                  >
                    Save
                  </Button>
                </div>
              </>
            ) : (
              // VIEW MODE
              <>
                {savedSubjects.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-text-muted mb-4">
                      No subjects configured yet.
                    </p>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleEditSubjects}
                    >
                      <Plus className="w-4 h-4 inline mr-1" />
                      Add Subjects
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {savedSubjects.map((subject) => (
                      <div
                        key={subject.id}
                        className="bg-bg-secondary p-3 rounded-[10px] border border-border flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            {subject.name}
                          </p>
                          <p className="text-xs text-text-muted capitalize">
                            {subject.type}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                          subject.type === 'lab'
                            ? 'bg-accent/10 text-accent'
                            : 'bg-text-primary/10 text-text-primary'
                        }`}>
                          {subject.type === 'lab' ? 'Lab' : 'Theory'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

