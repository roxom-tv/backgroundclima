'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Redirect to login if not authenticated (except for login page)
  useEffect(() => {
    if (!isLoading && !user && pathname !== '/admin/login') {
      router.push('/admin/login');
    }
  }, [user, isLoading, router, pathname]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Loading...</div>
      </div>
    );
  }

  // If on login page, render without layout
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // If not authenticated, show nothing (redirect will happen)
  if (!user) {
    return null;
  }

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: '📊' },
    { href: '/admin/slides', label: 'Slides', icon: '🎬' },
    { href: '/admin/events', label: 'Events', icon: '📅' },
    { href: '/admin/sponsors', label: 'Sponsors', icon: '💼' },
    { href: '/admin/settings', label: 'Settings', icon: '⚙️' },
  ];

  const handleSignOut = async () => {
    await signOut();
    router.push('/admin/login');
  };

  return (
    <div className="h-screen flex flex-col bg-black overflow-hidden">
      {/* Top Navigation - Chyron Style */}
      <nav className="flex-shrink-0 bg-[#0a0a0a] border-b-2 border-[#00ff00]">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-12">
          <div className="flex items-center justify-between h-14">
            {/* Logo and Nav Links */}
            <div className="flex items-center gap-8">
              <Link href="/admin" className="flex items-center gap-2">
                <span className="text-white font-mono font-bold text-base tracking-wider">ADMIN</span>
              </Link>
              
              <div className="hidden md:flex items-center gap-0">
                {navItems.map((item) => {
                  const isActive = pathname === item.href || 
                    (item.href !== '/admin' && pathname.startsWith(item.href));
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`px-4 py-2 text-xs font-mono font-semibold uppercase tracking-wider transition-colors border-r border-[#1a1a1a] ${
                        isActive
                          ? 'bg-[#00ff00] text-black'
                          : 'text-[#00ff00] hover:bg-[#1a1a1a]'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              <Link
                href="/"
                target="_blank"
                className="text-[#00ff00] hover:text-white text-xs font-mono uppercase tracking-wider flex items-center gap-1 border border-[#00ff00] px-3 py-1"
              >
                VIEW
              </Link>
              
              <div className="text-[#888] text-xs font-mono">
                {user.email}
              </div>
              
              <button
                onClick={handleSignOut}
                className="bg-[#ff0000] hover:bg-[#cc0000] text-white px-4 py-1 text-xs font-mono uppercase tracking-wider transition-colors border border-[#ff0000]"
              >
                EXIT
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-[#1a1a1a]">
          <div className="flex overflow-x-auto px-4 py-2 gap-0">
            {navItems.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== '/admin' && pathname.startsWith(item.href));
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 text-xs font-mono font-semibold uppercase tracking-wider whitespace-nowrap border-r border-[#1a1a1a] ${
                    isActive
                      ? 'bg-[#00ff00] text-black'
                      : 'text-[#00ff00] hover:bg-[#1a1a1a]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-12 py-4 overflow-hidden bg-black">
        <div className="h-full max-w-[1800px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}


