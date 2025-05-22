import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "./button";

interface BackButtonProps {
  className?: string;
  onClick?: () => void;
}

export function BackButton({ className = "", onClick }: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.back();
    }
  };

  return (
    <Button
      variant="ghost"
      className={`flex items-center gap-2 text-[#7B5EA7] dark:text-[#C7AFFF] hover:text-[#E5735A] dark:hover:text-[#E58C5A] font-semibold transition-colors ${className}`}
      onClick={handleClick}
    >
      <ArrowLeft className="h-5 w-5" />
      Back
    </Button>
  );
} 