/**
 * LUNA.FM — Centralized Theme Context & Provider
 * Manages active theme state, DOM attribute synchronization, meta theme-color,
 * and localStorage persistence with zero-flash fallback resilience.
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { ThemeContextValue, ThemeId } from './types';
import {
  AVAILABLE_THEMES,
  DEFAULT_THEME_ID,
  THEME_STORAGE_KEY,
  getThemeDefinition,
  isValidThemeId,
} from './definitions';

export const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Synchronously determine the initial theme ID before initial React render.
 * Priority order:
 * 1. Synchronously pre-rendered `data-theme` attribute on <html> set by index.html
 * 2. Persisted value in `localStorage['luna-fm-theme']`
 * 3. Default fallback: 'nocturne'
 */
function getInitialTheme(): ThemeId {
  try {
    if (typeof document !== 'undefined') {
      const domTheme = document.documentElement.getAttribute('data-theme');
      if (isValidThemeId(domTheme)) {
        return domTheme;
      }
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (isValidThemeId(saved)) {
        return saved;
      }
    }
  } catch (err) {
    // Gracefully handle storage quota or security exceptions in restricted contexts
    console.warn('[LUNA.FM] Storage access restricted, falling back to default theme:', err);
  }
  return DEFAULT_THEME_ID;
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeId>(getInitialTheme);

  const themeDefinition = useMemo(() => getThemeDefinition(theme), [theme]);

  // Synchronize DOM attributes, meta tags, and localStorage when theme changes
  useEffect(() => {
    try {
      // 1. Synchronize data-theme on <html>
      document.documentElement.setAttribute('data-theme', theme);

      // 2. Synchronize <meta name="theme-color">
      let metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta');
        metaThemeColor.setAttribute('name', 'theme-color');
        document.head.appendChild(metaThemeColor);
      }
      metaThemeColor.setAttribute('content', themeDefinition.colors.surfaceBase);

      // 3. Persist to localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
      }
    } catch (err) {
      console.warn('[LUNA.FM] Failed to persist theme:', err);
    }
  }, [theme, themeDefinition]);

  // Listen for storage events across browser tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY && isValidThemeId(e.newValue)) {
        setThemeState(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const setTheme = useCallback((newTheme: ThemeId) => {
    if (isValidThemeId(newTheme)) {
      setThemeState(newTheme);
    } else {
      console.warn(`[LUNA.FM] Attempted to set invalid theme: ${newTheme}`);
    }
  }, []);

  const contextValue = useMemo<ThemeContextValue>(() => ({
    theme,
    themeDefinition,
    setTheme,
    availableThemes: AVAILABLE_THEMES,
  }), [theme, themeDefinition, setTheme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to consume theme context across application components.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
