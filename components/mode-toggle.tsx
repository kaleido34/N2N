"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function CustomThemeToggle({ className = "", onToggle }: { className?: string, onToggle?: () => void }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder that matches the light theme to prevent layout shift
    return (
      <div
        className={`flex items-center justify-center h-10 w-10 rounded-full border border-[#e5e5ef] bg-white/80 shadow-md transition-colors duration-300 ${className}`}
        aria-label="Loading theme toggle"
      >
        <Sun className="h-6 w-6 text-[#E5735A] transition-all duration-300" />
      </div>
    );
  }

  const handleClick = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
    if (onToggle) onToggle();
  };

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={handleClick}
      className={`flex items-center justify-center h-10 w-10 rounded-full border border-[#e5e5ef] bg-white/80 dark:bg-[#23223a]/80 shadow-md transition-colors duration-300 focus:outline-none hover:bg-[#f3f0ff] dark:hover:bg-[#23223a] ${className}`}
      aria-label="Toggle dark mode"
    >
      {isDark ? (
        <Moon className="h-6 w-6 text-[#7B5EA7] transition-all duration-300" />
      ) : (
        <Sun className="h-6 w-6 text-[#E5735A] transition-all duration-300" />
      )}
    </button>
  );
}

export function ThemeToggleButton({ className = "" }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder that matches the light theme to prevent layout shift
    return (
      <div
        className={`relative flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm transition-all duration-200 ${className}`}
        style={{ boxShadow: "0 2px 8px 0 rgba(229, 140, 90, 0.08)" }}
      >
        <Sun className="h-5 w-5 text-[#E58C5A]" />
      </div>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`relative flex h-9 w-9 items-center justify-center rounded-full bg-white dark:bg-[#18132A] shadow-sm hover:bg-[#E0F2F1] dark:hover:bg-[#E0F2F1]/20 transition-all duration-200 ${className}`}
      style={{ boxShadow: "0 2px 8px 0 rgba(229, 140, 90, 0.08)" }}
    >
      {isDark ? (
        <Moon className="h-5 w-5 text-[#E58C5A]" />
      ) : (
        <Sun className="h-5 w-5 text-[#E58C5A]" />
      )}
    </button>
  );
}
