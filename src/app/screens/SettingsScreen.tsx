import React, { useState, useEffect } from 'react';
import { AppBar } from '@/app/components/AppBar';
import { BottomNav } from '@/app/components/BottomNav';
import { Input } from '@/app/components/Input';
import { Button } from '@/app/components/Button';
import { storage } from '@/utils/storage';
import { AppSettingsV2, SubjectV2, DayId, SubjectType, DayConfig } from '@/types';
import { Plus, Trash2, Minus, X, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

type SettingsTab = 'periods' | 'subjects';

const DAY_LABELS: Array<{ id: DayId; label: string; short: string }> = [
  { id: 'Mon', label: 'Monday', short: 'Mon' },
  { id: 'Tue', label: 'Tuesday', short: 'Tue' },
  { id: 'Wed', label: 'Wednesday', short: 'Wed' },
  { id: 'Thu', label: 'Thursday', short: 'Thu' },
  { id: 'Fri', label: 'Friday', short: 'Fri' },
  { id: 'Sat', label: 'Saturday', short: 'Sat' },
  { id: 'Sun', label: 'Sunday', short: 'Sun' },
];

export const SettingsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('periods');

  // Saved data (source of truth)
  const [savedSettings, setSavedSettings] = useState<AppSettingsV2 | null>(null);
  const [savedSubjects, setSavedSubjects] = useState<SubjectV2[]>([]);

  // Period editing
  const [periodDuration, setPeriodDuration] = useState(45);
  const [dayTotals, setDayTotals] = useState<Record<DayId, number>>({} as Record<DayId, number>);
  const [hasUnsavedPeriodChanges, setHasUnsavedPeriodChanges] = useState(false);

  // Subject editing modal
  const [editingSubject, setEditingSubject] = useState<SubjectV2 | null>(null);
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [subjectName, setSubjectName] = useState('');
  const [subjectType, setSubjectType] = useState<SubjectType>('theory');

  // Load initial data
  useEffect(() => {
    const loaded = storage.getSettingsV2();
    setSavedSettings(loaded);
    setPeriodDuration(loaded.periodDurationMinutes);
    
    const totals: Record<DayId, number> = {} as Record<DayId, number>;
    DAY_LABELS.forEach(d => {
      totals[d.id] = loaded.days[d.id]?.totalPeriods ?? 0;
    });
    setDayTotals(totals);

    const loadedSubjects = storage.getSubjectsV2();
    setSavedSubjects(loadedSubjects);
  }, []);

  // Track unsaved period changes
  useEffect(() => {
    if (!savedSettings) return;
    
    const durationChanged = periodDuration !== savedSettings.periodDurationMinutes;
    const totalsChanged = DAY_LABELS.some(d => 
      (dayTotals[d.id] ?? 0) !== (savedSettings.days[d.id]?.totalPeriods ?? 0)
    );
    
    setHasUnsavedPeriodChanges(durationChanged || totalsChanged);
  }, [periodDuration, dayTotals, savedSettings]);

  const handleDayPeriodChange = (dayId: DayId, delta: number) => {
    setDayTotals(prev => ({
      ...prev,
      [dayId]: Math.max(0, Math.min(14, (prev[dayId] ?? 0) + delta)),
    }));
  };

  const handleSavePeriods = () => {
    const days: Record<DayId, DayConfig> = {} as Record<DayId, DayConfig>;
    DAY_LABELS.forEach(d => {
      days[d.id] = { day: d.id, totalPeriods: dayTotals[d.id] ?? 0 };
    });

    const newSettings: AppSettingsV2 = {
      periodDurationMinutes: periodDuration,
      days,
    };

    storage.setSettingsV2(newSettings);
    setSavedSettings(newSettings);
    setHasUnsavedPeriodChanges(false);
    toast.success('Period settings saved!');
  };

  const handleOpenEditSubject = (subject: SubjectV2) => {
    setEditingSubject(subject);
    setSubjectName(subject.name);
    setSubjectType(subject.type);
    setIsAddingSubject(false);
  };

  const handleOpenAddSubject = () => {
    setEditingSubject(null);
    setSubjectName('');
    setSubjectType('theory');
    setIsAddingSubject(true);
  };

  const handleCloseSubjectModal = () => {
    setEditingSubject(null);
    setIsAddingSubject(false);
    setSubjectName('');
    setSubjectType('theory');
  };

  const handleSaveSubject = () => {
    if (!subjectName.trim()) {
      toast.error('Subject name is required');
      return;
    }

    if (isAddingSubject) {
      const newSubject: SubjectV2 = {
        id: `subject-${Date.now()}`,
        name: subjectName.trim(),
        type: subjectType,
      };
      const updated = [...savedSubjects, newSubject];
      storage.setSubjectsV2(updated);
      setSavedSubjects(updated);
      toast.success('Subject added!');
    } else if (editingSubject) {
      const updated = savedSubjects.map(s =>
        s.id === editingSubject.id
          ? { ...s, name: subjectName.trim(), type: subjectType }
          : s
      );
      storage.setSubjectsV2(updated);
      setSavedSubjects(updated);
      toast.success('Subject updated!');
    }

    handleCloseSubjectModal();
  };

  const handleDeleteSubject = () => {
    if (!editingSubject) return;
    
    const updated = savedSubjects.filter(s => s.id !== editingSubject.id);
    storage.setSubjectsV2(updated);
    setSavedSubjects(updated);
    toast.success('Subject deleted!');
    handleCloseSubjectModal();
  };

  return (
    <div className="min-h-screen bg-bg-secondary pb-20">
      <AppBar title="Settings" showProfile={false} />

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-bg-muted rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('periods')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'periods'
                ? 'bg-bg-primary text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Periods
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('subjects')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'subjects'
                ? 'bg-bg-primary text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Subjects
          </button>
        </div>

        {/* PERIODS TAB */}
        {activeTab === 'periods' && (
          <div className="space-y-4">
            {/* Period Duration */}
            <div className="bg-bg-primary rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-xs font-medium text-text-muted uppercase tracking-wide">
                  Period Duration
                </p>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-text-primary">Duration</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setPeriodDuration(prev => Math.max(15, prev - 5))}
                    className="w-8 h-8 rounded-full bg-bg-muted flex items-center justify-center hover:bg-border transition-colors"
                  >
                    <Minus className="w-4 h-4 text-text-primary" />
                  </button>
                  <span className="text-sm font-medium text-text-primary w-16 text-center">
                    {periodDuration} min
                  </span>
                  <button
                    onClick={() => setPeriodDuration(prev => Math.min(120, prev + 5))}
                    className="w-8 h-8 rounded-full bg-bg-muted flex items-center justify-center hover:bg-border transition-colors"
                  >
                    <Plus className="w-4 h-4 text-text-primary" />
                  </button>
                </div>
              </div>
            </div>

            {/* Day-wise Periods */}
            <div className="bg-bg-primary rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-xs font-medium text-text-muted uppercase tracking-wide">
                  Periods per Day
                </p>
              </div>
              
              {DAY_LABELS.map((d, index) => {
                const periods = dayTotals[d.id] ?? 0;
                const isHoliday = periods === 0;
                
                return (
                  <div
                    key={d.id}
                    className={`flex items-center justify-between px-4 py-3 ${
                      index < DAY_LABELS.length - 1 ? 'border-b border-border' : ''
                    }`}
                  >
                    <span className={`text-sm ${isHoliday ? 'text-text-muted' : 'text-text-primary'}`}>
                      {d.label}
                    </span>
                    
                    {isHoliday ? (
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-text-muted italic mr-2">Holiday</span>
                        <button
                          onClick={() => handleDayPeriodChange(d.id, 1)}
                          className="w-8 h-8 rounded-full bg-bg-muted flex items-center justify-center hover:bg-border transition-colors"
                        >
                          <Plus className="w-4 h-4 text-text-primary" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleDayPeriodChange(d.id, -1)}
                          className="w-8 h-8 rounded-full bg-bg-muted flex items-center justify-center hover:bg-border transition-colors"
                        >
                          <Minus className="w-4 h-4 text-text-primary" />
                        </button>
                        <span className="text-sm font-medium text-text-primary w-8 text-center">
                          {periods}
                        </span>
                        <button
                          onClick={() => handleDayPeriodChange(d.id, 1)}
                          className="w-8 h-8 rounded-full bg-bg-muted flex items-center justify-center hover:bg-border transition-colors"
                        >
                          <Plus className="w-4 h-4 text-text-primary" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Save Button */}
            {hasUnsavedPeriodChanges && (
              <Button variant="primary" fullWidth onClick={handleSavePeriods}>
                Save Changes
              </Button>
            )}
          </div>
        )}

        {/* SUBJECTS TAB */}
        {activeTab === 'subjects' && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between px-1">
              <p className="text-sm text-text-muted">
                Subjects • {savedSubjects.length}
              </p>
            </div>

            {/* Subject List */}
            {savedSubjects.length === 0 ? (
              <div className="bg-bg-primary rounded-lg p-8 text-center">
                <p className="text-sm text-text-muted mb-4">
                  No subjects added yet
                </p>
                <Button variant="primary" onClick={handleOpenAddSubject}>
                  <Plus className="w-4 h-4 inline mr-2" />
                  Add Subject
                </Button>
              </div>
            ) : (
              <div className="bg-bg-primary rounded-lg overflow-hidden">
                {savedSubjects.map((subject, index) => (
                  <button
                    key={subject.id}
                    onClick={() => handleOpenEditSubject(subject)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 hover:bg-bg-muted transition-colors ${
                      index < savedSubjects.length - 1 ? 'border-b border-border' : ''
                    }`}
                  >
                    <span className="text-sm font-medium text-text-primary">
                      {subject.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        subject.type === 'lab'
                          ? 'bg-accent/10 text-accent'
                          : 'bg-text-muted/10 text-text-muted'
                      }`}>
                        {subject.type === 'lab' ? 'Lab' : 'Theory'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-text-muted" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* FAB for adding subjects */}
      {activeTab === 'subjects' && savedSubjects.length > 0 && (
        <button
          onClick={handleOpenAddSubject}
          className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-text-primary text-bg-primary shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity z-40"
          aria-label="Add subject"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Subject Edit/Add Bottom Sheet */}
      {(editingSubject || isAddingSubject) && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="w-full max-w-md bg-bg-primary rounded-t-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-text-primary">
                {isAddingSubject ? 'Add Subject' : 'Edit Subject'}
              </h3>
              <button
                onClick={handleCloseSubjectModal}
                className="p-2 rounded-full hover:bg-bg-muted transition-colors"
              >
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>

            <div className="space-y-4">
              <Input
                type="text"
                label="Subject Name"
                value={subjectName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubjectName(e.target.value)}
                placeholder="e.g., Mathematics"
                fullWidth
              />

              <div>
                <label className="block mb-2 text-sm font-medium text-text-primary">
                  Type
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSubjectType('theory')}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      subjectType === 'theory'
                        ? 'bg-text-primary text-bg-primary'
                        : 'bg-bg-muted text-text-primary hover:bg-border'
                    }`}
                  >
                    Theory
                  </button>
                  <button
                    onClick={() => setSubjectType('lab')}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      subjectType === 'lab'
                        ? 'bg-accent text-white'
                        : 'bg-bg-muted text-text-primary hover:bg-border'
                    }`}
                  >
                    Lab
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              {editingSubject && (
                <Button variant="danger" onClick={handleDeleteSubject}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <Button variant="secondary" fullWidth onClick={handleCloseSubjectModal}>
                Cancel
              </Button>
              <Button variant="primary" fullWidth onClick={handleSaveSubject}>
                {isAddingSubject ? 'Add' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

