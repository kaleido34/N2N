"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export default function Loading() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!show) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-[#18132A] transition-colors duration-300">
        <div className="flex flex-col items-center gap-6">
          <div className="animate-bounce">
            <Image src="/logo.png" alt="Noise2Nectar Logo" width={80} height={80} className="rounded-2xl shadow-xl" />
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
  return null;
} 