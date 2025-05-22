import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "./button";

interface BackButtonProps {
  className?: string;
  onClick?: () => void;
}

export function BackButton({ className = "", onClick }: BackButtonProps) {
  const router = useRouter();

  // Custom navigation logic for consistent UX
  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    // Use pathname to determine where to go back to
    const prev = document.referrer;
    // Fallbacks for specific routes
    if (window.location.pathname.startsWith("/dashboard/workspaces")) {
      router.push("/dashboard");
    } else if (window.location.pathname.startsWith("/dashboard/spaces/")) {
      router.push("/dashboard/workspaces");
    } else if (window.location.pathname.startsWith("/dashboard")) {
      router.push("/"); // landing page
    } else {
      // Default: browser back
      router.back();
    }
  };

  return (
    <Button
      variant="ghost"
      className={`flex items-center gap-2 text-[#7B5EA7] dark:text-[#C7AFFF] hover:bg-[#7B5EA7]/10 dark:hover:bg-[#7B5EA7]/20 font-semibold transition-colors ${className}`}
      onClick={handleClick}
    >
      <ArrowLeft className="h-5 w-5" />
      Back
    </Button>
  );
}