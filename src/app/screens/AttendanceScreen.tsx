import React, { useState, useEffect } from 'react';
import { AppBar } from '@/app/components/AppBar';
import { BottomNav } from '@/app/components/BottomNav';
import { PeriodCard } from '@/app/components/PeriodCard';
import { Button } from '@/app/components/Button';
import { Input } from '@/app/components/Input';
import { EmptyState } from '@/app/components/EmptyState';
import { Calendar, Check, CalendarOff } from 'lucide-react';
import { storage } from '@/utils/storage';
import {
  formatDate,
  getDayName,
  calculateAttendanceStats,
  getDayIdFromDate,
  buildOccupiedSlotsForDay,
  isSetupComplete,
} from '@/utils/attendance';
import { Period, DailyAttendance } from '@/types';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export const AttendanceScreen: React.FC = () => {
  const navigate = useNavigate();
  const [date] = useState(new Date());
  const [periods, setPeriods] = useState<Period[]>([]);
  const [attendance, setAttendance] = useState<{ [key: string]: 'present' | 'absent' }>({});
  const [currentAttendance, setCurrentAttendance] = useState(0);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [isHoliday, setIsHoliday] = useState(false);
  const [holidayReason, setHolidayReason] = useState('');
  const [showHolidayForm, setShowHolidayForm] = useState(false);

  useEffect(() => {
    const settings = storage.getSettingsV2();
    const subjects = storage.getSubjectsV2();
    const timetableV2 = storage.getTimetableV2();

    const dayId = getDayIdFromDate(date);
    const totalPeriodsOfDay = settings.days[dayId]?.totalPeriods ?? 0;

    if (!isSetupComplete(settings, subjects) || totalPeriodsOfDay === 0) {
      setNeedsSetup(true);
      setPeriods([]);
    } else {
      setNeedsSetup(false);
      const slots = buildOccupiedSlotsForDay({
        dayId,
        timetable: timetableV2,
        subjects,
        totalPeriods: totalPeriodsOfDay,
      });

      // Only conducted periods (occupied slots) become attendance rows.
      const todayPeriods: Period[] = slots.map(slot => ({
        id: `${formatDate(date)}-${dayId}-P${slot.periodIndex}`,
        periodNumber: slot.periodIndex,
        subject: slot.subjectName,
      }));
      setPeriods(todayPeriods);
    }

    // Check if attendance already marked
    const attendanceRecords = storage.getAttendance();
    const todayRecord = attendanceRecords.find(r => r.date === formatDate(date));
    if (todayRecord) {
      // Check if today is marked as holiday
      if (todayRecord.isHoliday) {
        setIsHoliday(true);
        setHolidayReason(todayRecord.holidayReason || 'Holiday');
        return;
      }

      // Check if period IDs match current timetable (timetable may have changed)
      const currentPeriodIds = new Set(periods.map(p => p.id));
      const recordedPeriodIds = new Set(Object.keys(todayRecord.periods));
      const hasMismatch = Array.from(recordedPeriodIds).some(id => !currentPeriodIds.has(id)) ||
                          Array.from(currentPeriodIds).some(id => !recordedPeriodIds.has(id));
      
      if (hasMismatch && periods.length > 0) {
        // Show non-blocking notice if timetable changed
        toast.info('Timetable changed since this attendance was first recorded; some periods may not line up exactly.', {
          duration: 5000,
        });
      }
      
      setAttendance(todayRecord.periods);
    }

    // Calculate current attendance percentage
    // Stats are period-accurate because records store per-conducted-period status.
    const stats = calculateAttendanceStats(attendanceRecords);
    setCurrentAttendance(stats.attendancePercentage);
  }, [date]);

  const handleStatusChange = (periodId: string, status: 'present' | 'absent') => {
    setAttendance(prev => ({
      ...prev,
      [periodId]: status,
    }));
  };

  const handleSave = () => {
    const dailyAttendance: DailyAttendance = {
      date: formatDate(date),
      periods: attendance,
      isHoliday: false,
    };

    storage.addAttendance(dailyAttendance);
    
    // Recalculate stats
    const attendanceRecords = storage.getAttendance();
    const stats = calculateAttendanceStats(attendanceRecords);
    setCurrentAttendance(stats.attendancePercentage);
    
    toast.success('Attendance saved successfully!');
  };

  const handleMarkHoliday = () => {
    storage.markHoliday(formatDate(date), holidayReason || 'Holiday');
    setIsHoliday(true);
    setShowHolidayForm(false);
    
    // Recalculate stats
    const attendanceRecords = storage.getAttendance();
    const stats = calculateAttendanceStats(attendanceRecords);
    setCurrentAttendance(stats.attendancePercentage);
    
    toast.success('Today marked as holiday!');
  };

  const handleRemoveHoliday = () => {
    storage.unmarkHoliday(formatDate(date));
    setIsHoliday(false);
    setHolidayReason('');
    
    // Recalculate stats
    const attendanceRecords = storage.getAttendance();
    const stats = calculateAttendanceStats(attendanceRecords);
    setCurrentAttendance(stats.attendancePercentage);
    
    toast.success('Holiday removed!');
  };

  const isAllMarked = periods.length > 0 && periods.every(p => attendance[p.id]);

  return (
    <div className="min-h-screen bg-bg-secondary pb-20">
      <AppBar title="Mark Attendance" />
      
      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Date and Attendance Card */}
        <div className="bg-bg-primary p-4 rounded-[10px] border border-border">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm text-text-muted">Today</p>
              <p className="text-lg font-semibold text-text-primary">
                {date.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-text-muted">Current</p>
              <p className={`text-2xl font-semibold ${
                currentAttendance >= 75 ? 'text-success' : 
                currentAttendance >= 65 ? 'text-warning' : 'text-danger'
              }`}>
                {currentAttendance}%
              </p>
            </div>
          </div>
        </div>

        {isHoliday ? (
          <div className="bg-bg-primary p-4 rounded-[10px] border border-border space-y-4">
            <div className="bg-accent/10 p-4 rounded-lg flex items-center gap-3">
              <CalendarOff className="w-8 h-8 text-accent" />
              <div>
                <p className="text-sm font-medium text-text-primary">Today is a Holiday</p>
                <p className="text-xs text-text-muted">{holidayReason}</p>
              </div>
            </div>
            <Button variant="secondary" fullWidth onClick={handleRemoveHoliday}>
              Remove Holiday
            </Button>
          </div>
        ) : periods.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title={needsSetup ? 'Setup Required' : 'No Classes Today'}
            description={
              needsSetup
                ? 'Configure your day periods and subjects in Settings, then add classes to your timetable.'
                : 'There are no conducted classes scheduled for today.'
            }
            actionLabel={needsSetup ? 'Go to Settings' : undefined}
            onAction={needsSetup ? () => navigate('/settings') : undefined}
          />
        ) : (
          <>
            {/* Holiday Option */}
            {!showHolidayForm && (
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setShowHolidayForm(true)}
              >
                <CalendarOff className="w-4 h-4 inline mr-2" />
                Mark Today as Holiday
              </Button>
            )}

            {showHolidayForm && (
              <div className="bg-bg-primary p-4 rounded-[10px] border border-border space-y-3">
                <p className="text-xs text-text-muted">
                  This will skip attendance for today. Use for public holidays, festivals, etc.
                </p>
                <Input
                  label="Holiday Reason (optional)"
                  placeholder="e.g., Independence Day, Festival"
                  value={holidayReason}
                  onChange={(e) => setHolidayReason(e.target.value)}
                  fullWidth
                />
                <div className="flex gap-3">
                  <Button variant="secondary" fullWidth onClick={() => setShowHolidayForm(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" fullWidth onClick={handleMarkHoliday}>
                    Confirm Holiday
                  </Button>
                </div>
              </div>
            )}

            {/* Periods List */}
            {!showHolidayForm && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-text-secondary">
                  Today's Classes ({periods.length})
                </h3>
                {periods.map(period => (
                  <PeriodCard
                    key={period.id}
                    period={period}
                    status={attendance[period.id]}
                    onStatusChange={(status) => handleStatusChange(period.id, status)}
                  />
                ))}
              </div>
            )}

            {/* Save Button */}
            {!showHolidayForm && (
              <>
                {periods.length > 0 && !isAllMarked && (
                  <p className="text-sm text-text-muted text-center">
                    Mark each period as Present or Absent to submit
                  </p>
                )}
                <Button
                  onClick={handleSave}
                  disabled={!isAllMarked}
                  fullWidth
                  variant="primary"
                >
                  <Check className="w-4 h-4 inline mr-2" />
                  Submit Today&apos;s Attendance
                </Button>
              </>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};
