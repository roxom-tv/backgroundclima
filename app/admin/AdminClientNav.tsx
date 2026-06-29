'use client';

import { memo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { adminFetch } from '@/lib/admin-fetch';

type NavItemDef = {
    readonly href: string;
    readonly label: string;
};

const navItems: readonly NavItemDef[] = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/slides', label: 'Slides' },
    { href: '/admin/events', label: 'Events' },
    { href: '/admin/sponsors', label: 'Sponsors' },
    { href: '/admin/settings', label: 'Settings' },
];

const desktopLinkBase =
    'px-4 py-2 text-xs font-mono font-semibold uppercase tracking-wider transition-colors border-r border-[#1a1a1a]';
const mobileLinkBase =
    'px-3 py-2 text-xs font-mono font-semibold uppercase tracking-wider whitespace-nowrap border-r border-[#1a1a1a]';
const activeLinkClass = 'bg-[#00ff00] text-black';
const inactiveLinkClass = 'text-[#00ff00] hover:bg-[#1a1a1a]';

function linkIsActive(href: string, pathname: string): boolean {
    return pathname === href || (href !== '/admin' && pathname.startsWith(href));
}

const AdminClientNavInternal = () => {
    const pathname = usePathname();

    const handleSignOut = useCallback(async () => {
        await adminFetch('/api/admin/signout', { method: 'POST' });
        // Full-page navigation (not router.push) so the admin layout re-renders
        // server-side in its unauthenticated branch — a soft nav would reuse the
        // cached authed layout and keep the nav bar on the login page.
        window.location.assign('/admin/login');
    }, []);

    return (
        <nav className="flex-shrink-0 bg-[#0a0a0a] border-b-2 border-[#00ff00]">
            <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-12">
                <div className="flex items-center justify-between h-14">
                    <div className="flex items-center gap-8">
                        <Link href="/admin" className="flex items-center gap-2">
                            <span className="text-white font-mono font-bold text-base tracking-wider">
                                ADMIN
                            </span>
                        </Link>

                        <div className="hidden md:flex items-center gap-0">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`${desktopLinkBase} ${linkIsActive(item.href, pathname) ? activeLinkClass : inactiveLinkClass}`}
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/"
                            target="_blank"
                            className="text-[#00ff00] hover:text-white text-xs font-mono uppercase tracking-wider flex items-center gap-1 border border-[#00ff00] px-3 py-1"
                        >
                            VIEW
                        </Link>

                        <button
                            onClick={handleSignOut}
                            className="bg-[#ff0000] hover:bg-[#cc0000] text-white px-4 py-1 text-xs font-mono uppercase tracking-wider transition-colors border border-[#ff0000]"
                        >
                            EXIT
                        </button>
                    </div>
                </div>
            </div>

            <div className="md:hidden border-t border-[#1a1a1a]">
                <div className="flex overflow-x-auto px-4 py-2 gap-0">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`${mobileLinkBase} ${linkIsActive(item.href, pathname) ? activeLinkClass : inactiveLinkClass}`}
                        >
                            {item.label}
                        </Link>
                    ))}
                </div>
            </div>
        </nav>
    );
};

export const AdminClientNav = memo(AdminClientNavInternal);
AdminClientNav.displayName = 'AdminClientNav';
