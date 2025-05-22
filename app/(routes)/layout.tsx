export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen w-full overflow-x-hidden dark:bg-gray-900">
      <main className="flex-1 overflow-y-auto dark:bg-gray-900">
        {children}
      </main>
    </div>
  );
} 