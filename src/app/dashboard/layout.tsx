'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Network, Server, Router, Activity, LogOut, Menu, X } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const navItems = [
        { name: 'Overview', href: '/dashboard', icon: Activity },
        { name: 'Nodes', href: '/dashboard/nodes', icon: Server },
        { name: 'Tunnels', href: '/dashboard/tunnels', icon: Router },
        { name: 'Network Tests', href: '/dashboard/tests', icon: Network },
    ];

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/');
    };

    return (
        <div className="flex h-screen overflow-hidden bg-base">
            {/* Sidebar - Desktop */}
            <aside className="hidden md:flex flex-col w-64 glass-panel border-y-0 border-l-0 rounded-none z-20">
                <div className="p-6 flex items-center gap-3 border-b border-border-color/50">
                    <div className="w-10 h-10 rounded-xl bg-accent-glow flex items-center justify-center border border-accent-primary/50 shadow-glow">
                        <Network className="w-6 h-6 text-accent-primary" />
                    </div>
                    <span className="text-xl font-bold tracking-tight">GRE Hub</span>
                </div>

                <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive
                                        ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/30 shadow-[inset_0_0_12px_rgba(139,92,246,0.2)]'
                                        : 'text-secondary hover:bg-white/5 hover:text-primary'
                                    }`}
                            >
                                <item.icon className={`w-5 h-5 ${isActive ? 'text-accent-primary' : ''}`} />
                                <span className="font-medium">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-border-color/50">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-secondary hover:bg-error/10 hover:text-error transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">Logout Session</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col relative overflow-hidden z-10">
                {/* Mobile Header */}
                <header className="md:hidden flex items-center justify-between p-4 glass-panel border-x-0 border-t-0 rounded-none z-30">
                    <div className="flex items-center gap-2">
                        <Network className="w-6 h-6 text-accent-primary" />
                        <span className="font-bold">GRE Hub</span>
                    </div>
                    <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-secondary">
                        {mobileMenuOpen ? <X /> : <Menu />}
                    </button>
                </header>

                {/* Mobile Nav */}
                {mobileMenuOpen && (
                    <div className="md:hidden absolute top-[73px] left-0 w-full h-[calc(100vh-73px)] glass-panel z-40 p-4 flex flex-col">
                        <nav className="flex-1 space-y-2">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-3 px-4 py-4 rounded-lg bg-white/5"
                                >
                                    <item.icon className="w-5 h-5 text-accent-primary" />
                                    <span>{item.name}</span>
                                </Link>
                            ))}
                        </nav>
                        <button
                            onClick={handleLogout}
                            className="mt-auto flex items-center gap-3 px-4 py-4 rounded-lg bg-error/10 text-error"
                        >
                            <LogOut className="w-5 h-5" />
                            <span>Logout</span>
                        </button>
                    </div>
                )}

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 animate-fade-in relative">
                    <div className="max-w-6xl mx-auto">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
