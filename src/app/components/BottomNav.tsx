import React from 'react';
import { Home, Calendar, BarChart3, TrendingUp } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export const BottomNav: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/attendance', icon: Calendar, label: 'Attendance' },
    { path: '/timetable', icon: BarChart3, label: 'Timetable' },
    { path: '/predict', icon: TrendingUp, label: 'Predict' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-bg-primary border-t border-border">
      <div className="max-w-md mx-auto flex items-center justify-around px-2 py-2">
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 py-2 px-4 rounded-lg transition-colors ${
                isActive ? 'bg-bg-muted' : 'hover:bg-bg-muted/50'
              }`}
            >
              <Icon 
                className={`w-5 h-5 ${
                  isActive ? 'text-text-primary' : 'text-text-muted'
                }`}
              />
              <span className={`text-xs font-medium ${
                isActive ? 'text-text-primary' : 'text-text-muted'
              }`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
