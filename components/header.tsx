"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggleButton } from "@/components/mode-toggle";
import { useAuth } from "@/hooks/auth-provider";
import { Menu, Settings, LogOut, LogIn, UserPlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import React, { useState } from "react";

export function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  };

  // Remove header entirely on dashboard pages
  if (pathname.startsWith("/dashboard")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#e5e5ef] bg-white/80 dark:bg-[#18132A]/80 backdrop-blur-md shadow-sm transition-colors duration-300">
      <div className="flex h-16 items-center px-4 md:px-10 justify-between w-full">
        <div className="flex items-center gap-6">
          <Link className="flex items-center space-x-3" href="/">
            <Image src="/logo.png" alt="Noise2Nectar Logo" width={36} height={36} className="rounded-lg shadow-sm" />
            <span className="font-extrabold text-2xl text-[#232323] dark:text-white tracking-tight">Noise2Nectar</span>
          </Link>
          <nav className="hidden md:flex items-center space-x-2 ml-6">
            <Link href="#features" className="px-3 py-2 rounded-lg text-[#232323] dark:text-white font-medium hover:bg-[#f3f0ff] dark:hover:bg-[#23223a] hover:text-[#7B5EA7] dark:hover:text-[#C7AFFF] transition-colors">Features</Link>
            <Link href="#how-it-works" className="px-3 py-2 rounded-lg text-[#232323] dark:text-white font-medium hover:bg-[#f3f0ff] dark:hover:bg-[#23223a] hover:text-[#7B5EA7] dark:hover:text-[#C7AFFF] transition-colors">How It Works</Link>
            <Link href="#testimonials" className="px-3 py-2 rounded-lg text-[#232323] dark:text-white font-medium hover:bg-[#f3f0ff] dark:hover:bg-[#23223a] hover:text-[#7B5EA7] dark:hover:text-[#C7AFFF] transition-colors">Testimonials</Link>
            <Link href="#pricing" className="px-3 py-2 rounded-lg text-[#232323] dark:text-white font-medium hover:bg-[#f3f0ff] dark:hover:bg-[#23223a] hover:text-[#7B5EA7] dark:hover:text-[#C7AFFF] transition-colors">Pricing</Link>
            {user && (
              <Link href="/dashboard" className="px-3 py-2 rounded-lg text-[#232323] dark:text-white font-medium hover:bg-[#f3f0ff] dark:hover:bg-[#23223a] hover:text-[#7B5EA7] dark:hover:text-[#C7AFFF] transition-colors">Dashboard</Link>
            )}
          </nav>
        </div>
        <div className="flex items-center space-x-6">
          <ThemeToggleButton className="relative top-[-4px]" />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-9 w-9 cursor-pointer shadow-sm hover:shadow-md transition-all duration-200">
                  <AvatarFallback className="bg-[#66529C] text-white font-semibold">{getInitials(user.name)}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="p-6 dark:bg-[#18132A] rounded-xl shadow-lg" align="end">
                <DropdownMenuItem onSelect={() => router.push("/settings")}> <Settings className="mr-2 h-4 w-4" /> <span>Settings</span> </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => logout()}> <LogOut className="mr-2 h-4 w-4" /> <span>Log out</span> </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link href="/auth/signin" className="px-6 py-2 rounded-full border border-[#23223a] text-[#232323] dark:text-white font-semibold hover:bg-[#f3f0ff] dark:hover:bg-[#23223a] hover:text-[#7B5EA7] dark:hover:text-[#C7AFFF] transition-all duration-200 flex items-center gap-2 shadow-sm text-base">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                Log In
              </Link>
              <Link href="/auth/signup" className="px-7 py-2 rounded-full bg-gradient-to-r from-[#E5735A] to-[#E58C5A] text-white font-bold hover:from-[#d45c43] hover:to-[#e5a05a] transition-all duration-200 flex items-center gap-2 shadow-md text-base">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}