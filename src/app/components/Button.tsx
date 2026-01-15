import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  children: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  children,
  fullWidth = false,
  disabled,
  className = '',
  ...props
}) => {
  const baseClasses = 'px-4 py-3 rounded-[10px] font-medium text-sm transition-all duration-200';
  
  const variantClasses = {
    primary: 'bg-text-primary text-bg-primary hover:opacity-90 active:opacity-80',
    secondary: 'bg-bg-muted text-text-primary hover:bg-border active:bg-border',
    danger: 'bg-danger text-white hover:opacity-90 active:opacity-80',
  };

  const disabledClasses = 'opacity-50 cursor-not-allowed';
  const widthClasses = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${disabled ? disabledClasses : ''} ${widthClasses} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
