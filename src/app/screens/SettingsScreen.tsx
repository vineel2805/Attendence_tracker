import React, { useState, useEffect } from 'react';
import { AppBar } from '@/app/components/AppBar';
import { BottomNav } from '@/app/components/BottomNav';
import { Input } from '@/app/components/Input';
import { Button } from '@/app/components/Button';
import { storage } from '@/utils/storage';
import { AppSettingsV2, SubjectV2, DayId, SubjectType, DayConfig } from '@/types';
import { Plus, Trash2 } from 'lucide-react';

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

  const [periodDurationStr, setPeriodDurationStr] = useState('');
  const [dayTotalsStr, setDayTotalsStr] = useState<Record<DayId, string>>({} as Record<DayId, string>);
  const [settingsError, setSettingsError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [subjects, setSubjects] = useState<SubjectV2[]>([]);
  const [subjectErrors, setSubjectErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loaded = storage.getSettingsV2();
    setPeriodDurationStr(loaded.periodDurationMinutes.toString());
    const dayTotals: Record<DayId, string> = {} as Record<DayId, string>;
    DAY_LABELS.forEach(d => {
      dayTotals[d.id] = (loaded.days[d.id]?.totalPeriods ?? 0).toString();
    });
    setDayTotalsStr(dayTotals);
    setSubjects(storage.getSubjectsV2());
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

    setSettingsError('');
    setFieldErrors({});
    storage.setSettingsV2(newSettings);
  };

  const handleAddSubject = () => {
    const newSubject: SubjectV2 = {
      id: `subject-${Date.now()}`,
      name: '',
      type: 'theory',
    };
    setSubjects(prev => [...prev, newSubject]);
    setSubjectErrors(prev => ({
      ...prev,
      [newSubject.id]: 'Subject name is required',
    }));
  };

  const handleSubjectChange = (id: string, patch: Partial<SubjectV2>) => {
    setSubjects(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));

    setSubjectErrors(prev => {
      const next = { ...prev };
      const updated = subjects.find(s => s.id === id);
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
    setSubjects(prev => prev.filter(s => s.id !== id));
    setSubjectErrors(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleSaveSubjects = () => {
    const errors: Record<string, string> = {};
    subjects.forEach(s => {
      if (!s.name.trim()) errors[s.id] = 'Subject name is required';
    });
    setSubjectErrors(errors);
    if (Object.keys(errors).length > 0) return;
    storage.setSubjectsV2(subjects);
  };

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

        {activeTab === 'periods' && (
          <div className="bg-bg-primary p-4 rounded-[10px] border border-border space-y-4">
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
              <h3 className="text-sm font-medium text-text-secondary">
                Total Periods (per day)
              </h3>
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
                      Use 0 for a holiday (no periods). Maximum 14 recommended.
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {settingsError && (
              <p className="text-sm text-danger">{settingsError}</p>
            )}

            <Button variant="primary" fullWidth onClick={handleSaveSettings}>
              Save Period Settings
            </Button>
          </div>
        )}

        {activeTab === 'subjects' && (
          <div className="bg-bg-primary p-4 rounded-[10px] border border-border space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-text-secondary">
                Subjects ({subjects.length})
              </h3>
              <Button
                type="button"
                variant="secondary"
                className="px-3 py-2"
                onClick={handleAddSubject}
              >
                <Plus className="w-4 h-4 inline mr-1" />
                Add Subject
              </Button>
            </div>

            {subjects.length === 0 ? (
              <p className="text-sm text-text-muted">
                Add your subjects here (Theory/Lab). Timetable uses this master list.
              </p>
            ) : (
              <div className="space-y-3">
                {subjects.map((subject) => (
                  <div
                    key={subject.id}
                    className="bg-bg-secondary p-3 rounded-[10px] border border-border"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-1 space-y-2">
                        <Input
                          type="text"
                          placeholder="Subject name"
                          value={subject.name}
                          onChange={(e) => handleSubjectChange(subject.id, { name: e.target.value })}
                          fullWidth
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

                        {subjectErrors[subject.id] && (
                          <p className="text-xs text-danger">{subjectErrors[subject.id]}</p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteSubject(subject.id)}
                        className="p-2 rounded-lg bg-bg-muted hover:bg-border transition-colors"
                        aria-label="Delete subject"
                      >
                        <Trash2 className="w-4 h-4 text-danger" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button type="button" variant="primary" fullWidth onClick={handleSaveSubjects}>
              Save Subjects
            </Button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

