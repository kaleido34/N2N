import "./globals.css";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/hooks/auth-provider";
import { SpacesProvider } from "@/hooks/space-provider";
import { ClipboardProvider } from "@/hooks/clipboard-provider";
import LayoutClient from "@/components/LayoutClient";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Noise2Nectar - AI-Powered Learning",
  description:
    "Transform your learning experience with AI-powered tools for better understanding and interaction.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <SpacesProvider>
              <ClipboardProvider>
                <LayoutClient>{children}</LayoutClient>
              </ClipboardProvider>
            </SpacesProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
