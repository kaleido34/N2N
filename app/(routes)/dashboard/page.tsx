"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";


import { ContentForm } from "@/components/dashboard/ContentForm";
import { BackButton } from "@/components/ui/back-button";

export default function DashboardPage() {
  const router = useRouter();

  // Use CSS class instead of direct DOM manipulation
  useEffect(() => {
    // Add the class to the body when component mounts
    document.body.classList.add('dashboard-page');
    
    // Remove the class when component unmounts
    return () => {
      document.body.classList.remove('dashboard-page');
    };
  }, []); // Empty dependency array means this runs once on mount and cleanup on unmount

  return (
    <main className="relative min-h-screen w-full bg-[#FAF7F8] dark:bg-gray-900 overflow-hidden">
      {/* Decorative Ribbons */}
      <div className="ribbon ribbon-1"></div>
      <div className="ribbon ribbon-2"></div>
      <div className="ribbon ribbon-3"></div>
      <div className="ribbon ribbon-4"></div>
      
      <BackButton onClick={() => router.push("/")} className="absolute top-8 right-8 z-50" />
      <div className="relative flex flex-col items-center justify-center min-h-screen w-full z-10">
        <h1 className="text-7xl font-extrabold text-center mb-10 text-[#5B4B8A] dark:text-white leading-none whitespace-nowrap">
          What are you learning today?
        </h1>
        <ContentForm />
      </div>
    </main>
  );
}