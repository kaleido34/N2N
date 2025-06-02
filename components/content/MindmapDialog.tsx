"use client";

import React, { useState, useEffect } from 'react';
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
        layerSpacing: 50, // Further increased spacing
        nodeSpacing: 25, // Increased node spacing
        alignment: go.TreeLayout.AlignmentStart,
        compaction: go.TreeLayout.CompactionNone, // Prevents tight packing
        breadthLimit: 1000, // Limit how broad the tree can be
        setsPortSpot: false // Don't set port spots automatically
      }),
      // Allow vertical scrolling for larger mindmaps
      "allowVerticalScroll": true,
      "scrollMargin": 50, // Add margin around the content
      "padding": new go.Margin(80, 50, 20, 50), // Increased top padding to move diagram down
      "grid.visible": true, // Show grid
      "grid.gridCellSize": new go.Size(10, 10), // Grid size
      "grid.opacity": 0.1, // Subtle grid
      model: $(go.GraphLinksModel, {
        linkKeyProperty: "key"
      })
    });
 
    // @ts-expect-error diagram.background type is unknown
    diagram.background = "#FAF7F8"; // Match dialog background

    // Define node templates with enhanced styling and app theme colors
    const rootTemplate = $(go.Node, "Auto",
      { shadowOffset: new go.Point(2, 2), shadowBlur: 3, shadowColor: "rgba(0,0,0,0.2)" },
      $(go.Shape, "RoundedRectangle", { 
        fill: "#5B4B8A", // Primary theme color
        stroke: "#483876",
        strokeWidth: 2,
        portId: "",
        fromLinkable: true,
        toLinkable: true,
        cursor: "pointer",
        // Use minSize instead of fixed size to allow expansion
        minSize: new go.Size(180, 44),
        // Add padding inside the shape to prevent text from being too close to edges
        margin: 8
      }),
      $(go.TextBlock, { 
        margin: 10,
        stroke: "white",
        font: "bold 15px sans-serif", // Bolder and larger text
        wrap: go.TextBlock.WrapFit, // Changed to WrapFit for better text fitting
        alignment: go.Spot.Center, // Center alignment
        editable: false, // Prevent editing
        maxLines: 3, // Limit to 3 lines max
        overflow: go.TextBlock.OverflowEllipsis, // Show ellipsis for overflow
        textAlign: "center" // Center text alignment
      },
        new go.Binding("text", "text"))
    );

    const sectionTemplate = $(go.Node, "Auto",
      { shadowOffset: new go.Point(1, 1), shadowBlur: 2, shadowColor: "rgba(0,0,0,0.15)" },
      $(go.Shape, "RoundedRectangle", { 
        fill: "#E58C5A", // Orange theme color
        stroke: "#D07745",
        strokeWidth: 1.5,
        portId: "",
        fromLinkable: true,
        toLinkable: true,
        cursor: "pointer",
        minSize: new go.Size(160, 38), // Min size instead of fixed size
        margin: 6 // Internal margin
      }),
      $(go.TextBlock, { 
        margin: 8,
        stroke: "white",
        font: "600 14px sans-serif", // Use CSS font shorthand: weight, size, family
        wrap: go.TextBlock.WrapFit, // Better text wrapping
        alignment: go.Spot.Center,
        editable: false,
        maxLines: 2, // Limit to 2 lines max
        overflow: go.TextBlock.OverflowEllipsis,
        textAlign: "center"
      },
        new go.Binding("text", "text"))
    );

    const topicTemplate = $(go.Node, "Auto",
      { shadowOffset: new go.Point(1, 1), shadowBlur: 1, shadowColor: "rgba(0,0,0,0.1)" },
      $(go.Shape, "RoundedRectangle", { 
        fill: "#7B5EA7", // Purple theme color
        stroke: "#6A4F91",
        strokeWidth: 1.5,
        portId: "",
        fromLinkable: true,
        toLinkable: true,
        cursor: "pointer",
        minSize: new go.Size(150, 34), // Min size instead of fixed size
        margin: 5 // Internal margin
      }),
      $(go.TextBlock, { 
        margin: 6,
        stroke: "white",
        font: "500 14px sans-serif", // Medium weight for topic nodes
        wrap: go.TextBlock.WrapFit, // Better text wrapping
        alignment: go.Spot.Center,
        editable: false,
        maxLines: 2, // Limit to 2 lines max
        overflow: go.TextBlock.OverflowEllipsis,
        textAlign: "center"
      },
        new go.Binding("text", "text"))
    );

    diagram.nodeTemplateMap.add("root", rootTemplate);
    diagram.nodeTemplateMap.add("section", sectionTemplate);
    diagram.nodeTemplateMap.add("topic", topicTemplate);
    
    // Default template for nodes without a category
    diagram.nodeTemplate = $(go.Node, "Auto",
      { shadowOffset: new go.Point(1, 1), shadowBlur: 1, shadowColor: "rgba(0,0,0,0.1)" },
      $(go.Shape, "RoundedRectangle", { 
        fill: "#9C7BC0", // Light purple
        stroke: "#8A6AAA",
        strokeWidth: 1,
        portId: "",
        fromLinkable: true,
        toLinkable: true,
        cursor: "pointer",
        minSize: new go.Size(140, 32), // Min size instead of fixed size
        margin: 4 // Internal margin
      }),
      $(go.TextBlock, { 
        margin: 6, 
        stroke: "white", 
        font: "400 14px sans-serif", // Regular weight for default nodes
        wrap: go.TextBlock.WrapFit, // Better text wrapping
        alignment: go.Spot.Center,
        editable: false,
        maxLines: 2, // Limit to 2 lines
        overflow: go.TextBlock.OverflowEllipsis,
        textAlign: "center"
      }, 
        new go.Binding("text", "text"))
    );

    // Enhanced link template with curved corners and animation
    diagram.linkTemplate =
      $(go.Link,
        { 
          routing: go.Link.AvoidsNodes, // More natural routing
          corner: 10, // Rounded corners
          curve: go.Link.JumpOver, // Jump over other links
          reshapable: false, // Prevent reshaping
          resegmentable: false, // Prevent resegmenting
          // Animation effect when appearing
          opacity: 0
        },
        // Use animation state through binding
        new go.Binding("opacity", "isAnimated", function(v: boolean) { return v ? 1 : 0 }).ofObject(),
        $(go.Shape, { 
          strokeWidth: 2,
          stroke: "#E58C5A", // Orange theme color
          // Add gradient effect
          strokeDashArray: [1, 0]
        }),
        // Add arrow at the end
        $(go.Shape, { 
          toArrow: "Standard", 
          fill: "#E58C5A", 
          stroke: "#E58C5A", 
          scale: 1.2 
        })
      );
      
    // Animate links after rendering
    setTimeout(function() {
      diagram.links.each(link => {
        // Use data binding to trigger animation
        diagram.model.setDataProperty(link.data, "isAnimated", true);
      });
    }, 100);

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
      <DialogContent style={{ maxWidth: expanded ? '1400px' : '650px', maxHeight: '90vh' }} className={`p-0 bg-[#FAF7F8] dark:bg-gray-900 flex flex-col`}>
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
              <div className="relative flex-1 rounded-lg bg-white dark:bg-white overflow-x-auto overflow-y-hidden" style={{ height: expanded ? '70vh' : '50vh', width: '100%' }}>
                {mindmapLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-white/80">
                    <div className="flex flex-col items-center gap-4">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5B4B8A]"></div>
                      <p className="text-[#5B4B8A] font-medium">Generating mindmap...</p>
                    </div>
                  </div>
                ) : mindmapData ? (
                  <>
                    {/* Render the mindmap diagram */}
                    <ReactDiagram
                      initDiagram={initDiagram}
                      divClassName="diagram-component h-full w-full overflow-x-auto overflow-y-hidden"
                      nodeDataArray={mindmapData.nodes || []}
                      linkDataArray={mindmapData.links || []}
                      onModelChange={() => {
                        // Force the diagram to fit content after initial load
                        const diagramInstance = document.getElementsByClassName('diagram-component')[0];
                        if (diagramInstance && (diagramInstance as any).__reactGoJS) {
                          const diagram = (diagramInstance as any).__reactGoJS;
                          setTimeout(() => {
                            // First scale content to fit
                            diagram.scale = 0.9; // Slightly smaller scale to ensure everything fits
                            
                            // Center the content vertically and horizontally
                            diagram.centerRect(diagram.documentBounds);
                            
                            // Add a slight adjustment to push content down
                            diagram.position = new go.Point(diagram.position.x, diagram.position.y + 30);
                          }, 100);
                        }
                      }}
                    />
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p>No mindmap data available.</p>
                  </div>
                )}
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
