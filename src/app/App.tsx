import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/utils/firebase';
import { firestoreService } from '@/utils/firestoreService';
import { LoginScreen } from './screens/LoginScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { AttendanceScreen } from './screens/AttendanceScreen';
import { TimetableScreen } from './screens/TimetableScreen';
import { PredictScreen } from './screens/PredictScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { ProfileSetupScreen } from './screens/ProfileSetupScreen';
import { SignupScreen } from './screens/SignupScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { CalendarScreen } from './screens/CalendarScreen';
import { ForgotPasswordScreen } from './screens/ForgotPasswordScreen';
import { VerifyEmailScreen } from './screens/VerifyEmailScreen';
import { storage } from '@/utils/storage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const user = storage.getUser();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.profileComplete && location.pathname !== '/profile/setup') {
    return <Navigate to="/profile/setup" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Listen to Firebase Auth state changes - this is the single source of truth
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[Auth] State changed:', firebaseUser?.uid || 'null');
      
      if (firebaseUser) {
        // Firebase has a valid session
        let localUser = storage.getUser();
        
        // Check if localStorage is out of sync with Firebase Auth
        if (!localUser || localUser.uid !== firebaseUser.uid) {
          console.log('[Auth] localStorage out of sync, fetching from Firestore...');
          try {
            const userData = await firestoreService.getUserDocument(firebaseUser.uid);
            
            if (userData) {
              storage.setUser(userData);
              await storage.syncFromCloud();
              console.log('[Auth] Synced user data from cloud');
            } else {
              // User exists in Auth but not in Firestore (edge case)
              // This can happen if signup was interrupted
              const newUser = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                emailVerified: firebaseUser.emailVerified,
                profileComplete: false,
              };
              storage.setUser(newUser);
              console.log('[Auth] Created local user from Firebase Auth');
            }
          } catch (error) {
            console.error('[Auth] Failed to sync from cloud:', error);
          }
        }
        
        setIsAuthenticated(true);
      } else {
        // No Firebase session - clear everything
        console.log('[Auth] No session, clearing local data');
        storage.clearAll();
        setIsAuthenticated(false);
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Show loading screen while checking auth state
  if (isLoading) {
    return (
      <ThemeProvider attribute="class" defaultTheme="light">
        <div className="min-h-screen bg-bg-primary flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-text-secondary text-sm">Loading...</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/signup" element={<SignupScreen />} />
          <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
          <Route path="/verify-email" element={<VerifyEmailScreen />} />
          
          <Route
            path="/profile/setup"
            element={
              <ProtectedRoute>
                <ProfileSetupScreen />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardScreen />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/attendance"
            element={
              <ProtectedRoute>
                <AttendanceScreen />
              </ProtectedRoute>
            }
          />

          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <CalendarScreen />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/timetable"
            element={
              <ProtectedRoute>
                <TimetableScreen />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/predict"
            element={
              <ProtectedRoute>
                <PredictScreen />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfileScreen />
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsScreen />
              </ProtectedRoute>
            }
          />
          
          <Route 
            path="/" 
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
        </Routes>
        <Toaster 
          position="top-center"
          toastOptions={{
            style: {
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
            },
          }}
        />
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;