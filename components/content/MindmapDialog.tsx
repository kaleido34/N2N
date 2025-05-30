"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import * as go from "gojs";
import { ReactDiagram } from "gojs-react";

interface MindmapDialogProps {
  mindmapData: any;
  mindmapLoading: boolean;
  contentId?: string;
  youtubeId?: string;
}

export function MindmapDialog({ mindmapData, mindmapLoading, contentId, youtubeId }: MindmapDialogProps) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  
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
    
    // Default template for nodes without a category
    diagram.nodeTemplate = $(go.Node, "Auto",
      $(go.Shape, "RoundedRectangle", { fill: "#BDBDBD", stroke: "black" }),
      $(go.TextBlock, { margin: 8, stroke: "black", font: "14px sans-serif" }, new go.Binding("text", "text"))
    );

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="w-full justify-start pl-2 pr-6 font-semibold bg-transparent hover:bg-[#E58C5A]/20 dark:hover:bg-[#E58C5A]/30 text-[#232323] dark:text-white shadow-none rounded-lg my-1 transition-colors group flex items-center h-12">
          <div className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-gradient-to-br from-purple-400 to-[#7B5EA7] mr-3 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-white">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          Create Mindmap
        </button>
      </DialogTrigger>
      <DialogContent style={{ maxWidth: expanded ? '1400px' : '650px', maxHeight: '450px' }} className={`p-0 bg-[#FAF7F8] dark:bg-gray-900 flex flex-col`}>
        <div className="flex-1 flex flex-col h-full">
          <div className="flex items-center gap-3 p-4 border-b">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-400 to-[#7B5EA7] flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-white">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
            <DialogTitle className="text-xl font-semibold text-[#5B4B8A]">Create Mindmap</DialogTitle>
          </div>
          <div className="flex-1 p-6 pb-0">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
              <div className="overflow-auto" style={{ height: '320px', width: '100%' }}>
                <div className="relative flex-1 rounded-lg bg-white dark:bg-white overflow-hidden" style={{ minHeight: expanded ? 400 : 300, width: expanded ? '1300px' : '600px' }}>
                  {mindmapLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-white/80">
                      <div className="flex flex-col items-center gap-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5B4B8A]"></div>
                        <p className="text-[#5B4B8A] font-medium">Generating mindmap...</p>
                      </div>
                    </div>
                  ) : mindmapData ? (
                    <ReactDiagram
                      initDiagram={initDiagram}
                      divClassName="diagram-component h-full w-full"
                      nodeDataArray={mindmapData.nodes}
                      linkDataArray={mindmapData.links}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p>No mindmap data available.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-center py-3 border-t bg-[#FAF7F8] dark:bg-gray-900 z-10">
            <Button 
              onClick={() => {
                setExpanded(!expanded);
                // Force reflow to ensure styles are applied
                setTimeout(() => {
                  window.dispatchEvent(new Event('resize'));
                }, 50);
              }}
              className="w-full max-w-[180px] px-4 py-2 bg-[#5B4B8A] hover:bg-[#4a3d70] text-white flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              {expanded ? 'Collapse Mindmap' : 'Expand Mindmap'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
