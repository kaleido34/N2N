"use client";

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
} from "lucide-react";
import { useAuthStore } from "@/hooks/auth-provider";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

export default function Home() {
  const { isAuthenticated } = useAuthStore();

  const handleRedirect = () => {
    if (typeof window !== "undefined") {
      window.location.replace(isAuthenticated ? "/dashboard" : "/signup");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900 px-4 transition-colors duration-500">
      {/* Logo and Branding */}
      <header className="flex justify-between items-center py-6 max-w-6xl mx-auto px-4">
        {/* <div className="flex items-center space-x-3">
          <Image src="/logo.png.png" alt="Noise2Nectar Logo" width={40} height={40} />
          <h1 className="text-2xl font-semibold tracking-tight text-gray-800 dark:text-white">
            Noise2Nectar
          </h1>
        </div> */}
      </header>

      <main className="container mx-auto max-w-6xl">
        {/* Hero Section */}
        <motion.section
          className="py-20 text-center relative pt-28"
          initial="initial"
          animate="animate"
          variants={fadeIn}
        >
          <motion.h1
            className="text-5xl md:text-6xl font-bold tracking-tight text-gray-900 dark:text-white mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            Turn Audio Chaos into Crystal-Clear Knowledge
          </motion.h1>
          <motion.p
            className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
          >
            Noise2Nectar uses AI to turn noisy audio and video into structured, interactive knowledge to help you learn faster and smarter.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6 }}
          >
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 text-md"
              onClick={handleRedirect}
            >
              Get Started
            </Button>
          </motion.div>
        </motion.section>

        {/* Features Section */}
        <motion.section
          id="features"
          className="py-16"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-16">
            Features that Fuel Understanding
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {[
              {
                icon: MessageSquare,
                title: "Interactive AI Q&A",
                description:
                  "Talk to your videos. Ask anything and get contextual answers with AI.",
                color: "bg-indigo-100 dark:bg-indigo-800/20",
              },
              {
                icon: FileText,
                title: "Auto Summarization",
                description:
                  "Get high-quality summaries of videos or lectures with one click.",
                color: "bg-violet-100 dark:bg-violet-800/20",
              },
              {
                icon: BrainCircuit,
                title: "Mind Mapping",
                description:
                  "Visual AI mind maps to link key concepts and understand faster.",
                color: "bg-emerald-100 dark:bg-emerald-800/20",
              },
              {
                icon: Zap,
                title: "Flashcard Generation",
                description:
                  "Instant flashcards from your content for smarter revision.",
                color: "bg-yellow-100 dark:bg-yellow-800/20",
              },
              {
                icon: Sparkles,
                title: "Learning Paths",
                description:
                  "Personalized AI-curated learning paths tailored to your goals.",
                color: "bg-pink-100 dark:bg-pink-800/20",
              },
              {
                icon: PlayCircle,
                title: "Smart Playback",
                description:
                  "Jump to important sections using AI-based chaptering.",
                color: "bg-orange-100 dark:bg-orange-800/20",
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                className={`rounded-2xl p-6 shadow-md dark:shadow-none backdrop-blur-md ${feature.color} hover:scale-[1.02] transition-transform`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <feature.icon className="h-10 w-10 text-indigo-600 dark:text-indigo-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          
          </div>
        </motion.section>

        {/* CTA Footer */}
        <motion.section
          className="py-20 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to Learn Smarter?
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-xl mx-auto">
            Join Noise2Nectar and start converting videos into actionable knowledge.
          </p>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 text-md"
            asChild
          >
            <Link href="/signup">Try It Free</Link>
          </Button>
        </motion.section>
      </main>
    </div>
  );
}   