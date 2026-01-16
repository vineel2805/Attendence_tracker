import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/app/components/Input';
import { Button } from '@/app/components/Button';
import { GoogleSignInButton } from '@/app/components/GoogleSignInButton';
import { storage } from '@/utils/storage';
import { authService } from '@/utils/authService';

export const SignupScreen: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
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

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const { user, error: authError } = await authService.signUp(email, password);

    if (authError) {
      setError(authError);
      setLoading(false);
      return;
    }

    if (user) {
      storage.setUser(user);
      // Redirect to email verification screen
      navigate('/verify-email');
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
            disabled={loading || googleLoading}
          />

          <Input
            type="password"
            label="Password"
            placeholder="Create a password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            disabled={loading || googleLoading}
          />

          <Input
            type="password"
            label="Confirm Password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            fullWidth
            disabled={loading || googleLoading}
          />

          {error && (
            <p className="text-sm text-danger">{error}</p>
          )}

          <Button type="submit" variant="primary" fullWidth disabled={loading || googleLoading}>
            {loading ? 'Creating account...' : 'Sign Up'}
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
            text="Sign up with Google"
          />

          <div className="text-center pt-4">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-sm text-text-secondary hover:text-text-primary"
              disabled={loading || googleLoading}
            >
              Already have an account? <span className="font-medium">Login</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
