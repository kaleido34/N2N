import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="fixed inset-0 min-h-screen w-full flex items-center justify-center bg-[#F3F0FF] dark:bg-[#18132A] overflow-hidden">
      {/* Return to Home Button styled like BackButton */}
      <div className="absolute top-8 left-8 z-10">
        <Link
          href="/"
          className="flex items-center gap-2 text-[#7B5EA7] dark:text-[#C7AFFF] hover:text-[#E5735A] dark:hover:text-[#E58C5A] font-semibold transition-colors text-lg px-4 py-2 rounded-lg bg-transparent"
        >
          <ArrowLeft className="h-6 w-6" />
          Return Home
        </Link>
      </div>
      <div className="w-full max-w-2xl mx-auto rounded-3xl p-14 flex flex-col items-center bg-transparent -mt-10">
        <h1 className="text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#E5735A] to-[#7B5EA7] mb-2">
          404
        </h1>
        <h2 className="text-3xl font-semibold text-[#7B5EA7] dark:text-[#C7AFFF] mb-8">
          Oops! Page not found
        </h2>
        <div className="w-full flex justify-center mb-8">
          <div
            className="rounded-2xl overflow-hidden bg-[#F9BFC2] p-6 flex items-center justify-center"
            style={{ minHeight: 340, minWidth: 400 }}
          >
            <Image
              src="/capybara GIF.gif"
              alt="404 capybara gif"
              width={400}
              height={300}
              className="rounded-xl object-contain"
              priority
            />
          </div>
        </div>
        <p className="text-center text-[#232323] dark:text-[#C7AFFF]/80 text-lg max-w-xl mb-2">
          The page you're looking for might have been removed, renamed, or doesn't
          exist.
        </p>
      </div>
    </div>
  );
}
