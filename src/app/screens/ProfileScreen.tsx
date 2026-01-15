import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar } from '@/app/components/AppBar';
import { BottomNav } from '@/app/components/BottomNav';
import { Input } from '@/app/components/Input';
import { Button } from '@/app/components/Button';
import { LogOut, Mail, User as UserIcon, Hash, Settings as SettingsIcon, ChevronRight, X } from 'lucide-react';
import { storage } from '@/utils/storage';
import { toast } from 'sonner';

export const ProfileScreen: React.FC = () => {
  const navigate = useNavigate();
  const user = storage.getUser();
  
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [rollNumber, setRollNumber] = useState(user?.rollNumber || '');

  const handleSave = () => {
    if (user) {
      const updatedUser = {
        ...user,
        fullName,
        rollNumber,
      };
      storage.setUser(updatedUser);
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    }
  };

  const handleLogout = () => {
    storage.clearAll();
    navigate('/login');
  };

  const handleOpenSettings = () => {
    navigate('/settings');
  };

  return (
    <div className="min-h-screen bg-bg-secondary pb-20">
      <AppBar title="Profile" showProfile={false} />
      
      <div className="max-w-md mx-auto p-4 flex flex-col min-h-[calc(100vh-140px)]">
        {/* Compact Profile Header */}
        <div className="flex items-center gap-4 py-4">
          <div className="w-14 h-14 rounded-full bg-bg-muted flex items-center justify-center flex-shrink-0">
            <UserIcon className="w-7 h-7 text-text-muted" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-text-primary truncate">
              {user?.fullName || 'Unknown'}
            </h2>
            <p className="text-sm text-text-muted truncate">
              {user?.rollNumber || 'No roll number'} • {user?.email}
            </p>
          </div>
        </div>

        {/* Action Pills */}
        <div className="flex gap-3 mt-2">
          <button
            onClick={() => setIsEditing(true)}
            className="flex-1 py-2.5 px-4 rounded-full bg-text-primary text-bg-primary text-sm font-medium transition-colors hover:opacity-90"
          >
            Edit Profile
          </button>
          <button
            onClick={handleOpenSettings}
            className="flex-1 py-2.5 px-4 rounded-full bg-bg-muted text-text-primary text-sm font-medium transition-colors hover:bg-border flex items-center justify-center gap-2"
          >
            <SettingsIcon className="w-4 h-4" />
            Settings
          </button>
        </div>

        {/* Info List */}
        <div className="mt-6 bg-bg-primary rounded-lg overflow-hidden">
          <div className="flex items-center gap-4 px-4 py-3.5 border-b border-border">
            <UserIcon className="w-5 h-5 text-text-muted flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-text-muted">Full Name</p>
              <p className="text-sm font-medium text-text-primary truncate">
                {user?.fullName || 'Not set'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 px-4 py-3.5 border-b border-border">
            <Hash className="w-5 h-5 text-text-muted flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-text-muted">Roll Number</p>
              <p className="text-sm font-medium text-text-primary truncate">
                {user?.rollNumber || 'Not set'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 px-4 py-3.5">
            <Mail className="w-5 h-5 text-text-muted flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-text-muted">Email</p>
              <p className="text-sm font-medium text-text-primary truncate">
                {user?.email}
              </p>
            </div>
          </div>
        </div>

        {/* Account Section */}
        <div className="mt-6">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2 px-1">
            Account
          </p>
          <div className="bg-bg-primary rounded-lg overflow-hidden">
            <button
              onClick={handleOpenSettings}
              className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-bg-muted transition-colors"
            >
              <SettingsIcon className="w-5 h-5 text-text-muted" />
              <span className="flex-1 text-left text-sm font-medium text-text-primary">
                Settings
              </span>
              <ChevronRight className="w-4 h-4 text-text-muted" />
            </button>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Logout - Text style at bottom */}
        <button
          onClick={handleLogout}
          className="w-full py-3 text-danger text-sm font-medium hover:text-danger/80 transition-colors mt-6"
        >
          <LogOut className="w-4 h-4 inline mr-2" />
          Logout
        </button>
      </div>

      {/* Edit Profile Bottom Sheet */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="w-full max-w-md bg-bg-primary rounded-t-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-text-primary">Edit Profile</h3>
              <button
                onClick={() => {
                  setFullName(user?.fullName || '');
                  setRollNumber(user?.rollNumber || '');
                  setIsEditing(false);
                }}
                className="p-2 rounded-full hover:bg-bg-muted transition-colors"
              >
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>

            <div className="space-y-4">
              <Input
                type="text"
                label="Full Name"
                value={fullName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
                fullWidth
              />
              <Input
                type="text"
                label="Roll Number"
                value={rollNumber}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRollNumber(e.target.value)}
                fullWidth
              />
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => {
                  setFullName(user?.fullName || '');
                  setRollNumber(user?.rollNumber || '');
                  setIsEditing(false);
                }}
                variant="secondary"
                fullWidth
              >
                Cancel
              </Button>
              <Button onClick={handleSave} variant="primary" fullWidth>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};
