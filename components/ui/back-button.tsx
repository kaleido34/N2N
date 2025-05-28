import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface BackButtonProps {
  onClick?: () => void;
  className?: string;
}

export function BackButton({ onClick, className = "" }: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    router.back();
  };

  return (
    <button
      className={`flex items-center gap-2 text-[#7B5EA7] dark:text-[#C7AFFF] hover:text-[#E5735A] dark:hover:text-[#E58C5A] font-semibold transition-colors z-10 ${className}`}
      onClick={handleClick}
      type="button"
    >
      <ArrowLeft className="h-5 w-5" />
      Back
    </button>
  );
}