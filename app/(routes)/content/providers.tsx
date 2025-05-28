'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/hooks/auth-provider';
import { SpacesProvider } from '@/hooks/space-provider';

export function ContentProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        <SpacesProvider>
          {children}
        </SpacesProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
