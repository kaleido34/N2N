'use client';

import { ContentProviders } from './providers';

export default function ContentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ContentProviders>
      <div className="min-h-screen w-full overflow-x-hidden bg-white dark:bg-gray-900">
        <div className="flex flex-col min-h-screen">
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </ContentProviders>
  );
}
