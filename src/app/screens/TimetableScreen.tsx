import React, { useState, useEffect } from 'react';
import { AppBar } from '@/app/components/AppBar';
import { BottomNav } from '@/app/components/BottomNav';
import { Input } from '@/app/components/Input';
import { Button } from '@/app/components/Button';
import { EmptyState } from '@/app/components/EmptyState';
import { Calendar, Plus, Trash2 } from 'lucide-react';
import { storage } from '@/utils/storage';
import { Timetable, Period, Day, Subject, AppSettings } from '@/types';
import { toast } from 'sonner';

const DAYS: Day[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const TimetableScreen: React.FC = () => {
  const [timetable, setTimetable] = useState<Timetable>({});
  const [selectedDay, setSelectedDay] = useState<Day>('Monday');
  const [editingPeriods, setEditingPeriods] = useState<Period[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    periodDurationMinutes: 45,
    maxPeriodsPerDay: 8,
  });
  const [periodErrors, setPeriodErrors] = useState<Record<string, string>>({});
  const [limitError, setLimitError] = useState('');

  useEffect(() => {
    const savedTimetable = storage.getTimetable();
    setTimetable(savedTimetable);
    setEditingPeriods(savedTimetable[selectedDay] || []);
  }, [selectedDay]);

  useEffect(() => {
    setSubjects(storage.getSubjects());
    setSettings(storage.getSettings());
  }, [selectedDay]);

  const handleAddPeriod = () => {
    const totalExisting = editingPeriods.reduce((sum, period) => {
      const count = period.numberOfPeriods && period.numberOfPeriods > 0 ? period.numberOfPeriods : 1;
      return sum + count;
    }, 0);

    if (totalExisting >= settings.maxPeriodsPerDay) {
      setLimitError('You have reached the maximum periods allowed for this day.');
      return;
    }

    const newPeriod: Period = {
      id: `period-${Date.now()}`,
      periodNumber: editingPeriods.length + 1,
      subject: '',
      numberOfPeriods: 1,
      periodDurationMinutes: settings.periodDurationMinutes,
    };
    setEditingPeriods([...editingPeriods, newPeriod]);
    setIsEditing(true);
    setLimitError('');
  };

  const handleRemovePeriod = (id: string) => {
    setEditingPeriods(editingPeriods.filter(p => p.id !== id));
    setPeriodErrors(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setLimitError('');
  };

  const handleSubjectChange = (id: string, subject: string) => {
    setEditingPeriods(editingPeriods.map(p => 
      p.id === id ? { ...p, subject } : p
    ));
  };

  const handleNumberOfPeriodsChange = (id: string, value: number) => {
    setEditingPeriods(prev => {
      const updated = prev.map(p =>
        p.id === id ? { ...p, numberOfPeriods: value } : p
      );

      const total = updated.reduce((sum, period) => {
        const count =
          period.numberOfPeriods && period.numberOfPeriods > 0
            ? period.numberOfPeriods
            : 0;
        return sum + count;
      }, 0);

      if (total > settings.maxPeriodsPerDay) {
        setLimitError(
          `Total periods (${total}) exceed Max Periods Per Day (${settings.maxPeriodsPerDay}).`
        );
      } else {
        setLimitError('');
      }

      return updated;
    });

    setPeriodErrors(prev => {
      const next = { ...prev };
      if (value <= 0) {
        next[id] = 'Number of periods must be at least 1.';
      } else {
        delete next[id];
      }
      return next;
    });
  };

  const handleSave = () => {
    const errors: Record<string, string> = {};
    let total = 0;

    editingPeriods.forEach(period => {
      const count =
        period.numberOfPeriods && period.numberOfPeriods > 0
          ? period.numberOfPeriods
          : 0;

      if (count <= 0) {
        errors[period.id] = 'Number of periods must be at least 1.';
      }
      total += count;
    });

    if (total > settings.maxPeriodsPerDay) {
      setLimitError(
        `Total periods (${total}) exceed Max Periods Per Day (${settings.maxPeriodsPerDay}).`
      );
    } else {
      setLimitError('');
    }

    setPeriodErrors(errors);

    if (Object.keys(errors).length > 0 || total > settings.maxPeriodsPerDay) {
      return;
    }

    let currentStartMinutes = 0;
    const periodsWithTiming = editingPeriods.map(period => {
      const count =
        period.numberOfPeriods && period.numberOfPeriods > 0
          ? period.numberOfPeriods
          : 1;
      const duration =
        period.periodDurationMinutes && period.periodDurationMinutes > 0
          ? period.periodDurationMinutes
          : settings.periodDurationMinutes;

      const updated: Period = {
        ...period,
        numberOfPeriods: count,
        periodDurationMinutes: duration,
        startTimeMinutes:
          typeof period.startTimeMinutes === 'number'
            ? period.startTimeMinutes
            : currentStartMinutes,
      };

      currentStartMinutes =
        (updated.startTimeMinutes ?? 0) + count * duration;

      return updated;
    });

    const updatedTimetable = {
      ...timetable,
      [selectedDay]: periodsWithTiming,
    };
    setTimetable(updatedTimetable);
    storage.setTimetable(updatedTimetable);
    setIsEditing(false);
    toast.success('Timetable saved successfully!');
  };

  const handleCancel = () => {
    setEditingPeriods(timetable[selectedDay] || []);
    setIsEditing(false);
    setPeriodErrors({});
    setLimitError('');
  };

  const currentPeriods = isEditing ? editingPeriods : (timetable[selectedDay] || []);

  const totalPeriodsForDay = currentPeriods.reduce((sum, period) => {
    const count =
      period.numberOfPeriods && period.numberOfPeriods > 0
        ? period.numberOfPeriods
        : 1;
    return sum + count;
  }, 0);

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
              <but