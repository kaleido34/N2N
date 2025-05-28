"use client";

import { useParams } from "next/navigation";
import ContentPage from "@/components/content/ContentPage";

export default function Page() {
  const { id } = useParams();

  return (
    <div className="min-h-screen bg-[#FAF7F8] dark:bg-gray-900">
      <ContentPage id={id as string} />
    </div>
  );
}

// This tells Next.js to not use the root layout
Page.getLayout = function getLayout(page: React.ReactNode) {
  return page;
};
