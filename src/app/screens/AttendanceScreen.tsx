import React, { useState, useEffect } from 'react';
import { AppBar } from '@/app/components/AppBar';
import { BottomNav } from '@/app/components/BottomNav';
import { PeriodCard } from '@/app/components/PeriodCard';
import { Button } from '@/app/components/Button';
import { EmptyState } from '@/app/components/EmptyState';
import { Calendar, Check } from 'lucide-react';
import { storage } from '@/utils/storage';
import { formatDate, getDayName, calculateAttendanceStats, expandPeriodsForDay } from '@/utils/attendance';
import { Period, DailyAttendance } from '@/types';
import { toast } from 'sonner';

export const AttendanceScreen: React.FC = () => {
  const [date] = useState(new Date());
  const [periods, setPeriods] = useState<Period[]>([]);
  const [attendance, setAttendance] = useState<{ [key: string]: 'present' | 'absent' }>({});
  const [currentAttendance, setCurrentAttendance] = useState(0);

  useEffect(() => {
    // Get today's timetable
    const timetable = storage.getTimetable();
    const dayName = getDayName(date);
    const todayBasePeriods = timetable[dayName] || [];
    const expanded = expandPeriodsForDay(todayBasePeriods);
    setPeriods(expanded);

    // Check if attendance already marked
    const attendanceRecords = storage.getAttendance();
    const todayRecord = attendanceRecords.find(r => r.date === formatDate(date));
    if (todayRecord) {
      setAttendance(todayRecord.periods);
    }

    // Calculate current attendance percentage
    const stats = calculateAttendanceStats(attendanceRecords, timetable);
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
    };

    storage.addAttendance(dailyAttendance);
    
    // Recalculate stats
    const timetable = storage.getTimetable();
    const attendanceRecords = storage.getAttendance();
    const stats = calculateAttendanceStats(attendanceRecords, timetable);
    setCurrentAttendance(stats.attendancePercentage);
    
    toast.success('Attendance saved successfully!');
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

        {periods.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No Classes Today"
            description="There are no classes scheduled for today. Set up your timetable to start tracking attendance."
          />
        ) : (
          <>
            {/* Periods List */}
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

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={!isAllMarked}
              fullWidth
              variant="primary"
            >
              <Check className="w-4 h-4 inline mr-2" />
              Save Attendance
            </Butto