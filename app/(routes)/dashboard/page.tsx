"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/auth-provider";
import { useSpaces } from "@/hooks/space-provider";


import { ContentForm } from "@/components/dashboard/ContentForm";
import { BackButton } from "@/components/ui/back-button";

export default function DashboardPage() {
  const { isAuthenticated } = useAuth();
  const { loading } = useSpaces();
  const [minimized, setMinimized] = useState(false);

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


  // Show a loading state until we have spaces from the store.
  if (!isAuthenticated) {
    return <p>Loading...</p>;
  }

  return (
    <main className="relative min-h-screen w-full bg-transparent">
      <BackButton onClick={() => router.push("/")} className="absolute top-8 right-8" />
      <div className="flex flex-col items-center justify-center min-h-screen w-full">
        <h1 className="text-7xl font-extrabold text-center mb-10 text-[#5B4B8A] dark:text-white leading-none whitespace-nowrap">
          What are you learning today?
        </h1>
        <ContentForm />
      </div>
    </main>
  );
}