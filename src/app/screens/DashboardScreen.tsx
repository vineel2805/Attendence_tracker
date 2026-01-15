import React, { useState, useEffect } from 'react';
import { AppBar } from '@/app/components/AppBar';
import { BottomNav } from '@/app/components/BottomNav';
import { StatCard } from '@/app/components/StatCard';
import { EmptyState } from '@/app/components/EmptyState';
import { Calendar } from 'lucide-react';
import { storage } from '@/utils/storage';
import { calculateAttendanceStats } from '@/utils/attendance';
import { AttendanceStats } from '@/types';

export const DashboardScreen: React.FC = () => {
  const [stats, setStats] = useState<AttendanceStats>({
    totalPeriods: 0,
    presentPeriods: 0,
    absentPeriods: 0,
    attendancePercentage: 0,
  });

  useEffect(() => {
    const attendanceRecords = storage.getAttendance();
    const calculatedStats = calculateAttendanceStats(attendanceRecords);
    setStats(calculatedStats);
  }, []);

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 75) return 'success';
    if (percentage >= 65) return 'warning';
    return 'danger';
  };

  const user = storage.getUser();

  return (
    <div className="min-h-screen bg-bg-secondary pb-20">
      <AppBar title="Dashboard" />
      
      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Welcome Section */}
        <div className="bg-bg-primary p-6 rounded-[10px] border border-border">
          <h2 className="text-xl font-semibold text-text-primary mb-1">
            Welcome back, {user?.fullName || 'Student'}!
          </h2>
          <p className="text-sm text-text-secondary">
            {user?.rollNumber}
          </p>
        </div>

        {stats.totalPeriods === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No Attendance Data"
            description="Start marking your attendance to see statistics here"
          />
        ) : (
          <>
            {/* Overall Attendance */}
            <div>
              <h3 className="text-sm font-medium text-text-secondary mb-3">
                Overall Attendance
              </h3>
              <StatCard
                label="Attendance Percentage"
                value={`${stats.attendancePercentage}%`}
                color={getAttendanceColor(stats.attendancePercentage)}
              />
            </div>

            {/* Statistics Grid */}
            <div>
              <h3 className="text-sm font-medium text-text-secondary mb-3">
                Summary
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <StatCard
                  label="Total"
                  value={stats.totalPeriods}
                  color="default"
                />
                <StatCard
                  label="Present"
                  value={stats.presentPeriods}
                  color="success"
                />
                <StatCard
                  label="Absent"
                  value={stats.absentPeriods}
                  color="danger"
                />
              </div>
            </div>

            {/* Status Message */}
            <div className={`p-4 rounded-[10px] border ${
              stats.attendancePercentage >= 75 
                ? 'border-success bg-success/5' 
                : stats.attendancePercentage >= 65
                ? 'border-warning bg-warning/5'
                : 'border-danger bg-danger/5'
            }`}>
              <p className="text-sm font-medium text-text-primary">
                {stats.attendancePercentage >= 75
                  ? '✓ Your attendance is good! Keep it up.'
                  : stats.attendancePercentage >= 65
                  ? '⚠ Your attendance needs improvement.'
                  : '⚠ Warning: Your attendance is below required threshold.'}
              </p>
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};
