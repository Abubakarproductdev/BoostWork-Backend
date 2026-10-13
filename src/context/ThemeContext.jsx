import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'bw-theme';
const MODES = ['light', 'dark', 'system'];

// Chart colours (SVG can't read CSS variables reliably). Keep in sync with src/index.css.
const PALETTES = {
  light: {
    ember: '#ffce1b', flamingo: '#ffce1b', ultraviolet: '#069594', lagoon: '#069594', sunbeam: '#ffce1b', sky: '#069594', danger: '#c62828',
    ink: '#000000', ink2: '#4f4b42', ink3: '#8a8476', line: '#e7decb', surface: '#fbf6ea', surface2: '#f1e9d7',
  },
  dark: {
    ember: '#ffce1b', flamingo: '#ffce1b', ultraviolet: '#069594', lagoon: '#069594', sunbeam: '#ffce1b', sky: '#069594', danger: '#ff5a5a',
    ink: '#f7f1e3', ink2: '#b5ae9e', ink3: '#7a7468', line: '#262626', surface: '#000000', surface2: '#000000',
  },
};

const systemPrefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

const readSaved = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return MODES.includes(saved) ? saved : 'system';
  } catch {
    return 'system';
  }
};

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(readSaved);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);
  const resolved = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event) => setSystemDark(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Storage can be unavailable (private mode); the theme still applies for this visit.
    }
  }, [mode, resolved]);

  const value = useMemo(() => ({
    mode,
    resolved,
    palette: PALETTES[resolved],
    setMode,
    cycle: () => setMode((current) => MODES[(MODES.indexOf(current) + 1) % MODES.length]),
  }), [mode, resolved]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
