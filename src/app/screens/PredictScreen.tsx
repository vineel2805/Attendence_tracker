import React, { useState, useEffect, useMemo } from 'react';
import { AppBar } from '@/app/components/AppBar';
import { BottomNav } from '@/app/components/BottomNav';
import { Button } from '@/app/components/Button';
import { PeriodCard } from '@/app/components/PeriodCard';
import { EmptyState } from '@/app/components/EmptyState';
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, RotateCcw } from 'lucide-react';
import { storage } from '@/utils/storage';
import {
  calculateAttendanceStats,
  formatDate,
  getDayIdFromDate,
  buildOccupiedSlotsForDay,
  isSetupComplete,
} from '@/utils/attendance';
import { AttendanceStats, Period } from '@/types';

// Store planned future attendance
interface FuturePlan {
  [date: string]: {
    [periodId: string]: 'present' | 'absent';
  };
}

export const PredictScreen: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentStats, setCurrentStats] = useState<AttendanceStats>({
    totalPeriods: 0,
    presentPeriods: 0,
    absentPeriods: 0,
    attendancePercentage: 0,
  });
  const [futurePlan, setFuturePlan] = useState<FuturePlan>({});
  const [periods, setPeriods] = useState<Period[]>([]);
  const [needsSetup, setNeedsSetup] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Load current stats
  useEffect(() => {
    const attendanceRecords = storage.getAttendance();
    const stats = calculateAttendanceStats(attendanceRecords);
    setCurrentStats(stats);
  }, []);

  // Generate calendar days for current month
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];

    // Add days from previous month
    const firstDayOfWeek = firstDay.getDay();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false });
    }

    // Add days of current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push({ date: new Date(year, month, day), isCurrentMonth: true });
    }

    // Add days from next month
    const remainingDays = 7 - (days.length % 7);
    if (remainingDays < 7) {
      for (let i = 1; i <= remainingDays; i++) {
        days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
      }
    }

    return days;
  }, [currentMonth]);

  // Load periods for selected future date
  useEffect(() => {
    if (!selectedDate) {
      setPeriods([]);
      return;
    }

    const settings = storage.getSettingsV2();
    const subjects = storage.getSubjectsV2();
    const timetableV2 = storage.getTimetableV2();

    if (!isSetupComplete(settings, subjects)) {
      setNeedsSetup(true);
      setPeriods([]);
      return;
    }

    setNeedsSetup(false);
    const dayId = getDayIdFromDate(selectedDate);
    const totalPeriodsOfDay = settings.days[dayId]?.totalPeriods ?? 0;

    if (totalPeriodsOfDay === 0) {
      setPeriods([]);
      return;
    }

    const slots = buildOccupiedSlotsForDay({
      dayId,
      timetable: timetableV2,
      subjects,
      totalPeriods: totalPeriodsOfDay,
    });

    const dateStr = formatDate(selectedDate);
    const dayPeriods: Period[] = slots.map((slot: { periodIndex: number; subjectId: string; subjectName: string; entryId: string }) => ({
      id: `${dateStr}-${dayId}-P${slot.periodIndex}`,
      periodNumber: slot.periodIndex,
      subject: slot.subjectName,
    }));

    setPeriods(dayPeriods);
  }, [selectedDate]);

  // Calculate predicted stats
  const predictedStats = useMemo(() => {
    let futurePresentCount = 0;
    let futureAbsentCount = 0;

    Object.values(futurePlan).forEach(dayPlan => {
      Object.values(dayPlan).forEach(status => {
        if (status === 'present') futurePresentCount++;
        else if (status === 'absent') futureAbsentCount++;
      });
    });

    const totalFuture = futurePresentCount + futureAbsentCount;
    const newTotal = currentStats.totalPeriods + totalFuture;
    const newPresent = currentStats.presentPeriods + futurePresentCount;

    const percentage = newTotal > 0 ? Math.round((newPresent / newTotal) * 100) : 0;

    let status: 'safe' | 'warning' | 'risk';
    if (percentage >= 75) status = 'safe';
    else if (percentage >= 65) status = 'warning';
    else status = 'risk';

    return {
      totalPeriods: newTotal,
      presentPeriods: newPresent,
      absentPeriods: currentStats.absentPeriods + futureAbsentCount,
      attendancePercentage: percentage,
      status,
      futurePresentCount,
      futureAbsentCount,
      totalFuturePlanned: totalFuture,
    };
  }, [currentStats, futurePlan]);

  // Get plan status for a date
  const getDatePlanStatus = (date: Date): 'planned-present' | 'planned-absent' | 'planned-partial' | 'none' => {
    const dateStr = formatDate(date);
    const plan = futurePlan[dateStr];

    if (!plan || Object.keys(plan).length === 0) return 'none';

    const statuses = Object.values(plan);
    const allPresent = statuses.every(s => s === 'present');
    const allAbsent = statuses.every(s => s === 'absent');

    if (allPresent) return 'planned-present';
    if (allAbsent) return 'planned-absent';
    return 'planned-partial';
  };

  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedDate(null);
  };

  const handleDateClick = (date: Date) => {
    // Only allow future dates
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    if (dateOnly <= today) return;

    setSelectedDate(date);
  };

  const handleStatusChange = (periodId: string, status: 'present' | 'absent') => {
    if (!selectedDate) return;

    const dateStr = formatDate(selectedDate);
    setFuturePlan(prev => ({
      ...prev,
      [dateStr]: {
        ...(prev[dateStr] || {}),
        [periodId]: status,
      },
    }));
  };

  const handleMarkAllPresent = () => {
    if (!selectedDate || periods.length === 0) return;

    const dateStr = formatDate(selectedDate);
    const allPresent: { [key: string]: 'present' | 'absent' } = {};
    periods.forEach(p => {
      allPresent[p.id] = 'present';
    });

    setFuturePlan(prev => ({
      ...prev,
      [dateStr]: allPresent,
    }));
  };

  const handleMarkAllAbsent = () => {
    if (!selectedDate || periods.length === 0) return;

    const dateStr = formatDate(selectedDate);
    const allAbsent: { [key: string]: 'present' | 'absent' } = {};
    periods.forEach(p => {
      allAbsent[p.id] = 'absent';
    });

    setFuturePlan(prev => ({
      ...prev,
      [dateStr]: allAbsent,
    }));
  };

  const handleClearDay = () => {
    if (!selectedDate) return;

    const dateStr = formatDate(selectedDate);
    setFuturePlan(prev => {
      const next = { ...prev };
      delete next[dateStr];
      return next;
    });
  };

  const handleResetAll = () => {
    setFuturePlan({});
    setSelectedDate(null);
  };

  const selectedDateStr = selectedDate ? formatDate(selectedDate) : '';
  const selectedDayPlan = futurePlan[selectedDateStr] || {};
  const isFutureDate = selectedDate && new Date(selectedDate).setHours(0, 0, 0, 0) > today.getTime();

  // Count planned days
  const plannedDaysCount = Object.keys(futurePlan).length;

  return (
    <div className="min-h-screen bg-bg-secondary pb-20">
      <AppBar title="Predict Attendance" />

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Stats Comparison */}
        <div className="bg-bg-primary p-4 rounded-[10px] border border-border">
          <div className="grid grid-cols-2 gap-4">
            {/* Current Stats */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-text-muted text-center">Current</p>
              <div className={`p-3 rounded-lg text-center ${
                currentStats.attendancePercentage >= 75
                  ? 'bg-success/10'
                  : currentStats.attendancePercentage >= 65
                  ? 'bg-warning/10'
                  : 'bg-danger/10'
              }`}>
                <p className={`text-2xl font-bold ${
                  currentStats.attendancePercentage >= 75
                    ? 'text-success'
                    : currentStats.attendancePercentage >= 65
                    ? 'text-warning'
                    : 'text-danger'
                }`}>
                  {currentStats.attendancePercentage}%
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {currentStats.presentPeriods}/{currentStats.totalPeriods} periods
                </p>
              </div>
            </div>

            {/* Predicted Stats */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-text-muted text-center">Predicted</p>
              <div className={`p-3 rounded-lg text-center ${
                predictedStats.attendancePercentage >= 75
                  ? 'bg-success/10'
                  : predictedStats.attendancePercentage >= 65
                  ? 'bg-warning/10'
                  : 'bg-danger/10'
              }`}>
                <p className={`text-2xl font-bold ${
                  predictedStats.attendancePercentage >= 75
                    ? 'text-success'
                    : predictedStats.attendancePercentage >= 65
                    ? 'text-warning'
                    : 'text-danger'
                }`}>
                  {predictedStats.attendancePercentage}%
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {predictedStats.presentPeriods}/{predictedStats.totalPeriods} periods
                </p>
              </div>
            </div>
          </div>

          {/* Prediction Summary */}
          {predictedStats.totalFuturePlanned > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-muted">Future planned:</span>
                <span className="font-medium text-text-primary">
                  {predictedStats.totalFuturePlanned} periods ({plannedDaysCount} days)
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-text-muted">Will attend:</span>
                <span className="font-medium text-success">+{predictedStats.futurePresentCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-text-muted">Will miss:</span>
                <span className="font-medium text-danger">+{predictedStats.futureAbsentCount}</span>
              </div>
              
              {/* Status Message */}
              <div className={`mt-3 p-2 rounded-lg text-center text-sm font-medium ${
                predictedStats.status === 'safe'
                  ? 'bg-success/10 text-success'
                  : predictedStats.status === 'warning'
                  ? 'bg-warning/10 text-warning'
                  : 'bg-danger/10 text-danger'
              }`}>
                {predictedStats.status === 'safe' && '✓ You will be safe!'}
                {predictedStats.status === 'warning' && '⚠ Attendance will be borderline'}
                {predictedStats.status === 'risk' && '⚠ Attendance will be below 65%!'}
              </div>

              <Button
                variant="secondary"
                fullWidth
                className="mt-3"
                onClick={handleResetAll}
              >
                <RotateCcw className="w-4 h-4 inline mr-2" />
                Reset All Plans
              </Button>
            </div>
          )}
        </div>

        {/* Calendar */}
        <div className="bg-bg-primary p-4 rounded-[10px] border border-border">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-lg hover:bg-bg-muted transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-text-primary" />
            </button>
            <h2 className="text-base font-semibold text-text-primary">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-lg hover:bg-bg-muted transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-text-primary" />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-text-muted py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map(({ date, isCurrentMonth }, index) => {
              const dateStr = formatDate(date);
              const dateOnly = new Date(date);
              dateOnly.setHours(0, 0, 0, 0);
              const isPast = dateOnly <= today;
              const isSelected = selectedDate && formatDate(selectedDate) === dateStr;
              const isTodayDate = formatDate(today) === dateStr;
              const planStatus = getDatePlanStatus(date);

              let bgColor = 'bg-transparent';
              let textColor = isCurrentMonth ? 'text-text-primary' : 'text-text-muted/50';
              let dotColor = '';

              // Show plan status for future dates
              if (!isPast && isCurrentMonth) {
                if (planStatus === 'planned-present') dotColor = 'bg-success';
                else if (planStatus === 'planned-absent') dotColor = 'bg-danger';
                else if (planStatus === 'planned-partial') dotColor = 'bg-warning';
              }

              // Past dates are dimmed
              if (isPast) {
                textColor = 'text-text-muted/40';
              }

              if (isSelected) {
                bgColor = 'bg-text-primary';
                textColor = 'text-bg-primary';
              } else if (isTodayDate) {
                bgColor = 'bg-bg-muted';
              }

              return (
                <button
                  key={index}
                  onClick={() => handleDateClick(date)}
                  disabled={!isCurrentMonth || isPast}
                  className={`relative aspect-square flex flex-col items-center justify-center rounded-lg transition-colors ${bgColor} ${
                    isCurrentMonth && !isPast ? 'hover:bg-bg-muted cursor-pointer' : 'cursor-default'
                  } ${isSelected ? 'hover:bg-text-primary' : ''}`}
                >
                  <span className={`text-sm font-medium ${textColor}`}>
                    {date.getDate()}
                  </span>
                  {dotColor && (
                    <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${dotColor}`} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-success" />
              <span className="text-xs text-text-muted">Will Attend</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-danger" />
              <span className="text-xs text-text-muted">Will Miss</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-warning" />
              <span className="text-xs text-text-muted">Partial</span>
            </div>
          </div>

          <p className="text-xs text-text-muted text-center mt-3">
            Select a future date to plan your attendance
          </p>
        </div>

        {/* Selected Date Details */}
        {selectedDate && isFutureDate && (
          <div className="bg-bg-primary p-4 rounded-[10px] border border-border space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-muted">Planning for</p>
                <p className="text-base font-semibold text-text-primary">
                  {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {needsSetup ? (
              <EmptyState
                icon={Calendar}
                title="Setup Required"
                description="Configure your timetable first to plan future attendance."
              />
            ) : periods.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No Classes"
                description="No classes scheduled for this day based on your timetable."
              />
            ) : (
              <div className="space-y-3">
                {/* Quick Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={handleMarkAllPresent}
                    className="text-xs py-2"
                  >
                    All Present
                  </Button>
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={handleMarkAllAbsent}
                    className="text-xs py-2"
                  >
                    All Absent
                  </Button>
                  {Object.keys(selectedDayPlan).length > 0 && (
                    <Button
                      variant="secondary"
                      fullWidth
                      onClick={handleClearDay}
                      className="text-xs py-2"
                    >
                      Clear
                    </Button>
                  )}
                </div>

                {/* Period Cards */}
                {periods.map(period => (
                  <PeriodCard
                    key={period.id}
                    period={period}
                    status={selectedDayPlan[period.id] || null}
                    onStatusChange={(status: 'present' | 'absent') => handleStatusChange(period.id, status)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {!selectedDate && (
          <div className="bg-bg-primary p-6 rounded-[10px] border border-border text-center">
            <TrendingUp className="w-12 h-12 text-text-muted mx-auto mb-3" />
            <p className="text-sm text-text-muted">
              Select a future date to plan your attendance and see how it affects your percentage
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};
