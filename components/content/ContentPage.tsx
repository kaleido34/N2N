"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/auth-provider";
import LeftPanel from "./LeftPanel";
import RightSidebar from "./RightSidebar";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface ContentPageProps {
  id: string; // from useParams
}

interface ContentData {
  id: string;
  title: string;
  summary: string[];
  content?: string;
  youtube_url?: string;
  created_at?: string;
}

export default function ContentPage({ id }: ContentPageProps) {
  const { user } = useAuth();
  const [content, setContent] = useState<ContentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch content when component mounts
  useEffect(() => {
    if (user?.token) {
      fetchContent();
    }
  }, [id, user]);

  // Fetch content from API
  const fetchContent = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/contents?id=${id}`, {
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
      });
      
      if (!res.ok) {
        throw new Error('Failed to load content');
      }
      
      const data = await res.json();
      // Ensure summary is an array
      if (data.summary && !Array.isArray(data.summary)) {
        data.summary = [data.summary];
      }
      setContent(data);
    } catch (err) {
      console.error('Error fetching content:', err);
      setError('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen={true} />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!content) {
    return <div className="p-8">Content not found</div>;
  }

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden">
      {/* Main Content */}
      <div className="flex-1">
        <main className="py-5 px-6 md:px-8 max-w-6xl">
          {content && (
            <>
              <LeftPanel 
                id={content.id}
                title={content.title}
                summary={content.summary || []}
              />
              
              {content.youtube_url && (
                <div className="mt-10 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
                  <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Video</h2>
                  <div className="aspect-w-16 aspect-h-9">
                    <iframe
                      src={`https://www.youtube.com/embed/${content.youtube_url}`}
                      className="w-full h-[500px] rounded-lg"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
      
      {/* Right Sidebar */}
      <div className="hidden lg:block">
        <RightSidebar />
      </div>
    </div>
  );
}
