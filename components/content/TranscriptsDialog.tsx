"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Transcript {
  id: string;
  title: string;
  date: string;
  content: string;
}

export function TranscriptsDialog() {
  const [open, setOpen] = useState(false);

  // Sample transcript data
  const transcripts: Transcript[] = [
    {
      id: "transcript-1",
      title: "Microsoft's Open Source Moves",
      date: "October 15, 2023",
      content: `
In today's lecture, we'll be discussing Microsoft's recent moves in the open source community, particularly focusing on GitHub Copilot.

Microsoft has announced plans to open source GitHub Copilot, which is a significant shift in their AI strategy. This decision follows their previous moves to open source Windows Subsystem for Linux and other developer tools.

The open sourcing of GitHub Copilot will allow developers to:
- Access and modify the underlying code
- Create custom versions tailored to specific needs
- Contribute improvements back to the community
- Better understand how AI code suggestions work

This move represents a continuation of Microsoft's transformation under Satya Nadella's leadership, embracing open source as a core part of their business strategy rather than viewing it as competition.

The implications for developers are substantial, as this could lead to more transparent and customizable AI coding assistants, potentially addressing some of the concerns around training data and licensing that have surrounded Copilot since its launch.
      `
    },
    {
      id: "transcript-2",
      title: "Impact of Open Source AI Tools",
      date: "October 17, 2023",
      content: `
Today we're examining the broader impact of open source AI tools on the developer ecosystem.

When AI tools like GitHub Copilot become open source, several important shifts occur in the development landscape:

1. Democratization of AI capabilities:
   - Smaller companies can leverage and customize these tools
   - Educational institutions can better teach AI concepts using real-world tools
   - Individual developers gain access to enterprise-grade AI assistance

2. Transparency and trust:
   - Open source allows for code audits and security reviews
   - Developers can understand how their data is being used
   - Ethical concerns can be addressed through community oversight

3. Innovation acceleration:
   - Community contributions often lead to unexpected use cases
   - Specialized versions can emerge for different programming languages or domains
   - Integration with other tools becomes easier and more robust

The open sourcing of AI coding tools represents a significant step toward making artificial intelligence a standard part of the development workflow, rather than a premium feature only available to those who can afford it.

This shift aligns with the broader history of development tools, where open source has consistently driven innovation and adoption.
      `
    }
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="w-full justify-start pl-2 pr-6 font-semibold bg-transparent hover:bg-[#E58C5A]/20 dark:hover:bg-[#E58C5A]/30 text-[#232323] dark:text-white shadow-none rounded-lg my-1 transition-colors group flex items-center h-12">
          <div className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 mr-3 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-white">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              <line x1="9" y1="10" x2="15" y2="10"></line>
              <line x1="9" y1="14" x2="15" y2="14"></line>
            </svg>
          </div>
          Transcripts
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[750px] p-0 overflow-hidden bg-[#FAF7F8] dark:bg-gray-900">
        <div className="flex flex-col">
          <div className="flex items-center gap-3 p-3 border-b">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-white">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                <line x1="9" y1="10" x2="15" y2="10"></line>
                <line x1="9" y1="14" x2="15" y2="14"></line>
              </svg>
            </div>
            <DialogTitle className="text-lg font-semibold text-[#5B4B8A]">Lecture Transcripts</DialogTitle>
          </div>
          
          <div className="p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-5 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-medium text-[#5B4B8A] dark:text-white">{transcripts[0].title}</h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">{transcripts[0].date}</span>
              </div>
              
              <div className="prose dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap text-sm font-normal text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-4 rounded-md overflow-auto max-h-[400px]">
                  {transcripts[0].content}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
