import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/app/components/Button';
import { authService } from '@/utils/authService';
import { storage } from '@/utils/storage';
import { Mail, RefreshCw, LogOut, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export const VerifyEmailScreen: React.FC = () => {
  const navigate = useNavigate();
  const user = storage.getUser();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Cooldown timer for resend button
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleResendEmail = async () => {
    if (cooldown > 0) return;
    
    setLoading(true);
    const { error } = await authService.sendVerificationEmail();
    setLoading(false);

    if (error) {
      toast.error(error);
    } else {
      toast.success('Verification email sent! Check your inbox.');
      setCooldown(60); // 60 second cooldown
    }
  };

  const handleCheckVerification = async () => {
    setChecking(true);
    const { emailVerified, error } = await authService.reloadUser();
    setChecking(false);

    if (error) {
      toast.error(error);
      return;
    }

    if (emailVerified) {
      // Update local user state
      if (user) {
        storage.setUser({ ...user, emailVerified: true });
      }
      toast.success('Email verified successfully!');
      
      if (user?.profileComplete) {
        navigate('/dashboard');
      } else {
        navigate('/profile/setup');
      }
    } else {
      toast.error('Email not verified yet. Please check your inbox and click the verification link.');
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    storage.clearUser();
    storage.clearAll();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="w-20 h-20 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Mail className="w-10 h-10 text-warning" />
        </div>

        <h1 className="text-2xl font-semibold text-text-primary mb-2">
          Verify Your Email
        </h1>
        <p className="text-sm text-text-secondary mb-2">
          We've sent a verification email to
        </p>
        <p className="text-base font-medium text-text-primary mb-6">
          {user?.email}
        </p>

        <div className="bg-bg-muted p-4 rounded-lg mb-6">
          <p className="text-sm text-text-secondary">
            Click the link in the email to verify your account. If you don't see it, check your spam folder.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            variant="primary"
            fullWidth
            onClick={handleCheckVerification}
            disabled={checking}
          >
            {checking ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                I've Verified My Email
              </>
            )}
          </Button>

          <Button
            variant="secondary"
            fullWidth
            onClick={handleResendEmail}
            disabled={loading || cooldown > 0}
          >
            {loading ? (
              'Sending...'
            ) : cooldown > 0 ? (
              `Resend in ${cooldown}s`
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Resend Verification Email
              </>
            )}
          </Button>

          <div className="pt-4 border-t border-border">
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full text-sm text-text-muted hover:text-danger transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out and use a different account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
