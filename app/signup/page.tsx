"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Mail, User, Lock, Eye, EyeOff } from "lucide-react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthStore } from "@/hooks/auth-provider";
import Image from "next/image";
import { ThemeToggleButton } from "@/components/mode-toggle";

export default function SignUp() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    firstName: "",
    lastName: "",
    password: "",
  });
  const { isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post("/api/users/signup", {
        username: formData.username,
        first_name: formData.firstName,
        last_name: formData.lastName,
        password: formData.password,
      });
      router.push("/auth/signin");
    } catch (error) {
      // handle error (optional: show error message)
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="h-screen w-full bg-gradient-to-br from-[#7B5EA7] via-[#6C4F8F] to-[#E5735A] flex flex-col items-center justify-center relative pt-16">
      <div className="absolute top-0 left-0 w-full flex items-center justify-between px-8 py-4 z-10 bg-white/80 dark:bg-[#23223a]/80">
        <Link href="/" className="flex items-center gap-3 group">
          <Image src="/logo.png" alt="Noise2Nectar Logo" width={36} height={36} className="rounded-lg shadow-sm transition-all duration-300 group-hover:scale-105" />
          <span className="font-extrabold text-2xl text-[#232323] dark:text-white tracking-tight transition-transform duration-200 group-hover:scale-110">Noise2Nectar</span>
        </Link>
      </div>
      <div className="fixed top-2 right-8 z-20">
        <ThemeToggleButton />
      </div>
      <Card className="w-full max-w-md rounded-2xl shadow-xl border-0 bg-white/90 dark:bg-[#18132A]/90 backdrop-blur-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-3xl font-extrabold text-center text-[#232323] dark:text-white">Sign Up</CardTitle>
          <CardDescription className="text-center text-gray-500 dark:text-gray-300 text-base">Create your account to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#232323] dark:text-[#C7AFFF]">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-[#C7AFFF]" />
                <Input
                  id="username"
                  name="username"
                  type="username"
                  placeholder="you@example.com"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className="pl-10 h-12 rounded-lg border border-gray-200 dark:border-[#2A2540] focus:border-[#7B5EA7] focus:ring-2 focus:ring-[#7B5EA7] bg-white dark:bg-[#23223A] text-[#232323] dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#C7AFFF]"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-[#232323] dark:text-[#C7AFFF]">First Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-[#C7AFFF]" />
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  className="pl-10 h-12 rounded-lg border border-gray-200 dark:border-[#2A2540] focus:border-[#7B5EA7] focus:ring-2 focus:ring-[#7B5EA7] bg-white dark:bg-[#23223A] text-[#232323] dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#C7AFFF]"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-[#232323] dark:text-[#C7AFFF]">Last Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-[#C7AFFF]" />
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  className="pl-10 h-12 rounded-lg border border-gray-200 dark:border-[#2A2540] focus:border-[#7B5EA7] focus:ring-2 focus:ring-[#7B5EA7] bg-white dark:bg-[#23223A] text-[#232323] dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#C7AFFF]"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#232323] dark:text-[#C7AFFF]">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-[#C7AFFF]" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-10 pr-10 h-12 rounded-lg border border-gray-200 dark:border-[#2A2540] focus:border-[#7B5EA7] focus:ring-2 focus:ring-[#7B5EA7] bg-white dark:bg-[#23223A] text-[#232323] dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#C7AFFF]"
                />
                {/* Custom eye icon removed to fix duplication */}
              </div>
            </div>
            <Button type="submit" className="w-full h-12 rounded-md bg-[#7B5EA7] hover:bg-[#684b9e] text-white font-bold text-lg shadow transition-all duration-200" disabled={loading}>
              {loading ? "Signing Up..." : "Sign Up"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-base text-gray-600 dark:text-gray-300">
            Already have an account?{' '}
            <Link href="/auth/signin" className="text-[#E5735A] dark:text-[#F8B4A0] font-semibold hover:underline">Sign In</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}