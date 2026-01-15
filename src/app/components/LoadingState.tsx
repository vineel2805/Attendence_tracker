import React from 'react';

export const LoadingState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6">
      <div className="w-12 h-12 border-4 border-bg-muted border-t-text-primary rounded-full animate-spin mb-4" />
      <p className="text-sm text-text-secondary">Loading...</p>
    </div>
  );
};
