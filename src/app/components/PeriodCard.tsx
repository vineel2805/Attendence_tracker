import React from 'react';
import { Period } from '@/types';

interface PeriodCardProps {
  period: Period;
  status?: 'present' | 'absent' | null;
  onStatusChange?: (status: 'present' | 'absent') => void;
  viewOnly?: boolean;
}

export const PeriodCard: React.FC<PeriodCardProps> = ({
  period,
  status = null,
  onStatusChange,
  viewOnly = false,
}) => {
  const getStatusClasses = () => {
    if (status === 'present') {
      return 'border-success bg-success/5';
    }
    if (status === 'absent') {
      return 'border-danger bg-danger/5';
    }
    return 'border-border bg-bg-secondary';
  };

  return (
    <div className={`p-4 rounded-[10px] border-2 ${getStatusClasses()}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-medium text-text-muted">Period {period.periodNumber}</p>
          <h3 className="text-base font-medium text-text-primary mt-1">{period.subject}</h3>
        </div>
        {status && (
          <span className={`text-xs font-medium px-2 py-1 rounded-md ${
            status === 'present' ? 'bg-success text-white' : 'bg-danger text-white'
          }`}>
            {status === 'present' ? 'Present' : 'Absent'}
          </span>
        )}
      </div>

      {!viewOnly && onStatusChange && (
        <div className="flex gap-2">
          <button
            onClick={() => onStatusChange('present')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              status === 'present'
                ? 'bg-success text-white'
                : 'bg-bg-muted text-text-primary hover:bg-border'
            }`}
          >
            Present
          </button>
          <button
            onClick={() => onStatusChange('absent')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              status === 'absent'
                ? 'bg-danger text-white'
                : 'bg-bg-muted text-text-primary hover:bg-border'
            }`}
          >
            Absent
          </button>
        </div>
      )}
    </div>
  );
};
