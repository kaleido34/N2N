"use client";

import { TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";
import * as go from "gojs";
import { ReactDiagram } from "gojs-react";
import { useSpaces } from "@/hooks/space-provider";
import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/auth-provider";
import axios from "axios";
import { Button } from "@/components/ui/button";

interface MindMapTabProps {
  value: string;
  activeMainTab: string;
}

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

interface MindMapResponse {
  data: MindMapData;
}

export default function MindMapTab({
  value,
  activeMainTab,
}: MindMapTabProps) {
  console.log('MindMapTab mounted', { value, activeMainTab });
  const [mindMapData, setMindMapData] = useState<MindMapData | null>(null);
  const [youtube_id, setYoutubeId] = useState<string>("");
  const [content_id, setContentId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { id } = useParams();
  const { spaces } = useSpaces();
  const { user } = useAuth();

  const fetchMindMap = async () => {
    console.log("Fetching mindmap", youtube_id, content_id);
    try {
      setIsLoading(true);
      setError(null);
      const response = await axios.get<MindMapResponse>(
        `/api/spaces/generate/mindmap?video_id=${youtube_id}&content_id=${content_id}`,
        {
          headers: {
            Authorization: user?.token ? `Bearer ${user.token}` : ""
          }
        }
      );
      if (response.data) {
        setMindMapData(response.data.data);
        console.log("Mindmap API data:", response.data.data);
      }
    } catch (error) {
      console.error("Error fetching mindmap:", error);
      setError("Failed to generate mindmap. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    console.log('Spaces:', spaces, 'id:', id);
    // Find the content across all spaces
    for (const space of spaces) {
      const content = space.contents?.find(content => content.id === id);
      if (content) {
        setYoutubeId(content.youtube_id);
        setContentId(content.id);
        break;
      }
    }
  }, [spaces, id]);

  useEffect(() => {
    if (youtube_id && content_id) {
      fetchMindMap();
    }
  }, [youtube_id, content_id, user?.token]);

  // Initialize the diagram
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
 
    // @ts-expect-error diagram.background type is unknown
    diagram.background = "white";

    // Define node templates for different categories
    const rootTemplate = $(go.Node, "Auto",
      $(go.Shape, "RoundedRectangle", { 
        fill: "#5B4B8A",
        stroke: "black" 
      }),
      $(go.TextBlock, { 
        margin: 8, 
        stroke: "white",
        font: "14px sans-serif"
      },
        new go.Binding("text", "text"))
    );

    const sectionTemplate = $(go.Node, "Auto",
      $(go.Shape, "RoundedRectangle", { 
        fill: "#7B5EA7",
        stroke: "black"
      }),
      $(go.TextBlock, { 
        margin: 8,
        stroke: "white",
        font: "14px sans-serif"
      },
        new go.Binding("text", "text"))
    );

    const topicTemplate = $(go.Node, "Auto",
      $(go.Shape, "RoundedRectangle", { 
        fill: "#9C7BC0",
        stroke: "black"
      }),
      $(go.TextBlock, { 
        margin: 8,
        stroke: "white",
        font: "14px sans-serif"
      },
        new go.Binding("text", "text"))
    );

    diagram.nodeTemplateMap.add("root", rootTemplate);
    diagram.nodeTemplateMap.add("section", sectionTemplate);
    diagram.nodeTemplateMap.add("topic", topicTemplate);

    diagram.linkTemplate =
      $(go.Link,
        { routing: go.Link.Orthogonal },
        $(go.Shape, { 
          strokeWidth: 1.5,
          stroke: "#5B4B8A"
        })
      );

    return diagram;
  }

  // Dummy mindmap for testing rendering
  const dummyMindMap: MindMapData = {
    nodes: [
      { key: 1, text: "Main Topic", category: "root" },
      { key: 2, text: "Subtopic 1", category: "section" },
      { key: 3, text: "Subtopic 2", category: "section" },
      { key: 4, text: "Detail A", category: "topic" },
      { key: 5, text: "Detail B", category: "topic" }
    ],
    links: [
      { from: 1, to: 2 },
      { from: 1, to: 3 },
      { from: 2, to: 4 },
      { from: 3, to: 5 }
    ]
  };

  return (
    <TabsContent value={value} className="flex-1 min-h-0 overflow-hidden mt-4" suppressHydrationWarning>
      {activeMainTab === value && (
        <Card className="h-full flex flex-col p-6 min-h-0">
          <div className="relative flex-1 rounded-lg border bg-white dark:bg-white overflow-hidden" style={{ minHeight: 400, border: '2px solid red' }}>
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
                      // Retry fetching
                      if (youtube_id && content_id) {
                        fetchMindMap();
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
                divClassName="diagram-component h-full w-full"
                nodeDataArray={mindMapData.nodes}
                linkDataArray={mindMapData.links}
              />
            ) : (
              <div style={{ minHeight: 400, border: '2px solid red' }}>
                <ReactDiagram
                  initDiagram={initDiagram}
                  divClassName="diagram-component h-full w-full"
                  nodeDataArray={dummyMindMap.nodes}
                  linkDataArray={dummyMindMap.links}
                />
              </div>
            )}
          </div>
        </Card>
      )}
    </TabsContent>
  );
}
