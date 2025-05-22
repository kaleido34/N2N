"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function CustomThemeToggle({ className = "", onToggle }: { className?: string, onToggle?: () => void }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const handleClick = () => {
    setTheme(theme === "dark" ? "light" : "dark");
    if (onToggle) onToggle();
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center justify-center h-10 w-10 rounded-full border border-[#e5e5ef] bg-white/80 dark:bg-[#23223a]/80 shadow-md transition-colors duration-300 focus:outline-none hover:bg-[#f3f0ff] dark:hover:bg-[#23223a] ${className}`}
      aria-label="Toggle dark mode"
    >
      {theme === "dark" ? (
        <Moon className="h-6 w-6 text-[#7B5EA7] transition-all duration-300" />
      ) : (
        <Sun className="h-6 w-6 text-[#E5735A] transition-all duration-300" />
      )}
    </button>
  );
}
