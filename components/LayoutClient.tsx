'use client';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/header';
import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import React from 'react';
import { Toaster } from 'sonner';

const GlobalLoadingContext = createContext<{ show: boolean; setShow: (v: boolean) => void }>({ show: false, setShow: () => {} });

export function useGlobalLoading() {
  return useContext(GlobalLoadingContext);
}

function GlobalLoadingOverlay({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#FAF7F8]/95 dark:bg-gray-900/95 transition-all duration-200">
      <div className="flex flex-col items-center gap-6">
        <div className="animate-bounce">
          <img src="/logo.png" alt="Noise2Nectar Logo" width={80} height={80} className="rounded-2xl shadow-xl" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-extrabold text-[#7B5EA7] dark:text-[#C7AFFF] tracking-tight">Noise2Nectar</span>
          <span className="sr-only">Loading...</span>
        </div>
        <div className="mt-4">
          <span className="inline-block h-6 w-6 rounded-full border-4 border-[#7B5EA7] border-t-transparent animate-spin dark:border-[#C7AFFF] dark:border-t-transparent"></span>
        </div>
      </div>
    </div>
  );
}

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showHeader = pathname === "/";
  const [show, setShow] = useState(false);
  const prevPathRef = React.useRef(pathname);

  // Memoize the setShow function to prevent unnecessary re-renders
  const setShowMemoized = useCallback((value: boolean) => {
    setShow(value);
  }, []);

  // Handle loading overlay for route changes
  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;

      // Only show loading for major route changes, not content pages or workspace pages
      if (pathname !== '/' && !pathname.startsWith('/content/') && !pathname.startsWith('/dashboard/workspaces')) {
        setShow(true);

        // Use a very short timeout to reduce loading flashes
        const timer = setTimeout(() => {
          setShow(false);
        }, 150);

        return () => clearTimeout(timer);
      }
    }
  }, [pathname]);

  return (
    <GlobalLoadingContext.Provider value={{ show, setShow: setShowMemoized }}>
      <div className="flex min-h-screen flex-col">
        {showHeader && <Header />}
        <main className="flex-1">{children}</main>
      </div>
      <GlobalLoadingOverlay show={show} />
      <Toaster position="top-center" richColors closeButton />
    </GlobalLoadingContext.Provider>
  );
}