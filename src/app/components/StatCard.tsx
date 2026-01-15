import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  color?: 'default' | 'success' | 'danger' | 'warning';
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  color = 'default',
}) => {
  const colorClasses = {
    default: 'border-border bg-bg-secondary',
    success: 'border-success bg-success/5',
    danger: 'border-danger bg-danger/5',
    warning: 'border-warning bg-warning/5',
  };

  const valueColorClasses = {
    default: 'text-text-primary',
    success: 'text-success',
    danger: 'text-danger',
    warning: 'text-warning',
  };

  return (
    <div className={`p-4 rounded-[10px] border ${colorClasses[color]}`}>
      <p className="text-sm text-text-muted mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${valueColorClasses[color]}`}>
        {value}
      </p>
    </div>
  );
};
