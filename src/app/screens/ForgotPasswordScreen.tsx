import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/app/components/Input';
import { Button } from '@/app/components/Button';
import { authService } from '@/utils/authService';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';

export const ForgotPasswordScreen: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);

    const { error: resetError } = await authService.resetPassword(email);

    if (resetError) {
      setError(resetError);
      setLoading(false);
      return;
    }

    setEmailSent(true);
    setLoading(false);
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          
          <h1 className="text-2xl font-semibold text-text-primary mb-2">
            Check Your Email
          </h1>
          <p className="text-sm text-text-secondary mb-6">
            We've sent a password reset link to<br />
            <span className="font-medium text-text-primary">{email}</span>
          </p>

          <div className="space-y-3">
            <p className="text-xs text-text-muted">
              Didn't receive the email? Check your spam folder or try again.
            </p>
            
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setEmailSent(false)}
            >
              Try Another Email
            </Button>
            
            <Button
              variant="primary"
              fullWidth
              onClick={() => navigate('/login')}
            >
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to Login</span>
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-2xl font-semibold text-text-primary mb-2">
            Forgot Password?
          </h1>
          <p className="text-sm text-text-secondary">
            Enter your email and we'll send you a link to reset your password.
          </p>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-4">
          <Input
            type="email"
            label="Email Address"
            placeholder="your.email@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            disabled={loading}
          />

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button type="submit" variant="primary" fullWidth disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </form>
      </div>
    </div>
  );
};
