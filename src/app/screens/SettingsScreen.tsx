import React, { useState, useEffect } from 'react';
import { AppBar } from '@/app/components/AppBar';
import { BottomNav } from '@/app/components/BottomNav';
import { Input } from '@/app/components/Input';
import { Button } from '@/app/components/Button';
import { storage } from '@/utils/storage';
import { AppSettingsV2, SubjectV2, DayId, SubjectType, DayConfig, AttendanceBaseline } from '@/types';
import { Plus, Trash2, Minus, X, ChevronRight, AlertTriangle, Edit3, Check } from 'lucide-react';
import { toast } from 'sonner';

type SettingsTab = 'periods' | 'subjects' | 'attendance';

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

  // Attendance baseline editing
  const [baselineTotalClasses, setBaselineTotalClasses] = useState('');
  const [baselineAttendedClasses, setBaselineAttendedClasses] = useState('');
  const [baselineUpToDate, setBaselineUpToDate] = useState('');
  const [isEditingBaseline, setIsEditingBaseline] = useState(false);

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

    // Load baseline if exists
    if (loaded.attendanceBaseline) {
      setBaselineTotalClasses(loaded.attendanceBaseline.totalClasses.toString());
      setBaselineAttendedClasses(loaded.attendanceBaseline.attendedClasses.toString());
      setBaselineUpToDate(loaded.attendanceBaseline.upToDate);
    }

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

  // Baseline handlers
  const handleSaveBaseline = () => {
    const total = parseInt(baselineTotalClasses, 10);
    const attended = parseInt(baselineAttendedClasses, 10);

    if (isNaN(total) || total < 0) {
      toast.error('Please enter a valid total classes number');
      return;
    }
    if (isNaN(attended) || attended < 0) {
      toast.error('Please enter a valid attended classes number');
      return;
    }
    if (attended > total) {
      toast.error('Attended classes cannot be more than total classes');
      return;
    }
    if (!baselineUpToDate) {
      toast.error('Please select an "up to" date');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(baselineUpToDate);
    if (selectedDate > today) {
      toast.error('Date cannot be in the future');
      return;
    }

    const baseline: AttendanceBaseline = {
      totalClasses: total,
      attendedClasses: attended,
      upToDate: baselineUpToDate,
    };

    const newSettings: AppSettingsV2 = {
      ...savedSettings!,
      attendanceBaseline: baseline,
    };

    storage.setSettingsV2(newSettings);
    setSavedSettings(newSettings);
    setIsEditingBaseline(false);
    toast.success('Attendance baseline saved!');
  };

  const handleClearBaseline = () => {
    if (!savedSettings?.attendanceBaseline) return;

    const newSettings: AppSettingsV2 = {
      periodDurationMinutes: savedSettings.periodDurationMinutes,
      days: savedSettings.days,
      // Remove attendanceBaseline
    };

    storage.setSettingsV2(newSettings);
    setSavedSettings(newSettings);
    setBaselineTotalClasses('');
    setBaselineAttendedClasses('');
    setBaselineUpToDate('');
    setIsEditingBaseline(false);
    toast.success('Baseline cleared. Using period-wise attendance now.');
  };

  const handleStartEditBaseline = () => {
    if (savedSettings?.attendanceBaseline) {
      setBaselineTotalClasses(savedSettings.attendanceBaseline.totalClasses.toString());
      setBaselineAttendedClasses(savedSettings.attendanceBaseline.attendedClasses.toString());
      setBaselineUpToDate(savedSettings.attendanceBaseline.upToDate);
    }
    setIsEditingBaseline(true);
  };

  const handleCancelEditBaseline = () => {
    if (savedSettings?.attendanceBaseline) {
      setBaselineTotalClasses(savedSettings.attendanceBaseline.totalClasses.toString());
      setBaselineAttendedClasses(savedSettings.attendanceBaseline.attendedClasses.toString());
      setBaselineUpToDate(savedSettings.attendanceBaseline.upToDate);
    } else {
      setBaselineTotalClasses('');
      setBaselineAttendedClasses('');
      setBaselineUpToDate('');
    }
    setIsEditingBaseline(false);
  };

  const getTodayDateString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
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
          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'attendance'
                ? 'bg-bg-primary text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Edit
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

        {/* ATTENDANCE EDIT TAB */}
        {activeTab === 'attendance' && (
          <div className="space-y-4">
            {/* Warning Banner */}
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-warning mb-1">
                    Important Notice
                  </p>
                  <p className="text-xs text-text-secondary">
                    Using this feature will make subject-wise attendance inaccurate. 
                    Only the overall attendance percentage will be correct.
                  </p>
                </div>
              </div>
            </div>

            {/* Current Baseline Status or Edit Form */}
            {savedSettings?.attendanceBaseline && !isEditingBaseline ? (
              // Display current baseline
              <div className="bg-bg-primary rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-success" />
                    <p className="text-xs font-medium text-success uppercase tracking-wide">
                      Baseline Active
                    </p>
                  </div>
                  <button
                    onClick={handleStartEditBaseline}
                    className="p-1.5 rounded-md hover:bg-bg-muted transition-colors"
                  >
                    <Edit3 className="w-4 h-4 text-text-muted" />
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-secondary">Total Classes</span>
                    <span className="text-sm font-medium text-text-primary">
                      {savedSettings.attendanceBaseline.totalClasses}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-secondary">Attended Classes</span>
                    <span className="text-sm font-medium text-text-primary">
                      {savedSettings.attendanceBaseline.attendedClasses}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-secondary">Up to Date</span>
                    <span className="text-sm font-medium text-text-primary">
                      {formatDisplayDate(savedSettings.attendanceBaseline.upToDate)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-border">
                    <span className="text-sm text-text-secondary">Base Percentage</span>
                    <span className="text-sm font-bold text-accent">
                      {Math.round((savedSettings.attendanceBaseline.attendedClasses / savedSettings.attendanceBaseline.totalClasses) * 100)}%
                    </span>
                  </div>
                </div>
                <div className="px-4 pb-4">
                  <Button variant="danger" fullWidth onClick={handleClearBaseline}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear Baseline
                  </Button>
                </div>
              </div>
            ) : (
              // Edit/Add form
              <div className="bg-bg-primary rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wide">
                    {savedSettings?.attendanceBaseline ? 'Edit Baseline' : 'Set Manual Baseline'}
                  </p>
                </div>
                <div className="p-4 space-y-4">
                  <p className="text-xs text-text-secondary">
                    Enter your attendance data up to a specific date. New attendance will be added on top of this baseline.
                  </p>
                  
                  <Input
                    type="number"
                    label="Total Classes"
                    value={baselineTotalClasses}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBaselineTotalClasses(e.target.value)}
                    placeholder="e.g., 120"
                    fullWidth
                    min="0"
                  />
                  
                  <Input
                    type="number"
                    label="Attended Classes"
                    value={baselineAttendedClasses}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBaselineAttendedClasses(e.target.value)}
                    placeholder="e.g., 95"
                    fullWidth
                    min="0"
                  />
                  
                  <div>
                    <label className="block mb-2 text-sm font-medium text-text-primary">
                      Up to Date
                    </label>
                    <input
                      type="date"
                      value={baselineUpToDate}
                      onChange={(e) => setBaselineUpToDate(e.target.value)}
                      max={getTodayDateString()}
                      className="w-full px-3 py-2.5 bg-bg-muted border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
                    />
                    <p className="mt-1 text-xs text-text-muted">
                      Attendance records on or before this date will be ignored
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    {isEditingBaseline && savedSettings?.attendanceBaseline && (
                      <Button variant="secondary" fullWidth onClick={handleCancelEditBaseline}>
                        Cancel
                      </Button>
                    )}
                    <Button variant="primary" fullWidth onClick={handleSaveBaseline}>
                      {savedSettings?.attendanceBaseline ? 'Update Baseline' : 'Save Baseline'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Info section */}
            <div className="bg-bg-primary rounded-lg p-4">
              <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">
                How it works
              </p>
              <ul className="text-xs text-text-secondary space-y-2">
                <li className="flex gap-2">
                  <span className="text-accent">•</span>
                  <span>Your total attendance = Baseline + New records after the date</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-accent">•</span>
                  <span>Subject-wise breakdown will not be available</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-accent">•</span>
                  <span>Clear the baseline to return to normal period-wise tracking</span>
                </li>
              </ul>
            </div>
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
                        ? 'bg-text-primary text-bg-primary'
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

