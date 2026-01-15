import React, { useMemo, useState, useEffect } from 'react';
import { AppBar } from '@/app/components/AppBar';
import { BottomNav } from '@/app/components/BottomNav';
import { Input } from '@/app/components/Input';
import { Button } from '@/app/components/Button';
import { EmptyState } from '@/app/components/EmptyState';
import { Calendar, Plus, Trash2 } from 'lucide-react';
import { storage } from '@/utils/storage';
import { Day, DayId, ClassEntry, SubjectV2, AppSettingsV2, TimetableV2 } from '@/types';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { isSetupComplete } from '@/utils/attendance';

const DAYS: Day[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_TO_ID: Record<Day, DayId> = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
  Sunday: 'Sun',
};

const DAY_LABEL: Record<DayId, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
};

export const TimetableScreen: React.FC = () => {
  const navigate = useNavigate();
  const [timetable, setTimetable] = useState<TimetableV2>({});
  const [selectedDay, setSelectedDay] = useState<Day>('Monday');
  const [editingEntries, setEditingEntries] = useState<ClassEntry[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [subjects, setSubjects] = useState<SubjectV2[]>([]);
  const [settings, setSettings] = useState<AppSettingsV2>(() => storage.getSettingsV2());

  const [entryErrors, setEntryErrors] = useState<Record<string, string>>({});
  const [dayError, setDayError] = useState('');

  useEffect(() => {
    const saved = storage.getTimetableV2();
    setTimetable(saved);
    const dayId = DAY_TO_ID[selectedDay];
    setEditingEntries(saved[dayId] || []);
  }, [selectedDay]);

  useEffect(() => {
    const loadedSubjects = storage.getSubjectsV2();
    const loadedSettings = storage.getSettingsV2();
    setSubjects(loadedSubjects);
    setSettings(loadedSettings);
    
    // Revalidate entries against current settings after settings load
    const dayId = DAY_TO_ID[selectedDay];
    const entries = timetable[dayId] || [];
    const currentTotal = loadedSettings.days[dayId]?.totalPeriods ?? 0;
    
    if (currentTotal > 0 && entries.length > 0) {
      const validateEntryLocal = (candidate: ClassEntry, all: ClassEntry[], totalPeriods: number) => {
        if (!candidate.subjectId) return 'Please select a subject.';
        if (candidate.duration <= 0) return 'Duration must be at least 1 period.';
        if (candidate.startPeriod <= 0) return 'Start period is required.';

        const end = candidate.startPeriod + candidate.duration - 1;
        if (end > totalPeriods) {
          return `This class exceeds the day limit (max period ${totalPeriods}).`;
        }

        for (const existing of all) {
          if (existing.id === candidate.id) continue;
          const s1 = existing.startPeriod;
          const e1 = existing.startPeriod + existing.duration - 1;
          const s2 = candidate.startPeriod;
          const e2 = end;
          if (s2 <= e1 && e2 >= s1) {
            return `This class overlaps with another class scheduled for Period ${s1}–${e1}. Change the start period or duration.`;
          }
        }

        return '';
      };
      
      const errors: Record<string, string> = {};
      entries.forEach(e => {
        const msg = validateEntryLocal(e, entries, currentTotal);
        if (msg) errors[e.id] = msg;
      });
      if (Object.keys(errors).length > 0) {
        setEntryErrors(errors);
        setDayError('Day configuration changed. Some classes no longer fit; fix or delete them before saving.');
      }
    }
  }, [selectedDay, timetable]);

  const selectedDayId = DAY_TO_ID[selectedDay];
  const totalPeriodsOfDay = settings.days[selectedDayId]?.totalPeriods ?? 0;

  const subjectMap = useMemo(() => {
    return new Map(subjects.map(s => [s.id, s]));
  }, [subjects]);

  const computeOccupiedSlots = (entries: ClassEntry[]) => {
    const occupied = new Set<number>();
    entries.forEach(e => {
      const start = e.startPeriod;
      const end = e.startPeriod + e.duration - 1;
      for (let p = start; p <= end; p++) occupied.add(p);
    });
    return occupied;
  };

  const validateEntry = (candidate: ClassEntry, all: ClassEntry[]) => {
    if (!candidate.subjectId) return 'Please select a subject.';
    if (candidate.duration <= 0) return 'Duration must be at least 1 period.';
    if (candidate.startPeriod <= 0) return 'Start period is required.';

    const end = candidate.startPeriod + candidate.duration - 1;
    if (end > totalPeriodsOfDay) {
      return `This class exceeds the day limit (max period ${totalPeriodsOfDay}).`;
    }

    for (const existing of all) {
      if (existing.id === candidate.id) continue;
      const s1 = existing.startPeriod;
      const e1 = existing.startPeriod + existing.duration - 1;
      const s2 = candidate.startPeriod;
      const e2 = end;
      if (s2 <= e1 && e2 >= s1) {
        return `This class overlaps with another class scheduled for Period ${s1}–${e1}. Change the start period or duration.`;
      }
    }

    return '';
  };

  const recomputeErrors = (entries: ClassEntry[]) => {
    const next: Record<string, string> = {};
    entries.forEach(e => {
      const msg = validateEntry(e, entries);
      if (msg) next[e.id] = msg;
    });
    setEntryErrors(next);
    return next;
  };

  const occupiedSlots = useMemo(() => computeOccupiedSlots(editingEntries), [editingEntries]);
  const isDayFull = totalPeriodsOfDay > 0 && occupiedSlots.size === totalPeriodsOfDay;

  const handleAddClass = () => {
    if (totalPeriodsOfDay === 0) {
      setDayError('This day has 0 periods (holiday). Update Settings to add periods.');
      return;
    }

    if (isDayFull) {
      setDayError('All periods for this day are filled');
      return;
    }

    const newEntry: ClassEntry = {
      id: `class-${Date.now()}`,
      day: selectedDayId,
      subjectId: '',
      startPeriod: 1,
      duration: 1,
    };
    setEditingEntries(prev => [...prev, newEntry]);
    setIsEditing(true);
    setDayError('');
  };

  const handleRemoveEntry = (id: string) => {
    setEditingEntries(prev => prev.filter(e => e.id !== id));
    setEntryErrors(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setDayError('');
  };

  const updateEntry = (id: string, patch: Partial<ClassEntry>) => {
    setEditingEntries(prev => {
      const updated = prev.map(e => (e.id === id ? { ...e, ...patch } : e));
      // live validate the edited row
      const edited = updated.find(e => e.id === id);
      if (edited) {
        const msg = validateEntry(edited, updated);
        setEntryErrors(prevErrors => {
          const next = { ...prevErrors };
          if (msg) next[id] = msg;
          else delete next[id];
          return next;
        });
      }
      // clear day message if user edits
      setDayError('');
      return updated;
    });
  };

  const handleSave = () => {
    if (totalPeriodsOfDay === 0) {
      setDayError('This day has 0 periods (holiday). Update Settings to add periods.');
      return;
    }

    const errors = recomputeErrors(editingEntries);
    if (Object.keys(errors).length > 0) return;

    const updatedTimetable: TimetableV2 = {
      ...timetable,
      [selectedDayId]: editingEntries,
    };
    setTimetable(updatedTimetable);
    storage.setTimetableV2(updatedTimetable);
    setIsEditing(false);
    toast.success('Timetable saved successfully!');
  };

  const handleCancel = () => {
    setEditingEntries(timetable[selectedDayId] || []);
    setIsEditing(false);
    setEntryErrors({});
    setDayError('');
  };

  const currentEntries = isEditing ? editingEntries : (timetable[selectedDayId] || []);
  const currentOccupiedCount = useMemo(() => computeOccupiedSlots(currentEntries).size, [currentEntries]);
  const setupComplete = isSetupComplete(settings, subjects);

  return (
    <div className="min-h-screen bg-bg-secondary pb-20">
      <AppBar title="Timetable" />
      
      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Day Selector */}
        <div>
          <h3 className="text-sm font-medium text-text-secondary mb-3">
            Select Day
          </h3>
          <div className="flex overflow-x-auto gap-2 pb-2">
            {DAYS.map(day => (
              <button
                key={day}
                onClick={() => {
                  setSelectedDay(day);
                  setIsEditing(false);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedDay === day
                    ? 'bg-text-primary text-bg-primary'
                    : 'bg-bg-muted text-text-primary hover:bg-border'
                }`}
              >
                {day.substring(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {/* Configuration required */}
        {!setupComplete ? (
          <EmptyState
            icon={Calendar}
            title="Setup Required"
            description="Configure periods per day and add at least one subject in Settings before using the timetable."
            actionLabel="Go to Settings"
            onAction={() => navigate('/settings')}
          />
        ) : totalPeriodsOfDay === 0 ? (
          <EmptyState
            icon={Calendar}
            title="Holiday / No Periods"
            description={`No periods configured for ${DAY_LABEL[selectedDayId]}. Update Settings to add periods for this day.`}
            actionLabel="Go to Settings"
            onAction={() => navigate('/settings')}
          />
        ) : currentEntries.length === 0 && !isEditing ? (
          <EmptyState
            icon={Calendar}
            title="No Classes Added"
            description={`Add classes for ${selectedDay} to start tracking attendance`}
            actionLabel="Add Class"
            onAction={handleAddClass}
          />
        ) : (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-text-secondary">
                  Classes ({currentEntries.length}) • Occupied: {currentOccupiedCount}/{totalPeriodsOfDay}
                </h3>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-sm text-text-primary hover:text-text-secondary"
                  >
                    Edit
                  </button>
                )}
              </div>
              
              {isDayFull && (
                <p className="text-sm text-text-muted bg-bg-muted px-3 py-2 rounded-[8px] border border-border">
                  All periods for this day are filled
                </p>
              )}
              
              {dayError && (
                <p className="text-sm text-danger bg-danger/5 px-3 py-2 rounded-[8px] border border-danger">
                  {dayError}
                </p>
              )}

              {currentEntries.map((entry) => {
                const subject = subjectMap.get(entry.subjectId);
                const end = entry.startPeriod + entry.duration - 1;
                const getStartOptions = (duration: number) => {
                  if (duration <= 0) return [];
                  const maxStart = Math.max(1, totalPeriodsOfDay - duration + 1);
                  return Array.from({ length: maxStart }, (_, i) => i + 1);
                };
                const startOptions = getStartOptions(entry.duration);

                return (
                <div
                  key={entry.id}
                  className="bg-bg-primary p-4 rounded-[10px] border border-border"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-text-muted">
                      Periods {entry.startPeriod}–{end} ({entry.duration})
                    </p>
                    {isEditing && (
                      <button
                        onClick={() => handleRemoveEntry(entry.id)}
                        className="p-1 hover:bg-bg-muted rounded"
                      >
                        <Trash2 className="w-4 h-4 text-danger" />
                      </button>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block mb-2 text-sm font-medium text-text-primary">
                          Subject
                        </label>
                        <select
                          value={entry.subjectId}
                          onChange={(e) => updateEntry(entry.id, { subjectId: e.target.value })}
                          className="w-full px-4 py-3 rounded-[10px] border border-border bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-text-primary/20"
                        >
                          <option value="">Select a subject</option>
                          {subjects.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.type})
                            </option>
                          ))}
                        </select>
                      </div>

                      <Input
                        type="text"
                        inputMode="numeric"
                        label="Duration (periods)"
                        value={entry.duration > 0 ? entry.duration.toString() : ''}
                        placeholder="1"
                        onChange={(e) => {
                          const str = e.target.value;
                          if (!str.trim()) {
                            updateEntry(entry.id, { duration: 0 });
                            return;
                          }
                          const num = Number(str);
                          if (!isNaN(num) && Number.isInteger(num) && num > 0) {
                            const nextDuration = Math.min(num, totalPeriodsOfDay);
                            const nextMaxStart = Math.max(1, totalPeriodsOfDay - nextDuration + 1);
                            const nextStart = Math.min(entry.startPeriod, nextMaxStart);
                            updateEntry(entry.id, { duration: nextDuration, startPeriod: nextStart });
                          } else {
                            updateEntry(entry.id, { duration: 0 });
                          }
                        }}
                        fullWidth
                        error={entry.duration <= 0 ? 'Duration must be at least 1 period.' : undefined}
                      />

                      <div>
                        <label className="block mb-2 text-sm font-medium text-text-primary">
                          Start Period
                        </label>
                        {entry.duration <= 0 ? (
                          <div className="w-full px-4 py-3 rounded-[10px] border border-border bg-bg-muted text-text-muted cursor-not-allowed">
                            Set a positive duration first
                          </div>
                        ) : (
                          <select
                            value={entry.startPeriod}
                            onChange={(e) => updateEntry(entry.id, { startPeriod: Number(e.target.value) })}
                            className="w-full px-4 py-3 rounded-[10px] border border-border bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-text-primary/20"
                          >
                            {startOptions.map(p => (
                              <option key={p} value={p}>
                                {p} (occupies {p}–{p + entry.duration - 1})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {entryErrors[entry.id] && (
                        <p className="text-sm text-danger">{entryErrors[entry.id]}</p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="text-base font-medium text-text-primary">
                        {subject?.name ?? 'Unknown Subject'}
                      </p>
                      <p className="text-xs text-text-muted mt-1">
                        {subject?.type ? `${subject.type.toUpperCase()} • ` : ''}Start: {entry.startPeriod} • Duration: {entry.duration}
                      </p>
                    </div>
                  )}
                </div>
              )})}
            </div>

            {isEditing && (
              <>
                <Button
                  onClick={handleAddClass}
                  variant="secondary"
                  fullWidth
                  disabled={isDayFull}
                >
                  <Plus className="w-4 h-4 inline mr-2" />
                  Add Class
                </Button>

                {isDayFull && (
                  <p className="text-sm text-danger">All periods for this day are filled</p>
                )}

                {dayError && (
                  <p className="text-sm text-danger">{dayError}</p>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={handleCancel}
                    variant="secondary"
                    fullWidth
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    variant="primary"
                    fullWidth
                    disabled={Object.keys(entryErrors).length > 0}
                  >
                    Save
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};
