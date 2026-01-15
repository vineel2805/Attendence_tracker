import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar } from '@/app/components/AppBar';
import { BottomNav } from '@/app/components/BottomNav';
import { Input } from '@/app/components/Input';
import { Button } from '@/app/components/Button';
import { LogOut, Mail, User as UserIcon, Hash, Settings as SettingsIcon } from 'lucide-react';
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
      
      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Profile Card */}
        <div className="bg-bg-primary p-6 rounded-[10px] border border-border">
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-bg-muted flex items-center justify-center">
              <UserIcon className="w-10 h-10 text-text-muted" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <UserIcon className="w-5 h-5 text-text-muted mt-3" />
              {isEditing ? (
                <Input
                  type="text"
                  label="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  fullWidth
                />
              ) : (
                <div className="flex-1">
                  <p className="text-sm text-text-muted">Full Name</p>
                  <p className="text-base font-medium text-text-primary mt-1">
                    {user?.fullName || 'Not set'}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-start gap-3">
              <Hash className="w-5 h-5 text-text-muted mt-3" />
              {isEditing ? (
                <Input
                  type="text"
                  label="Roll Number"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  fullWidth
                />
              ) : (
                <div className="flex-1">
                  <p className="text-sm text-text-muted">Roll Number</p>
                  <p className="text-base font-medium text-text-primary mt-1">
                    {user?.rollNumber || 'Not set'}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-text-muted mt-3" />
              <div className="flex-1">
                <p className="text-sm text-text-muted">Email</p>
                <p className="text-base font-medium text-text-primary mt-1">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {isEditing ? (
              <>
                <Button onClick={handleSave} variant="primary" fullWidth>
                  Save Changes
                </Button>
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
              </>
            ) : (
              <div className="space-y-3">
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="secondary"
                  fullWidth
                >
                  Edit Profile
                </Button>
                <Button
                  onClick={handleOpenSettings}
                  variant="secondary"
                  fullWidth
                >
                  