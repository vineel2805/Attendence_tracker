import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/app/components/Input';
import { Button } from '@/app/components/Button';
import { storage } from '@/utils/storage';
import { User } from '@/types';

export const LoginScreen: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    // Mock login - in real app, authenticate with backend
    const user: User = {
      uid: Date.now().toString(),
      email,
      emailVerified: true,
      profileComplete: false,
    };

    storage.setUser(user);
    navigate('/profile/setup');
  };

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-text-primary mb-2">
            Student Attendance
          </h1>
          <p className="text-sm text-text-secondary">
            Track your class attendance
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            type="email"
            label="Email"
            placeholder="your.email@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
          />

          <Input
            type="password"
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
          />

          {error && (
            <p className="text-sm text-danger">{error}</p>
          )}

          <Button type="submit" variant="primary" fullWidth>
            Login
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="text-sm text-text-secondary hover:text-text-primary"
            >
              Don't have an account? <span className="font-medium">Sign up</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
