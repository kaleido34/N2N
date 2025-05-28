"use client";

import { TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSpaces } from "@/hooks/space-provider";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "@/hooks/auth-provider";
import Markdown from "@/components/markdown";

interface SummaryTabProps {
  value: string;
  activeMainTab: string;
}

export default function SummaryTab({
  value,
  activeMainTab,
}: SummaryTabProps) {
  const { id } = useParams();
  const { spaces } = useSpaces();
  const [isLoading, setIsLoading] = useState(false);
  const [youtube_id, setYoutubeId] = useState<string>("");
  const [content_id, setContentId] = useState<string>("");
  const [summaryData, setSummaryData] = useState("");
  const { user } = useAuth();

  // Effect 1: Set youtube_id and content_id from spaces/id
  useEffect(() => {
    for (const space of spaces) {
      const content = space.contents?.find(content => content.id === id);
      if (content) {
        setYoutubeId(content.youtube_id || "");
        setContentId(content.id);
        break;
      }
    }
  }, [spaces, id]);

  // Effect 2: Fetch summary when IDs are set
  useEffect(() => {
    if (!youtube_id || !content_id || !user?.token) return;
    setIsLoading(true);
    async function fetchData() {
      try {
        const response = await axios.get(`/api/spaces/generate/summary?video_id=${youtube_id}&content_id=${content_id}`, {
          headers: {
            authorization: user?.token
          }
        });
        if (response?.data) {
          // @ts-expect-error response.data.data type is unknown
          setSummaryData(response?.data?.data);
        }
      } catch (error) {
        // REMOVE noisy debug logs
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [youtube_id, content_id, user?.token]);

  return (
    <TabsContent value={value} className="flex-1 min-h-0 overflow-hidden mt-4">
      {activeMainTab === value && (
        <Card className="h-full flex flex-col min-h-0">
          <ScrollArea className="p-6 flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {summaryData && <Markdown content={summaryData} />}
              </div>
            )}
          </ScrollArea>
        </Card>
      )}
    </TabsContent>
  );
}
