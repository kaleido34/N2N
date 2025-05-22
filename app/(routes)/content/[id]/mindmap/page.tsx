"use client";

import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/auth-provider";
import * as go from "gojs";
import { ReactDiagram } from "gojs-react";
import axios from "axios";
import { useSpaces } from "@/hooks/space-provider";

interface MindMapData {
  nodes: {
    key: number;
    text: string;
    category?: string;
    parent?: number;
  }[];
  links: {
    from: number;
    to: number;
  }[];
}

export default function MindmapPage() {
  const router = useRouter();
  const { id } = useParams();
  const { user } = useAuth();
  const { spaces, loading } = useSpaces();
  const [mindMapData, setMindMapData] = useState<MindMapData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [youtube_id, setYoutubeId] = useState<string>("");
  const [content_id, setContentId] = useState<string>("");
  const [summary, setSummary] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Debug log at the top
  console.log('MindmapPage mount:', { token: user?.token, youtube_id, content_id, id });

  useEffect(() => {
    if (loading) return; // Wait for spaces to load
    for (const space of spaces) {
      const content = space.contents?.find(content => content.id === id);
      if (content) {
        setYoutubeId(content.youtube_id);
        setContentId(content.id);
        break;
      }
    }
  }, [spaces, id, loading]);

  useEffect(() => {
    console.log('MindmapPage effect:', { token: user?.token, youtube_id, content_id });
    const fetchMindMap = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await axios.get<{ data: MindMapData }>(
          `/api/spaces/generate/mindmap?video_id=${youtube_id}&content_id=${content_id}`,
          {
            headers: {
              authorization: user?.token
            }
          }
        );
        if (response.data) {
          setMindMapData(response.data.data);
          console.log('Mindmap API data:', response.data.data);
        }
      } catch (error) {
        setError("Failed to generate mindmap. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    if (youtube_id && content_id && user?.token) {
      fetchMindMap();
    }
  }, [youtube_id, content_id, user?.token]);

  // Fetch summary on mount
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await axios.get(`/api/spaces/generate/summary?video_id=${youtube_id}&content_id=${content_id}`, {
          headers: { authorization: user?.token }
        });
        if (response.data && response.data.data) {
          // Assume summary is a string or array of paragraphs
          const summaryData = response.data.data;
          setSummary(Array.isArray(summaryData) ? summaryData : summaryData.split('\n').filter(Boolean));
        }
      } catch (e) {
        setSummary(["Failed to load summary."]);
      }
    };
    if (youtube_id && content_id && user?.token) fetchSummary();
  }, [youtube_id, content_id, user?.token]);

  // Chat submit handler
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setChatMessages((prev) => [...prev, { role: "user", content: chatInput }]);
    setIsChatLoading(true);
    try {
      const response = await axios.post(`/api/spaces/generate/chat`, {
        video_id: youtube_id,
        content_id: content_id,
        message: chatInput
      }, {
        headers: { authorization: user?.token }
      });
      if (response.data && response.data.data) {
        setChatMessages((prev) => [...prev, { role: "assistant", content: response.data.data }]);
      }
    } catch (e) {
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Failed to get response from assistant." }]);
    } finally {
      setIsChatLoading(false);
      setChatInput("");
    }
  };

  function initDiagram() {
    const $ = go.GraphObject.make;
    const diagram = $(go.Diagram, {
      "undoManager.isEnabled": true,
      layout: $(go.TreeLayout, {
        angle: 90,
        layerSpacing: 35,
        alignment: go.TreeLayout.AlignmentStart
      }),
      model: $(go.GraphLinksModel, {
        linkKeyProperty: "key"
      })
    });
    const rootTemplate = $(go.Node, "Auto",
      $(go.Shape, "RoundedRectangle", { fill: "#5B4B8A", stroke: "black" }),
      $(go.TextBlock, { margin: 8, stroke: "white", font: "14px sans-serif" }, new go.Binding("text", "text"))
    );
    const sectionTemplate = $(go.Node, "Auto",
      $(go.Shape, "RoundedRectangle", { fill: "#7B5EA7", stroke: "black" }),
      $(go.TextBlock, { margin: 8, stroke: "white", font: "14px sans-serif" }, new go.Binding("text", "text"))
    );
    const topicTemplate = $(go.Node, "Auto",
      $(go.Shape, "RoundedRectangle", { fill: "#9C7BC0", stroke: "black" }),
      $(go.TextBlock, { margin: 8, stroke: "white", font: "14px sans-serif" }, new go.Binding("text", "text"))
    );
    diagram.nodeTemplateMap.add("root", rootTemplate);
    diagram.nodeTemplateMap.add("section", sectionTemplate);
    diagram.nodeTemplateMap.add("topic", topicTemplate);
    // Default template for nodes without a category
    diagram.nodeTemplate = $(go.Node, "Auto",
      $(go.Shape, "RoundedRectangle", { fill: "#BDBDBD", stroke: "black" }),
      $(go.TextBlock, { margin: 8, stroke: "black", font: "14px sans-serif" }, new go.Binding("text", "text"))
    );
    diagram.linkTemplate =
      $(go.Link,
        { routing: go.Link.Orthogonal },
        $(go.Shape, { strokeWidth: 1.5, stroke: "#5B4B8A" })
      );
    return diagram;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-12 px-4 bg-background">
      <div className="w-full max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold" style={{color: '#5B4B8A'}}>Mindmap</h1>
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              className="text-[#7B5EA7] dark:text-[#C7AFFF] hover:bg-[#7B5EA7]/10"
              onClick={() => router.push(`/content/${id}`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
        </div>
        {/* Mindmap Section Only */}
        <Card className="h-full flex flex-col p-6 min-h-0">
          <div className="relative flex-1 rounded-lg border bg-white dark:bg-white overflow-hidden" style={{ minHeight: 800 }}>
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-white/80">
                <div className="flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5B4B8A]"></div>
                  <p className="text-[#5B4B8A] font-medium">Generating mindmap...</p>
                </div>
              </div>
            ) : error ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-4">
                  <p className="text-red-500 mb-4">{error}</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setError(null);
                      setIsLoading(true);
                      if (youtube_id && content_id && user?.token) {
                        // Retry fetching
                        axios.get<{ data: MindMapData }>(
                          `/api/spaces/generate/mindmap?video_id=${youtube_id}&content_id=${content_id}`,
                          {
                            headers: {
                              authorization: user?.token
                            }
                          }
                        ).then(response => {
                          setMindMapData(response.data.data);
                          setIsLoading(false);
                        }).catch(() => {
                          setError("Failed to generate mindmap. Please try again.");
                          setIsLoading(false);
                        });
                      }
                    }}
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            ) : mindMapData ? (
              <ReactDiagram
                initDiagram={initDiagram}
                style={{ width: '100%', height: '800px', background: '#fff' }}
                nodeDataArray={mindMapData.nodes}
                linkDataArray={mindMapData.links}
              />
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
} 