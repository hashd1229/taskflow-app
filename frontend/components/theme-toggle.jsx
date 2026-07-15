'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/lib/theme-context';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className, size = 'default' }) {
  const { theme, toggleTheme, mounted } = useTheme();
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  if (!mounted) {
    return (
      <div
        className={cn(
          'inline-flex items-center justify-center rounded-lg border border-border bg-transparent',
          size === 'sm' ? 'w-8 h-8' : 'w-9 h-9',
          className
        )}
      />
    );
  }

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className={cn(
        'inline-flex items-center justify-center rounded-lg border border-border bg-transparent hover:bg-muted transition-colors duration-200',
        size === 'sm' ? 'w-8 h-8' : 'w-9 h-9',
        className
      )}
    >
      {theme === 'dark' ? (
        <Sun className={cn(iconSize, 'text-amber-400')} />
      ) : (
        <Moon className={cn(iconSize, 'text-muted-foreground')} />
      )}
    </button>
  );
}
