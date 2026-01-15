import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/app/components/Input';
import { Button } from '@/app/components/Button';
import { storage } from '@/utils/storage';
import { User } from '@/types';

export const SignupScreen: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Mock signup
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
            Create Account
          </h1>
          <p className="text-sm text-text-secondary">
            Join to start tracking your attendance
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
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
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
          />

          <Input
            type="password"
            label="Confirm Password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            fullWidth
          />

          {error && (
            <p className="text-sm text-danger">{error}</p>
          )}

          <Button type="submit" variant="primary" fullWidth>
            Sign Up
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-sm text-text-secondary hover:text-text-primary"
            >
              Already have an account? <span className="font-medium">Login</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
