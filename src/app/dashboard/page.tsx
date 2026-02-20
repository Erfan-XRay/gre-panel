'use client';

import { Activity, Server, Router, Zap } from 'lucide-react';
import Link from 'next/link';

export default function DashboardOverview() {
    const stats = [
        { name: 'Active Nodes', value: '0', icon: Server, color: 'text-accent-primary' },
        { name: 'Active Tunnels', value: '0', icon: Router, color: 'text-success' },
        { name: 'Network Tests', value: '0', icon: Activity, color: 'text-info' },
        { name: 'System Load', value: 'Stable', icon: Zap, color: 'text-warning' },
    ];

    return (
        <>
            <h1 className="text-3xl font-bold mb-8">System Overview</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, i) => (
                    <div key={i} className="glass-panel p-6 flex items-center justify-between">
                        <div>
                            <p className="text-secondary mb-1 font-medium">{stat.name}</p>
                            <h3 className="text-3xl font-bold">{stat.value}</h3>
                        </div>
                        <div className={`w-12 h-12 rounded-full bg-white/5 flex items-center justify-center ${stat.color}`}>
                            <stat.icon className="w-6 h-6" />
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 -z-10 relative">
                <div className="glass-panel p-6">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Server className="w-5 h-5 text-accent-primary" /> Recent Nodes
                    </h3>
                    <p className="text-secondary text-sm">No nodes have been added yet.</p>
                    <Link href="/dashboard/nodes" className="mt-4 inline-block text-accent-primary hover:underline font-medium text-sm">
                        + Manage Nodes
                    </Link>
                </div>

                <div className="glass-panel p-6">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Router className="w-5 h-5 text-success" /> Active Tunnels
                    </h3>
                    <p className="text-secondary text-sm">No tunnels are currently active.</p>
                    <Link href="/dashboard/tunnels" className="mt-4 inline-block text-accent-primary hover:underline font-medium text-sm">
                        + Create New Tunnel
                    </Link>
                </div>
            </div>
        </>
    );
}
