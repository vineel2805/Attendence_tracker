import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
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

  useEffect(() => {
    const user = storage.getUser();
    setIsAuthenticated(!!user);
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/signup" element={<SignupScreen />} />
          
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