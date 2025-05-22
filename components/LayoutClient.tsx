'use client';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/header';
import { useState, useEffect, createContext, useContext } from 'react';
import React from 'react';

const GlobalLoadingContext = createContext<{ show: boolean; setShow: (v: boolean) => void }>({ show: false, setShow: () => {} });

export function useGlobalLoading() {
  return useContext(GlobalLoadingContext);
}

function GlobalLoadingOverlay({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/80 dark:bg-[#18132A]/80 transition-colors duration-300">
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
  const prevPath = React.useRef(pathname);

  // Show overlay for navigation only, no artificial delay
  useEffect(() => {
    if (prevPath.current !== pathname) {
      setShow(true);
      // Hide overlay immediately after path change (or you can debounce if needed)
      setTimeout(() => setShow(false), 0);
      prevPath.current = pathname;
    }
  }, [pathname]);

  return (
    <GlobalLoadingContext.Provider value={{ show, setShow }}>
      <GlobalLoadingOverlay show={show} />
      <div className="flex min-h-screen flex-col">
        {showHeader && <Header />}
        <main className="flex-1">{children}</main>
      </div>
    </GlobalLoadingContext.Provider>
  );
} 