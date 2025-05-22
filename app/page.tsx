"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  PlayCircle,
  FileText,
  Zap,
  BrainCircuit,
  MessageSquare,
  Sparkles,
  UploadIcon,
  SlidersHorizontal,
  BarChart3,
  Twitter,
  Facebook,
  Instagram,
  Github,
  Bot,
  BookOpen,
  Lightbulb,
  BookMarked,
  GraduationCap,
  Video,
} from "lucide-react";
import { useAuthStore } from "@/hooks/auth-provider";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const LogoSVG = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 1200 1200" fill="none">
    <rect width="1200" height="1200" fill="#EAEAEA" rx="3"/>
    <g opacity=".5">
      <g opacity=".5">
        <path fill="#FAFAFA" d="M600.709 736.5c-75.454 0-136.621-61.167-136.621-136.62 0-75.454 61.167-136.621 136.621-136.621 75.453 0 136.62 61.167 136.62 136.621 0 75.453-61.167 136.62-136.62 136.62Z"/>
        <path stroke="#C9C9C9" strokeWidth="2.418" d="M600.709 736.5c-75.454 0-136.621-61.167-136.621-136.62 0-75.454 61.167-136.621 136.621-136.621 75.453 0 136.62 61.167 136.62 136.621 0 75.453-61.167 136.62-136.62 136.62Z"/>
      </g>
      <path stroke="url(#a)" strokeWidth="2.418" d="M0-1.209h553.581" transform="scale(1 -1) rotate(45 1163.11 91.165)"/>
      <path stroke="url(#b)" strokeWidth="2.418" d="M404.846 598.671h391.726"/>
      <path stroke="url(#c)" strokeWidth="2.418" d="M599.5 795.742V404.017"/>
      <path stroke="url(#d)" strokeWidth="2.418" d="m795.717 796.597-391.441-391.44"/>
      <path fill="#fff" d="M600.709 656.704c-31.384 0-56.825-25.441-56.825-56.824 0-31.384 25.441-56.825 56.825-56.825 31.383 0 56.824 25.441 56.824 56.825 0 31.383-25.441 56.824-56.824 56.824Z"/>
      <g clipPath="url(#e)"><path fill="#666" fillRule="evenodd" d="M616.426 586.58h-31.434v16.176l3.553-3.554.531-.531h9.068l.074-.074 8.463-8.463h2.565l7.18 7.181V586.58Zm-15.715 14.654 3.698 3.699 1.283 1.282-2.565 2.565-1.282-1.283-5.2-5.199h-6.066l-5.514 5.514-.073.073v2.876a2.418 2.418 0 0 0 2.418 2.418h26.598a2.418 2.418 0 0 0 2.418-2.418v-8.317l-8.463-8.463-7.181 7.181-.071.072Zm-19.347 5.442v4.085a6.045 6.045 0 0 0 6.046 6.045h26.598a6.044 6.044 0 0 0 6.045-6.045v-7.108l1.356-1.355-1.282-1.283-.074-.073v-17.989h-38.689v23.43l-.146.146.146.147Z" clipRule="evenodd"/></g>
      <path stroke="#C9C9C9" strokeWidth="2.418" d="M600.709 656.704c-31.384 0-56.825-25.441-56.825-56.824 0-31.384 25.441-56.825 56.825-56.825 31.383 0 56.824 25.441 56.824 56.825 0 31.383-25.441 56.824-56.824 56.824Z"/>
    </g>
    <defs>
      <linearGradient id="a" x1="554.061" x2="-.48" y1=".083" y2=".087" gradientUnits="userSpaceOnUse"><stop stopColor="#C9C9C9" stopOpacity="0"/><stop offset=".208" stopColor="#C9C9C9"/><stop offset=".792" stopColor="#C9C9C9"/><stop offset="1" stopColor="#C9C9C9" stopOpacity="0"/></linearGradient>
      <linearGradient id="b" x1="796.912" x2="404.507" y1="599.963" y2="599.965" gradientUnits="userSpaceOnUse"><stop stopColor="#C9C9C9" stopOpacity="0"/><stop offset=".208" stopColor="#C9C9C9"/><stop offset=".792" stopColor="#C9C9C9"/><stop offset="1" stopColor="#C9C9C9" stopOpacity="0"/></linearGradient>
      <linearGradient id="c" x1="600.792" x2="600.794" y1="403.677" y2="796.082" gradientUnits="userSpaceOnUse"><stop stopColor="#C9C9C9" stopOpacity="0"/><stop offset=".208" stopColor="#C9C9C9"/><stop offset=".792" stopColor="#C9C9C9"/><stop offset="1" stopColor="#C9C9C9" stopOpacity="0"/></linearGradient>
      <linearGradient id="d" x1="404.85" x2="796.972" y1="403.903" y2="796.02" gradientUnits="userSpaceOnUse"><stop stopColor="#C9C9C9" stopOpacity="0"/><stop offset=".208" stopColor="#C9C9C9"/><stop offset=".792" stopColor="#C9C9C9"/><stop offset="1" stopColor="#C9C9C9" stopOpacity="0"/></linearGradient>
      <clipPath id="e"><path fill="#fff" d="M581.364 580.535h38.689v38.689h-38.689z"/></clipPath>
    </defs>
  </svg>
);

export default function Home() {
  const { isAuthenticated } = useAuthStore();

  const handleRedirect = () => {
    if (typeof window !== "undefined") {
      window.location.replace(isAuthenticated ? "/dashboard" : "/signup");
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F8] dark:bg-[#18132A] transition-colors duration-300 scroll-smooth">
      {/* Hero Section with border */}
      <section className="flex flex-col md:flex-row items-center justify-between max-w-7xl mx-auto px-8 py-16 md:py-24 gap-12 border-b border-[#23223a]">
        {/* Left: Text */}
        <div className="flex-1 max-w-xl">
          <h1 className="text-4xl md:text-6xl font-extrabold text-dark5 dark:text-white leading-tight mb-6">
            Transform Learning<br />
            into <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7B5EA7] to-[#E5735A]">Interactive Fun</span>
          </h1>
          <p className="text-lg md:text-xl text-[#5B5B5B] dark:text-gray-200 mb-8">
            Our AI-powered learning platform helps you create summaries, flashcards, quizzes, and puzzles for more effective and engaging study sessions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Link href="/auth/signup" className="px-6 py-3 rounded-md bg-[#7B5EA7] text-white font-semibold text-lg shadow hover:bg-[#684b9e] transition-colors duration-200 text-center">Get Started Free</Link>
            <a href="#how-it-works" className="px-6 py-3 rounded-md border border-[#7B5EA7] text-[#7B5EA7] font-semibold text-lg bg-white hover:bg-[#f3eefe] transition-colors duration-200 text-center">See How It Works</a>
          </div>
          <div className="flex items-center gap-2 mt-2">
            {/* Social proof dots */}
            <div className="flex gap-1">
              <span className="w-6 h-6 rounded-full bg-[#E5735A] text-white flex items-center justify-center font-bold">1</span>
              <span className="w-6 h-6 rounded-full bg-[#E5735A] text-white flex items-center justify-center font-bold">2</span>
              <span className="w-6 h-6 rounded-full bg-[#E5735A] text-white flex items-center justify-center font-bold">3</span>
              <span className="w-6 h-6 rounded-full bg-[#E5735A] text-white flex items-center justify-center font-bold">4</span>
            </div>
            <span className="ml-3 text-[#5B5B5B] dark:text-gray-200 text-sm">Join 10,000+ students & educators</span>
          </div>
        </div>
        {/* Right: Illustration Placeholder */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-[420px] h-[280px] bg-gradient-to-r from-[#7B5EA7] to-[#E5735A] rounded-3xl shadow-lg flex flex-col justify-between p-6">
            <div className="flex-1 flex items-center justify-center">
              <div className="w-16 h-16 bg-white bg-opacity-30 rounded-full flex items-center justify-center">
                <div className="w-8 h-8 bg-white bg-opacity-60 rounded-full" />
              </div>
            </div>
            <div className="mt-6 space-y-2">
              <div className="h-3 w-3/4 bg-[#C7E1C1] rounded-full mb-1" />
              <div className="h-3 w-2/3 bg-[#C7E1C1] rounded-full mb-1" />
              <div className="h-3 w-5/6 bg-[#C7E1C1] rounded-full" />
            </div>
            <div className="flex justify-between items-center mt-6">
              <span className="px-4 py-2 rounded-md bg-[#C7E1C1] text-[#5B5B5B] font-semibold">Notes</span>
              <span className="text-2xl text-[#5B5B5B]">→</span>
              <span className="px-4 py-2 rounded-md bg-[#E5735A] text-white font-semibold">Flashcards</span>
            </div>
          </div>
        </div>
      </section>

        {/* Features Section */}
      <section id="features" className="py-20 bg-[#FAF7F8] dark:bg-[#18132A]">
        <h2 className="text-3xl font-bold text-center text-[#232323] dark:text-white mb-12">
          Interactive Learning Tools
          </h2>
        <p className="text-center text-[#5B5B5B] dark:text-gray-200 mb-16 max-w-2xl mx-auto">
          Our powerful features make it easy to transform complex information into memorable learning experiences
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10 max-w-7xl mx-auto">
            {[
              {
              icon: <Bot className="w-7 h-7" />,
              title: "Chat with Your Content",
              description: "Ask questions and get instant, AI-powered answers from your notes, lectures, or videos—like having a study buddy on demand.",
              iconBg: "bg-gradient-to-br from-[#F3F0FF] to-[#E8E3FF] dark:from-[#2A2540] dark:to-[#1E1A2E]",
              },
              {
              icon: <BookOpen className="w-7 h-7" />,
              title: "One-Click Summaries",
              description: "Turn hours of material into bite-sized, easy-to-review summaries with a single click—save time, learn smarter.",
              iconBg: "bg-gradient-to-br from-[#F8F3F4] to-[#F3E8E9] dark:from-[#2A2540] dark:to-[#1E1A2E]",
              },
              {
              icon: <Lightbulb className="w-7 h-7" />,
              title: "Visual Mind Maps",
              description: "See the big picture—AI creates interactive mind maps to help you connect concepts and boost understanding.",
              iconBg: "bg-gradient-to-br from-[#F3F8F4] to-[#E8F3E9] dark:from-[#2A2540] dark:to-[#1E1A2E]",
              },
              {
              icon: <BookMarked className="w-7 h-7" />,
              title: "Instant Flashcards",
              description: "Generate smart flashcards from any content for rapid, effective revision—no manual work needed.",
              iconBg: "bg-gradient-to-br from-[#FFF6F3] to-[#FFE8E3] dark:from-[#2A2540] dark:to-[#1E1A2E]",
              },
              {
              icon: <GraduationCap className="w-7 h-7" />,
              title: "Personalized Learning Paths",
              description: "Let AI guide your journey—custom study plans adapt to your goals and progress for maximum results.",
              iconBg: "bg-gradient-to-br from-[#FFF3F8] to-[#FFE8F3] dark:from-[#2A2540] dark:to-[#1E1A2E]",
              },
              {
              icon: <Video className="w-7 h-7" />,
              title: "Smart Video Navigation",
              description: "Jump to the good stuff—AI chapters let you skip straight to the most important moments in any video.",
              iconBg: "bg-gradient-to-br from-[#F3F6FF] to-[#E8EBFF] dark:from-[#2A2540] dark:to-[#1E1A2E]",
              },
            ].map((feature, index) => (
            <div
                key={index}
              className="rounded-2xl p-8 bg-gradient-to-br from-white to-[#FAF7F8] dark:from-[#23223A] dark:to-[#1E1A2E] shadow hover:scale-[1.02] transition-transform flex flex-col h-full border border-[#F0EAFB] dark:border-[#2A2540]"
            >
              <div className={`flex items-center justify-center w-14 h-14 rounded-xl ${feature.iconBg} mb-6 shadow`}>
                <span className="text-[#A259A6] dark:text-[#C7AFFF]">{feature.icon}</span>
              </div>
              <h3 className="text-xl font-semibold text-dark5 dark:text-white mb-2">{feature.title}</h3>
              <p className="text-[#5B5B5B] dark:text-gray-200 mb-2">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-[#FAF7F8] dark:bg-[#18132A]">
        <h2 className="text-3xl font-bold text-center text-[#232323] dark:text-white mb-6">
          How Noise2Nectar Works
        </h2>
        <p className="text-center text-[#5B5B5B] dark:text-gray-200 mb-16 max-w-2xl mx-auto">
          Transform your study materials in three simple steps
        </p>
        <div className="grid md:grid-cols-3 gap-10 max-w-7xl mx-auto">
          {[
            {
              number: '01',
              icon: <UploadIcon className="w-10 h-10 text-[#A259A6] dark:text-[#C7AFFF] mb-4" />,
              title: 'Upload your materials',
              description: 'Simply upload your notes, textbooks, or any study material you want to learn from.',
            },
            {
              number: '02',
              icon: <SlidersHorizontal className="w-10 h-10 text-[#A259A6] dark:text-[#C7AFFF] mb-4" />,
              title: 'Choose your learning tools',
              description: 'Select from summaries, flashcards, quizzes, or puzzles based on your learning preferences.',
            },
            {
              number: '03',
              icon: <BarChart3 className="w-10 h-10 text-[#A259A6] dark:text-[#C7AFFF] mb-4" />,
              title: 'Study and measure progress',
              description: 'Use the generated learning materials and track your improvement over time.',
            },
          ].map((step, idx) => (
            <div
              key={idx}
              className="rounded-2xl p-8 bg-gradient-to-br from-white to-[#FAF7F8] dark:from-[#23223A] dark:to-[#1E1A2E] shadow flex flex-col items-center text-center h-full border border-[#F0EAFB] dark:border-[#2A2540]"
              >
              <span className="text-3xl font-bold text-[#A259A6] dark:text-[#C7AFFF] mb-2">{step.number}</span>
              {step.icon}
              <h3 className="text-xl font-semibold text-dark5 dark:text-white mb-2">{step.title}</h3>
              <p className="text-[#5B5B5B] dark:text-gray-200">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AI-Powered Technology Section */}
      <section className="py-20 bg-[#FAF7F8] dark:bg-[#18132A]">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 px-8">
          {/* Left: Text */}
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-dark5 dark:text-white mb-4">
              AI-Powered Learning Technology That Makes the Difference
            </h2>
            <p className="text-[#5B5B5B] dark:text-gray-200 mb-8">
              Our advanced algorithms analyze your study materials to create personalized learning tools that adapt to your unique learning style and needs.
            </p>
            <ul className="text-[#E5735A] dark:text-[#F8B4A0] text-base space-y-3 mb-8 pl-0">
              <li className="flex items-center gap-2">
                <span className="text-xl">✓</span> Smart content extraction identifies key concepts
              </li>
              <li className="flex items-center gap-2">
                <span className="text-xl">✓</span> Personalized learning paths adapt to your progress
              </li>
              <li className="flex items-center gap-2">
                <span className="text-xl">✓</span> Interactive elements keep learning engaging and effective
              </li>
            </ul>
            <Link
              href="/signup"
              className="inline-block px-6 py-3 rounded-md bg-[#7B5EA7] text-white font-semibold text-lg shadow hover:bg-[#684b9e] transition"
            >
              Try It Free
            </Link>
          </div>
          {/* Right: Illustration Placeholder */}
          <div className="flex-1 flex items-center justify-center">
            <div className="w-[420px] h-[280px] bg-gradient-to-r from-[#7B5EA7] to-[#E5735A] rounded-3xl shadow-lg flex flex-col justify-between p-6">
              <div className="flex-1 flex items-center justify-center">
                <div className="w-16 h-16 bg-white bg-opacity-30 rounded-full flex items-center justify-center">
                  <div className="w-8 h-8 bg-white bg-opacity-60 rounded-full" />
                </div>
              </div>
              <div className="mt-6 space-y-2">
                <div className="h-3 w-3/4 bg-[#C7E1C1] rounded-full mb-1" />
                <div className="h-3 w-2/3 bg-[#C7E1C1] rounded-full mb-1" />
                <div className="h-3 w-5/6 bg-[#C7E1C1] rounded-full" />
              </div>
              <div className="flex justify-between items-center mt-6">
                <span className="px-4 py-2 rounded-md bg-[#C7E1C1] text-[#5B5B5B] font-semibold">Notes</span>
                <span className="text-2xl text-[#5B5B5B]">→</span>
                <span className="px-4 py-2 rounded-md bg-[#E5735A] text-white font-semibold">Flashcards</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-[#FAF7F8] dark:bg-[#18132A]">
        <h2 className="text-3xl font-bold text-center text-[#232323] dark:text-white mb-2">Loved by Students & Educators</h2>
        <p className="text-center text-[#5B5B5B] dark:text-gray-200 mb-12">See what our users have to say about Noise2Nectar</p>
        <div className="grid md:grid-cols-2 gap-10 max-w-4xl mx-auto">
          {[
            {
              quote: "Noise2Nectar transformed my study routine. Creating flashcards from my lecture notes has never been easier.",
              name: "Sarah Johnson",
              role: "Medical Student",
            },
            {
              quote: "The quiz generation feature has helped me prepare for exams more effectively than any other study method I've tried.",
              name: "Michael Chen",
              role: "Computer Science Major",
            },
          ].map((testimonial, idx) => (
            <div
              key={idx}
              className="bg-gradient-to-br from-white to-[#FAF7F8] dark:from-[#23223A] dark:to-[#1E1A2E] rounded-2xl p-8 shadow-sm flex flex-col h-full border border-[#F0EAFB] dark:border-[#2A2540]"
            >
              <span className="text-4xl text-[#F8B4A0] dark:text-[#F8B4A0] mb-4">“</span>
              <p className="text-[#232323] dark:text-gray-200 italic mb-6">{testimonial.quote}</p>
              <div className="flex items-center gap-4 mt-auto">
                <div className="w-12 h-12 rounded-full bg-[#F3F0FF] dark:bg-dark4 flex items-center justify-center text-xl font-bold text-[#A259A6] dark:text-[#C7AFFF]">
                  {testimonial.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="font-semibold text-dark5 dark:text-white">{testimonial.name}</div>
                  <div className="text-[#A259A6] dark:text-[#C7AFFF] text-sm">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-[#7B5EA7] text-white text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Learning Experience?</h2>
        <p className="text-lg mb-8 max-w-xl mx-auto">Join thousands of students and educators who trust Noise2Nectar for more effective learning.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/signup" className="px-8 py-4 rounded-md bg-[#E5735A] text-white font-semibold text-lg shadow hover:bg-[#d45c43] transition">Get Started Free</Link>
          <a href="#" className="px-8 py-4 rounded-md border border-white text-white font-semibold text-lg bg-transparent hover:bg-white hover:text-[#7B5EA7] transition">Schedule a Demo</a>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="bg-[#F9F3F3] dark:bg-[#18132A] border-t border-[#F3E9E9] dark:border-[#23223A] mt-0">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row md:items-start md:justify-between gap-10">
          {/* Left: Logo and description */}
          <div className="flex-1 min-w-[220px] flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white rounded-lg p-2 shadow border border-[#E5E5EF]">
                <Image src="/logo.png" alt="Noise2Nectar Logo" width={40} height={40} />
              </div>
              <span className="font-bold text-2xl text-[#18132A] dark:text-white">Noise2Nectar</span>
            </div>
            <p className="text-[#444] dark:text-[#C7AFFF]/80 text-base max-w-xs">
              Transforming learning with interactive AI-powered tools for students and educators.
            </p>
            <div className="flex gap-2 mt-2">
              <a href="#" aria-label="Twitter" className="rounded-full bg-[#F3F0FF] p-2 hover:bg-[#E5E5EF] transition"><Twitter className="h-5 w-5 text-[#7B5EA7]" /></a>
              <a href="#" aria-label="Facebook" className="rounded-full bg-[#F3F0FF] p-2 hover:bg-[#E5E5EF] transition"><Facebook className="h-5 w-5 text-[#7B5EA7]" /></a>
              <a href="#" aria-label="Instagram" className="rounded-full bg-[#F3F0FF] p-2 hover:bg-[#E5E5EF] transition"><Instagram className="h-5 w-5 text-[#7B5EA7]" /></a>
              <a href="#" aria-label="LinkedIn" className="rounded-full bg-[#F3F0FF] p-2 hover:bg-[#E5E5EF] transition"><svg className="h-5 w-5 text-[#7B5EA7]" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.76 0-5 2.24-5 5v14c0 2.76 2.24 5 5 5h14c2.76 0 5-2.24 5-5v-14c0-2.76-2.24-5-5-5zm-11 19h-3v-9h3v9zm-1.5-10.28c-.97 0-1.75-.79-1.75-1.75s.78-1.75 1.75-1.75 1.75.79 1.75 1.75-.78 1.75-1.75 1.75zm15.5 10.28h-3v-4.5c0-1.08-.02-2.47-1.5-2.47-1.5 0-1.73 1.17-1.73 2.39v4.58h-3v-9h2.88v1.23h.04c.4-.75 1.38-1.54 2.85-1.54 3.05 0 3.61 2.01 3.61 4.62v4.69z"/></svg></a>
              <a href="#" aria-label="Github" className="rounded-full bg-[#F3F0FF] p-2 hover:bg-[#E5E5EF] transition"><Github className="h-5 w-5 text-[#7B5EA7]" /></a>
            </div>
          </div>
          {/* Center: Navigation columns */}
          <div className="flex-[2] grid grid-cols-2 md:grid-cols-3 gap-8">
            <div>
              <div className="font-semibold text-[#18132A] dark:text-white mb-3">PRODUCT</div>
              <ul className="space-y-2">
                <li><a href="#" className="text-[#444] dark:text-[#C7AFFF]/80 hover:underline">Features</a></li>
                <li><a href="#" className="text-[#444] dark:text-[#C7AFFF]/80 hover:underline">Testimonials</a></li>
                <li><a href="#" className="text-[#444] dark:text-[#C7AFFF]/80 hover:underline">FAQ</a></li>
                <li><a href="#" className="text-[#444] dark:text-[#C7AFFF]/80 hover:underline">Blog</a></li>
              </ul>
            </div>
            <div>
              <div className="font-semibold text-[#18132A] dark:text-white mb-3">COMPANY</div>
              <ul className="space-y-2">
                <li><a href="#" className="text-[#444] dark:text-[#C7AFFF]/80 hover:underline">About</a></li>
                <li><a href="#" className="text-[#444] dark:text-[#C7AFFF]/80 hover:underline">Careers</a></li>
                <li><a href="#" className="text-[#444] dark:text-[#C7AFFF]/80 hover:underline">Press</a></li>
                <li><a href="#" className="text-[#444] dark:text-[#C7AFFF]/80 hover:underline">Partners</a></li>
                <li><a href="#" className="text-[#444] dark:text-[#C7AFFF]/80 hover:underline">Contact</a></li>
              </ul>
            </div>
            <div>
              <div className="font-semibold text-[#18132A] dark:text-white mb-3">LEGAL</div>
              <ul className="space-y-2">
                <li><a href="#" className="text-[#444] dark:text-[#C7AFFF]/80 hover:underline">Terms</a></li>
                <li><a href="#" className="text-[#444] dark:text-[#C7AFFF]/80 hover:underline">Privacy</a></li>
                <li><a href="#" className="text-[#444] dark:text-[#C7AFFF]/80 hover:underline">Cookies</a></li>
                <li><a href="#" className="text-[#444] dark:text-[#C7AFFF]/80 hover:underline">Licenses</a></li>
                <li><a href="/settings" className="text-[#444] dark:text-[#C7AFFF]/80 hover:underline">Settings</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t border-[#F3E9E9] dark:border-[#23223A] py-4 px-6 flex flex-col items-center justify-center">
          <span className="text-[#444] dark:text-[#C7AFFF]/80 text-sm text-center">© 2025 Noise2Nectar. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}