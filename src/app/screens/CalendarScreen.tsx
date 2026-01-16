import React, { useState, useEffect, useMemo } from 'react';
import { AppBar } from '@/app/components/AppBar';
import { BottomNav } from '@/app/components/BottomNav';
import { Button } from '@/app/components/Button';
import { Input } from '@/app/components/Input';
import { PeriodCard } from '@/app/components/PeriodCard';
import { EmptyState } from '@/app/components/EmptyState';
import { storage } from '@/utils/storage';
import {
  formatDate,
  getDayIdFromDate,
  buildOccupiedSlotsForDay,
  calculateAttendanceStats,
} from '@/utils/attendance';
import { DailyAttendance, Period } from '@/types';
import {
  Calendar,
  Check,
  X,
  Pencil,
  CalendarOff,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';

export const CalendarScreen: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<DailyAttendance[]>([]);

  // For selected day editing
  const [periods, setPeriods] = useState<Period[]>([]);
  const [attendance, setAttendance] = useState<{ [key: string]: 'present' | 'absent' }>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isHoliday, setIsHoliday] = useState(false);
  const [holidayReason, setHolidayReason] = useState('');
  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load attendance records
  useEffect(() => {
    const records = storage.getAttendance();
    setAttendanceRecords(records);
  }, []);

  // Generate calendar days for the current month
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];

    // Add days from previous month to fill the first week
    const firstDayOfWeek = firstDay.getDay();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false });
    }

    // Add days of current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push({ date: new Date(year, month, day), isCurrentMonth: true });
    }

    // Add days from next month to complete the last week
    const remainingDays = 7 - (days.length % 7);
    if (remainingDays < 7) {
      for (let i = 1; i <= remainingDays; i++) {
        days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
      }
    }

    return days;
  }, [currentMonth]);

  // Get status for a date
  const getDateStatus = (
    date: Date
  ): 'present' | 'absent' | 'partial' | 'holiday' | 'none' => {
    const dateStr = formatDate(date);
    const record = attendanceRecords.find((r) => r.date === dateStr);

    if (!record) return 'none';
    if (record.isHoliday) return 'holiday';

    const statuses = Object.values(record.periods);
    if (statuses.length === 0) return 'none';

    const allPresent = statuses.every((s) => s === 'present');
    const allAbsent = statuses.every((s) => s === 'absent');

    if (allPresent) return 'present';
    if (allAbsent) return 'absent';
    return 'partial';
  };

  // Load data for selected date
  useEffect(() => {
    if (!selectedDate) {
      setPeriods([]);
      setAttendance({});
      setIsHoliday(false);
      setHolidayReason('');
      return;
    }

    const dateStr = formatDate(selectedDate);
    const record = attendanceRecords.find((r) => r.date === dateStr);

    if (record?.isHoliday) {
      setIsHoliday(true);
      setHolidayReason(record.holidayReason || 'Holiday');
      setPeriods([]);
      setAttendance({});
      return;
    }

    setIsHoliday(false);
    setHolidayReason('');

    // Build periods for the selected date
    const settings = storage.getSettingsV2();
    const subjects = storage.getSubjectsV2();
    const timetableV2 = storage.getTimetableV2();
    const dayId = getDayIdFromDate(selectedDate);
    const totalPeriodsOfDay = settings.days[dayId]?.totalPeriods ?? 0;

    if (totalPeriodsOfDay === 0) {
      setPeriods([]);
      setAttendance({});
      return;
    }

    const slots = buildOccupiedSlotsForDay({
      dayId,
      timetable: timetableV2,
      subjects,
      totalPeriods: totalPeriodsOfDay,
    });

    const dayPeriods: Period[] = slots.map((slot: { periodIndex: number; subjectId: string; subjectName: string; entryId: string }) => ({
      id: `${dateStr}-${dayId}-P${slot.periodIndex}`,
      periodNumber: slot.periodIndex,
      subject: slot.subjectName,
    }));

    setPeriods(dayPeriods);
    setAttendance(record?.periods || {});
  }, [selectedDate, attendanceRecords]);

  const handlePrevMonth = () => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
    );
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
    );
    setSelectedDate(null);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsEditing(false);
    setShowHolidayForm(false);
  };

  const handleStatusChange = (periodId: string, status: 'present' | 'absent') => {
    setAttendance((prev) => ({
      ...prev,
      [periodId]: status,
    }));
  };

  const handleSaveAttendance = () => {
    if (!selectedDate) return;

    // Validate all periods are marked
    const allPeriodsMarked = periods.every((p) => attendance[p.id]);
    if (!allPeriodsMarked) {
      toast.error('Please mark all periods before saving');
      return;
    }

    setIsSaving(true);

    try {
      const dailyAttendance: DailyAttendance = {
        date: formatDate(selectedDate),
        periods: attendance,
        isHoliday: false,
      };

      storage.addAttendance(dailyAttendance);
      
      // Update attendance records state immediately
      const updatedRecords = storage.getAttendance();
      setAttendanceRecords(updatedRecords);
      
      setIsEditing(false);
      setIsSaving(false);
      
      toast.success('Attendance saved! Overall stats updated.');
    } catch (error) {
      setIsSaving(false);
      toast.error('Failed to save attendance. Please try again.');
    }
  };

  const handleMarkHoliday = () => {
    if (!selectedDate) return;

    storage.markHoliday(formatDate(selectedDate), holidayReason || 'Holiday');
    const updatedRecords = storage.getAttendance();
    setAttendanceRecords(updatedRecords);
    setIsHoliday(true);
    setShowHolidayForm(false);
    toast.success('Day marked as holiday! Overall stats updated.');
  };

  const handleRemoveHoliday = () => {
    if (!selectedDate) return;

    storage.unmarkHoliday(formatDate(selectedDate));
    const updatedRecords = storage.getAttendance();
    setAttendanceRecords(updatedRecords);
    setIsHoliday(false);
    setHolidayReason('');
    toast.success('Holiday removed! Overall stats updated.');
  };

  const today = new Date();
  const isToday = selectedDate && formatDate(selectedDate) === formatDate(today);
  const isFuture = selectedDate && selectedDate > today;
  const isPastDate = selectedDate && !isToday && !isFuture;
  
  // Calculate stats using useMemo to ensure proper updates
  const stats = useMemo(() => {
    return calculateAttendanceStats(attendanceRecords);
  }, [attendanceRecords]);

  return (
    <div className="min-h-screen bg-bg-secondary pb-20">
      <AppBar title="Calendar" />

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Enhanced Stats Summary */}
        <div className="bg-bg-primary p-4 rounded-[10px] border border-border">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-text-muted">Overall Attendance</p>
              <p
                className={`text-2xl font-bold ${
                  stats.attendancePercentage >= 75
                    ? 'text-success'
                    : stats.attendancePercentage >= 65
                    ? 'text-warning'
                    : 'text-danger'
                }`}
              >
                {stats.attendancePercentage}%
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-text-muted">
                {stats.presentPeriods}/{stats.totalPeriods} periods
              </p>
            </div>
          </div>
          
          {/* Detailed Stats */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border">
            <div className="text-center">
              <p className="text-lg font-semibold text-text-primary">{stats.totalPeriods}</p>
              <p className="text-xs text-text-muted">Total Classes</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-success">{stats.presentPeriods}</p>
              <p className="text-xs text-text-muted">Present</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-danger">{stats.absentPeriods}</p>
              <p className="text-xs text-text-muted">Absent</p>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="bg-bg-primary p-4 rounded-[10px] border border-border">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-lg hover:bg-bg-muted transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-text-primary" />
            </button>
            <h2 className="text-base font-semibold text-text-primary">
              {currentMonth.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
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
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-text-muted py-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map(({ date, isCurrentMonth }, index) => {
              const dateStr = formatDate(date);
              const status = getDateStatus(date);
              const isSelected =
                selectedDate && formatDate(selectedDate) === dateStr;
              const isTodayDate = formatDate(today) === dateStr;

              let bgColor = 'bg-transparent';
              let textColor = isCurrentMonth
                ? 'text-text-primary'
                : 'text-text-muted/50';
              let dotColor = '';

              if (status === 'present') dotColor = 'bg-success';
              else if (status === 'absent') dotColor = 'bg-danger';
              else if (status === 'partial') dotColor = 'bg-warning';
              else if (status === 'holiday') dotColor = 'bg-accent';

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
                  disabled={!isCurrentMonth}
                  className={`relative aspect-square flex flex-col items-center justify-center rounded-lg transition-colors ${bgColor} ${
                    isCurrentMonth ? 'hover:bg-bg-muted' : 'cursor-default'
                  } ${isSelected ? 'hover:bg-text-primary' : ''}`}
                >
                  <span className={`text-sm font-medium ${textColor}`}>
                    {date.getDate()}
                  </span>
                  {dotColor && (
                    <span
                      className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${dotColor}`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-success" />
              <span className="text-xs text-text-muted">Present</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-danger" />
              <span className="text-xs text-text-muted">Absent</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-warning" />
              <span className="text-xs text-text-muted">Partial</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-accent" />
              <span className="text-xs text-text-muted">Holiday</span>
            </div>
          </div>
        </div>

        {/* Selected Date Details */}
        {selectedDate && (
          <div className="bg-bg-primary p-4 rounded-[10px] border border-border space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-muted">
                  {isToday ? 'Today' : isFuture ? 'Future Date' : 'Past Date'}
                </p>
                <p className="text-base font-semibold text-text-primary">
                  {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>

              {!isFuture && !isHoliday && periods.length > 0 && !isEditing && (
                <Button
                  variant="secondary"
                  className="px-3 py-2 text-xs"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="w-3.5 h-3.5 inline mr-1" />
                  Edit
                </Button>
              )}
            </div>

            {/* Holiday Status */}
            {isHoliday ? (
              <div className="space-y-3">
                <div className="bg-accent/10 p-4 rounded-lg flex items-center gap-3">
                  <CalendarOff className="w-8 h-8 text-accent" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      Holiday
                    </p>
                    <p className="text-xs text-text-muted">{holidayReason}</p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={handleRemoveHoliday}
                >
                  <X className="w-4 h-4 inline mr-1" />
                  Remove Holiday
                </Button>
              </div>
            ) : isFuture ? (
              <EmptyState
                icon={Calendar}
                title="Future Date"
                description="You can only mark attendance for today or past dates."
              />
            ) : periods.length === 0 ? (
              <div className="space-y-3">
                <EmptyState
                  icon={Calendar}
                  title="No Classes"
                  description="No classes scheduled for this day, or it's a regular weekly off."
                />

                {!showHolidayForm ? (
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => setShowHolidayForm(true)}
                  >
                    <CalendarOff className="w-4 h-4 inline mr-1" />
                    Mark as Holiday
                  </Button>
                ) : (
                  <div className="space-y-3 p-3 bg-bg-secondary rounded-lg">
                    <Input
                      label="Holiday Reason (optional)"
                      placeholder="e.g., Independence Day, Festival"
                      value={holidayReason}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHolidayReason(e.target.value)}
                      fullWidth
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        fullWidth
                        onClick={() => setShowHolidayForm(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        fullWidth
                        onClick={handleMarkHoliday}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Holiday option for days with classes */}
                {!isEditing && !showHolidayForm && (
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => setShowHolidayForm(true)}
                  >
                    <CalendarOff className="w-4 h-4 inline mr-1" />
                    Mark as Holiday
                  </Button>
                )}

                {showHolidayForm && (
                  <div className="space-y-3 p-3 bg-bg-secondary rounded-lg">
                    <p className="text-xs text-text-muted">
                      This will replace any attendance recorded for this day.
                    </p>
                    <Input
                      label="Holiday Reason (optional)"
                      placeholder="e.g., Independence Day, Festival"
                      value={holidayReason}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHolidayReason(e.target.value)}
                      fullWidth
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        fullWidth
                        onClick={() => setShowHolidayForm(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        fullWidth
                        onClick={handleMarkHoliday}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                )}

                {!showHolidayForm && (
                  <>
                    {/* Period Cards */}
                    {periods.map((period) => (
                      <PeriodCard
                        key={period.id}
                        period={period}
                        status={attendance[period.id]}
                        onStatusChange={
                          isEditing
                            ? (status: 'present' | 'absent') => handleStatusChange(period.id, status)
                            : undefined
                        }
                        viewOnly={!isEditing}
                      />
                    ))}

                    {/* Enhanced Save Button for Past Dates */}
                    {isEditing && (
                      <div className="space-y-2 pt-2 border-t border-border">
                        {isPastDate && (
                          <div className="bg-warning/10 p-2 rounded-lg mb-2">
                            <p className="text-xs text-text-muted text-center">
                              Editing past date attendance will update overall statistics
                            </p>
                          </div>
                        )}
                        <div className="flex gap-3">
                          <Button
                            variant="secondary"
                            fullWidth
                            onClick={() => {
                              setIsEditing(false);
                              // Reload original data
                              const dateStr = formatDate(selectedDate);
                              const record = attendanceRecords.find(
                                (r) => r.date === dateStr
                              );
                              setAttendance(record?.periods || {});
                            }}
                            disabled={isSaving}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="primary"
                            fullWidth
                            onClick={handleSaveAttendance}
                            disabled={!periods.every((p) => attendance[p.id]) || isSaving}
                          >
                            {isSaving ? (
                              <>
                                <span className="animate-spin inline-block mr-1">⏳</span>
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4 inline mr-1" />
                                Save Changes
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {!selectedDate && (
          <div className="bg-bg-primary p-6 rounded-[10px] border border-border text-center">
            <CalendarCheck className="w-12 h-12 text-text-muted mx-auto mb-3" />
            <p className="text-sm text-text-muted">
              Select a date to view or edit attendance
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};
