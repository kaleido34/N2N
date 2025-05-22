"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/auth-provider";
import { useSpaces } from "@/hooks/space-provider";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function DashboardPage() {
  const { isAuthenticated } = useAuth();
  const { loading } = useSpaces();
  const router = useRouter();

  // If not authenticated, redirect.
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/signin");
    }
    // Hide scrollbar on mount
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isAuthenticated, router]);

  // Show a loading state until we have spaces from the store.
  if (!isAuthenticated || loading) {
    return <p>Loading...</p>;
  }

  return (
    <>
      <div className="fixed top-6 right-6 z-50">
        <Button
          variant="ghost"
          className="text-[#7B5EA7] dark:text-[#C7AFFF] hover:bg-[#7B5EA7]/10"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>
    </>
  );
}
