"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function MindmapDialog() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

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
                <div style={{ width: expanded ? '1300px' : '600px', height: '100%', position: 'relative', padding: '20px' }}>
                  {/* Main node */}
                  <div className="absolute top-[30px] left-1/2 transform -translate-x-1/2 bg-gray-200 dark:bg-gray-700 rounded-lg p-4 shadow-md w-[350px] text-center">
                    <p className="font-medium text-[#5B4B8A] dark:text-white">Microsoft's Open Source Moves & AI Development</p>
                  </div>
                  
                  {/* Connection lines */}
                  <svg className="absolute top-0 left-0 w-full h-full" style={{ zIndex: 0 }}>
                    {/* Line from main to left node */}
                    <line x1="50%" y1="70px" x2="25%" y2="120px" stroke="#ccc" strokeWidth="3" />
                    
                    {/* Line from main to right node */}
                    <line x1="50%" y1="70px" x2="70%" y2="120px" stroke="#ccc" strokeWidth="3" />
                    
                    {/* Lines from left node to sub-nodes */}
                    <line x1="25%" y1="150px" x2="15%" y2="200px" stroke="#ccc" strokeWidth="3" />
                    <line x1="25%" y1="150px" x2="30%" y2="200px" stroke="#ccc" strokeWidth="3" />
                    <line x1="25%" y1="150px" x2="45%" y2="200px" stroke="#ccc" strokeWidth="3" />
                  </svg>
                  
                  {/* Left node */}
                  <div className="absolute top-[150px] left-[30%] transform -translate-x-1/2 bg-gray-200 dark:bg-gray-700 rounded-lg p-4 shadow-md w-[250px] text-center">
                    <p className="font-medium text-[#5B4B8A] dark:text-white">Open Sourcing GitHub Copilot</p>
                  </div>
                  
                  {/* Right node */}
                  <div className="absolute top-[150px] left-[70%] transform -translate-x-1/2 bg-gray-200 dark:bg-gray-700 rounded-lg p-4 shadow-md w-[250px] text-center">
                    <p className="font-medium text-[#5B4B8A] dark:text-white">Impact of Open Sourcing Copilot</p>
                  </div>
                  
                  {/* Sub-nodes */}
                  <div className="absolute top-[250px] left-[15%] transform -translate-x-1/2 bg-gray-200 dark:bg-gray-700 rounded-lg p-3 shadow-md w-[150px] text-center">
                    <p className="text-sm text-[#5B4B8A] dark:text-white">Free and Open</p>
                  </div>
                  
                  <div className="absolute top-[250px] left-[30%] transform -translate-x-1/2 bg-gray-200 dark:bg-gray-700 rounded-lg p-3 shadow-md w-[150px] text-center">
                    <p className="text-sm text-[#5B4B8A] dark:text-white">Fork, Modify</p>
                  </div>
                  
                  <div className="absolute top-[250px] left-[45%] transform -translate-x-1/2 bg-gray-200 dark:bg-gray-700 rounded-lg p-3 shadow-md w-[150px] text-center">
                    <p className="text-sm text-[#5B4B8A] dark:text-white">Open Sourcing WSL</p>
                  </div>
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
