import React from 'react';
import { Moon, Sun, User } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Link } from 'react-router-dom';

interface AppBarProps {
  title: string;
  showProfile?: boolean;
  showThemeToggle?: boolean;
}

export const AppBar: React.FC<AppBarProps> = ({
  title,
  showProfile = true,
  showThemeToggle = true,
}) => {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-10 bg-bg-primary border-b border-border px-4 py-4">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
        
        <div className="flex items-center gap-3">
          {showThemeToggle && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg bg-bg-muted hover:bg-border transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-text-primary" />
              ) : (
                <Moon className="w-5 h-5 text-text-primary" />
              )}
            </button>
          )}
          
          {showProfile && (
            <Link
              to="/profile"
              className="p-2 rounded-lg bg-bg-muted hover:bg-border transition-colors"
              aria-label="Profile"
            >
              <User className="w-5 h-5 text-text-primary" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
