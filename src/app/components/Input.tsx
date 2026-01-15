import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  fullWidth = true,
  className = '',
  ...props
}) => {
  const widthClasses = fullWidth ? 'w-full' : '';
  const errorClasses = error ? 'border-danger' : 'border-border';

  return (
    <div className={`${widthClasses}`}>
      {label && (
        <label className="block mb-2 text-sm font-medium text-text-primary">
          {label}
        </label>
      )}
      <input
        className={`${widthClasses} px-4 py-3 rounded-[10px] border ${errorClasses} bg-bg-primary text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-text-primary/20 ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-danger">{error}</p>
      )}
    </div>
  );
};
