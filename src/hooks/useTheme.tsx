import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "dark" | "light" | "system";

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

/**
 * Default initial state for ThemeProvider context
 */
const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
};

/** Context for theme management */
const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

/**
 * Theme provider component that manages light/dark/system themes
 * @param {{ children: React.ReactNode, defaultTheme?: Theme, storageKey?: string, [key: string]: any }} props
 * @param {React.ReactNode} props.children - Child components to wrap with theme context
 * @param {Theme} [props.defaultTheme="system"] - Default theme if none found in storage
 * @param {string} [props.storageKey="vite-ui-theme"] - Storage key for persisting theme preference
 * @returns {JSX.Element} ThemeProvider context wrapper
 */
export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
}: ThemeProviderProps) {
  // Initialize theme from localStorage or default
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );

  // Apply theme changes to document element
  useEffect(() => {
    const root = window.document.documentElement;

    // Remove any existing theme classes
    root.classList.remove("light", "dark");

    if (theme === "system") {
      // Respect system preference when theme is set to system
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";

      root.classList.add(systemTheme);
      return;
    }

    // Apply selected theme
    root.classList.add(theme);
  }, [theme]);

  // Value object for context provider
  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setThemeState(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

/**
 * Hook to access theme context
 * @returns {ThemeProviderState} Current theme state and setter function
 * @throws {Error} If hook is used outside of ThemeProvider
 */
export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
