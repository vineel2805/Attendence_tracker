import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/app/components/Input';
import { Button } from '@/app/components/Button';
import { GoogleSignInButton } from '@/app/components/GoogleSignInButton';
import { storage } from '@/utils/storage';
import { authService } from '@/utils/authService';

export const LoginScreen: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);

    const { user, error: authError } = await authService.login(email, password);

    if (authError) {
      setError(authError);
      setLoading(false);
      return;
    }

    if (user) {
      storage.setUser(user);
      await storage.syncFromCloud();

      // Check email verification for email/password users
      if (!user.emailVerified) {
        navigate('/verify-email');
      } else if (user.profileComplete) {
        navigate('/dashboard');
      } else {
        navigate('/profile/setup');
      }
    }

    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);

    const { user, error: authError, isNewUser } = await authService.signInWithGoogle();

    if (authError) {
      setError(authError);
      setGoogleLoading(false);
      return;
    }

    if (user) {
      storage.setUser(user);
      
      if (!isNewUser) {
        await storage.syncFromCloud();
      }

      if (user.profileComplete) {
        navigate('/dashboard');
      } else {
        navigate('/profile/setup');
      }
    }

    setGoogleLoading(false);
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
            disabled={loading || googleLoading}
          />

          <div>
            <Input
              type="password"
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              disabled={loading || googleLoading}
            />
            <div className="text-right mt-1">
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-xs text-accent hover:underline"
                disabled={loading || googleLoading}
              >
                Forgot password?
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-danger">{error}</p>
          )}

          <Button type="submit" variant="primary" fullWidth disabled={loading || googleLoading}>
            {loading ? 'Logging in...' : 'Login'}
          </Button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-bg-primary px-2 text-text-muted">Or continue with</span>
            </div>
          </div>

          <GoogleSignInButton
            onClick={handleGoogleSignIn}
            loading={googleLoading}
            disabled={loading}
          />

          <div className="text-center pt-4">
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="text-sm text-text-secondary hover:text-text-primary"
              disabled={loading || googleLoading}
            >
              Don't have an account? <span className="font-medium">Sign up</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
