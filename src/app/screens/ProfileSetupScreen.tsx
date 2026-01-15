import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/app/components/Input';
import { Button } from '@/app/components/Button';
import { storage } from '@/utils/storage';

export const ProfileSetupScreen: React.FC = () => {
  const navigate = useNavigate();
  const user = storage.getUser();
  
  const [fullName, setFullName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [error, setError] = useState('');

  const handleSetup = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName || !rollNumber) {
      setError('Please fill in all fields');
      return;
    }

    if (user) {
      const updatedUser = {
        ...user,
        fullName,
        rollNumber,
        profileComplete: true,
      };
      storage.setUser(updatedUser);
      navigate('/timetable');
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-text-primary mb-2">
            Complete Your Profile
          </h1>
          <p className="text-sm text-text-secondary">
            We need a few details to get started
          </p>
        </div>

        <form onSubmit={handleSetup} className="space-y-4">
          <Input
            type="text"
            label="Full Name"
            placeholder="John Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            fullWidth
            required
          />

          <Input
            type="text"
            label="Roll Number"
            placeholder="2021CS001"
            value={rollNumber}
            onChange={(e) => setRollNumber(e.target.value)}
            fullWidth
            required
          />

          <Input
            type="email"
            label="Email"
            value={user?.email || ''}
            readOnly
            fullWidth
            className="bg-bg-muted"
          />

          {error && (
            <p className="text-sm text-danger">{error}</p>
          )}

          <Button type="submit" variant="primary" fullWidth>
            Continue
          </Button>
        </form>
      </div>
    </div>
  );
};
