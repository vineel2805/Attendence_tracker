import React, { useState, useEffect } from 'react';
import { AppBar } from '@/app/components/AppBar';
import { BottomNav } from '@/app/components/BottomNav';
import { Input } from '@/app/components/Input';
import { Button } from '@/app/components/Button';
import { StatCard } from '@/app/components/StatCard';
import { TrendingUp } from 'lucide-react';
import { storage } from '@/utils/storage';
import { calculateAttendanceStats, predictAttendance } from '@/utils/attendance';
import { AttendanceStats } from '@/types';

export const PredictScreen: React.FC = () => {
  const [currentStats, setCurrentStats] = useState<AttendanceStats>({
    totalPeriods: 0,
    presentPeriods: 0,
    absentPeriods: 0,
    attendancePercentage: 0,
  });
  const [futureAttend, setFutureAttend] = useState('');
  const [futureMiss, setFutureMiss] = useState('');
  const [prediction, setPrediction] = useState<{
    percentage: number;
    status: 'safe' | 'warning' | 'risk';
  } | null>(null);

  useEffect(() => {
    const attendanceRecords = storage.getAttendance();
    const stats = calculateAttendanceStats(attendanceRecords);
    setCurrentStats(stats);
  }, []);

  const handlePredict = () => {
    const attend = parseInt(futureAttend) || 0;
    const miss = parseInt(futureMiss) || 0;
    
    if (attend === 0 && miss === 0) {
      setPrediction(null);
      return;
    }

    const result = predictAttendance(currentStats, attend, miss);
    setPrediction(result);
  };

  const getStatusMessage = (status: 'safe' | 'warning' | 'risk', percentage: number) => {
    if (status === 'safe') {
      return {
        title: '✓ Safe',
        message: `Your attendance will be ${percentage}%. You're doing great!`,
        color: 'success' as const,
      };
    }
    if (status === 'warning') {
      return {
        title: '⚠ Warning',
        message: `Your attendance will be ${percentage}%. Try to attend more classes.`,
        color: 'warning' as const,
      };
    }
    return {
      title: '⚠ Risk',
      message: `Your attendance will be ${percentage}%. This is below the required threshold!`,
      color: 'danger' as const,
    };
  };

  return (
    <div className="min-h-screen bg-bg-secondary pb-20">
      <AppBar title="Predict Attendance" />
      
      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Current Stats */}
        <div>
          <h3 className="text-sm font-medium text-text-secondary mb-3">
            Current Statistics
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Total Periods"
              value={currentStats.totalPeriods}
              color="default"
            />
            <StatCard
              label="Current %"
              value={`${currentStats.attendancePercentage}%`}
              color={
                currentStats.attendancePercentage >= 75 ? 'success' :
                currentStats.attendancePercentage >= 65 ? 'warning' : 'danger'
              }
            />
          </div>
        </div>

        {/* Input Section */}
        <div className="bg-bg-primary p-4 rounded-[10px] border border-border space-y-4">
          <h3 className="text-base font-semibold text-text-primary">
            Future Prediction
          </h3>
          
          <Input
            type="number"
            label="Periods you will attend"
            placeholder="0"
            value={futureAttend}
            onChange={(e) => setFutureAttend(e.target.value)}
            min="0"
            fullWidth
          />

          <Input
            type="number"
            label="Periods you will miss"
            placeholder="0"
            value={futureMiss}
            onChange={(e) => setFutureMiss(e.target.value)}
            min="0"
            fullWidth
          />

          <Button onClick={handlePredict} variant="primary" fullWidth>
            <TrendingUp className="w-4 h-4 inline mr-2" />
            Calculate Prediction
          </Button>
        </div>

        {/* Prediction Result */}
        {prediction && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-text-secondary">
              Prediction Result
            </h3>
            
            <StatCard
              label="Predicted Attendance"
              value={`${prediction.percentage}%`}
              color={
                prediction.status === 'safe' ? 'success' :
                prediction.status === 'warning' ? 'warning' : 'danger'
              }
            />

            <div className={`p-4 rounded-[10px] border ${
              prediction.status === 'safe' 
                ? 'border-success bg-success/5' 
                : prediction.status === 'warning'
                ? 'border-warning bg-warning/5'
                : 'border-danger bg-danger/5'
            }`}>
              <p className="text-base font-semibold text-text-primary mb-1">
                {getStatusMessage(prediction.status, prediction.percentage).title}
              </p>
              <p className="text-sm text-text-secondary">
                {getStatusMessage(prediction.status, prediction.percentage).message}
              </p>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};
