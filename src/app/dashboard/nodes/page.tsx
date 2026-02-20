'use client';

import { useState, useEffect } from 'react';
import { Server, Plus, Trash2, Shield, Activity, RefreshCw } from 'lucide-react';

type NodeData = {
    id: string;
    name: string;
    ip: string;
    port: number;
    username: string;
    status?: 'online' | 'offline' | 'checking';
};

export default function NodesPage() {
    const [nodes, setNodes] = useState<NodeData[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    // Form states
    const [name, setName] = useState('');
    const [ip, setIp] = useState('');
    const [port, setPort] = useState('22');
    const [username, setUsername] = useState('root');
    const [password, setPassword] = useState('');
    const [addingError, setAddingError] = useState('');
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        fetchNodes();
    }, []);

    const fetchNodes = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/nodes');
            if (res.ok) {
                const data = await res.json();
                setNodes(data.nodes);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAddNode = async (e: React.FormEvent) => {
        e.preventDefault();
        setAdding(true);
        setAddingError('');

        try {
            const res = await fetch('/api/nodes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, ip, port: parseInt(port), username, password }),
            });

            if (res.ok) {
                setShowAddModal(false);
                // Reset form
                setName(''); setIp(''); setPort('22'); setUsername('root'); setPassword('');
                fetchNodes();
            } else {
                const data = await res.json();
                setAddingError(data.error || 'Failed to add node');
            }
        } catch (e) {
            setAddingError('Network error occurred');
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to remove this node? Tunnels using this node may stop working.')) return;
        try {
            const res = await fetch(`/api/nodes?id=${id}`, { method: 'DELETE' });
            if (res.ok) fetchNodes();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Server className="w-8 h-8 text-accent-primary" /> Node Management
                </h1>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="btn-primary gap-2"
                >
                    <Plus className="w-4 h-4" /> Add Server
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <RefreshCw className="w-8 h-8 animate-spin text-accent-primary" />
                </div>
            ) : nodes.length === 0 ? (
                <div className="glass-panel p-12 text-center border border-dashed border-border-color/50 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-accent-glow opacity-0 group-hover:opacity-10 transition-opacity duration-500"></div>
                    <Server className="w-16 h-16 text-secondary/30 mx-auto mb-4 group-hover:text-accent-primary/50 transition-colors" />
                    <h3 className="text-xl font-bold mb-2">No Remote Nodes</h3>
                    <p className="text-secondary max-w-md mx-auto relative z-10">
                        Add a Linux server to the registry. The system will connect via SSH to execute GRE/VXLAN and iperf3 commands.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {nodes.map(node => (
                        <div key={node.id} className="glass-panel p-6 flex flex-col group hover:-translate-y-1 transition-transform duration-300">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-white/5 border border-border-color flex items-center justify-center relative overflow-hidden">
                                        <div className="absolute inset-0 bg-accent-primary/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <Server className="w-5 h-5 text-accent-primary relative z-10" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold">{node.name}</h3>
                                        <p className="text-xs text-secondary font-mono">{node.ip}:{node.port}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(node.id)}
                                    className="p-2 text-secondary hover:text-error hover:bg-error/10 rounded-md transition-colors"
                                    title="Remove Node"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="bg-black/20 rounded-md py-2 px-3 mt-auto flex items-center gap-4 text-sm font-mono text-secondary">
                                <div className="flex items-center gap-1">
                                    <Shield className="w-4 h-4" />
                                    {node.username}
                                </div>
                                <div className="flex items-center gap-1 text-success">
                                    <Activity className="w-4 h-4" />
                                    Connected
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Node Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel w-full max-w-lg p-6 animate-fade-in relative border border-accent-primary/30 shadow-glow">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <Plus className="w-6 h-6 text-accent-primary" /> Register Node
                            </h2>
                            <button onClick={() => setShowAddModal(false)} className="text-secondary hover:text-primary">
                                <Trash2 className="w-6 h-6 rotate-45 transform origin-center text-secondary/0" /> {/* Spacer */}
                                <span className="text-2xl leading-none">&times;</span>
                            </button>
                        </div>

                        <form onSubmit={handleAddNode} className="space-y-4">
                            {addingError && (
                                <div className="bg-error/10 text-error p-3 rounded-md text-sm border border-error/20">
                                    {addingError}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-secondary mb-1">Friendly Name</label>
                                <input type="text" required className="input-base" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Frankfurt Root Server" />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-secondary mb-1">IP Address</label>
                                    <input type="text" required className="input-base font-mono" value={ip} onChange={e => setIp(e.target.value)} placeholder="192.168.1.10" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-1">SSH Port</label>
                                    <input type="number" required className="input-base font-mono" value={port} onChange={e => setPort(e.target.value)} placeholder="22" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-1">SSH User</label>
                                    <input type="text" required className="input-base font-mono" value={username} onChange={e => setUsername(e.target.value)} placeholder="root" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-1">SSH Password</label>
                                    <input type="password" required className="input-base font-mono" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
                                <button type="submit" disabled={adding} className="btn-primary min-w-[120px]">
                                    {adding ? <RefreshCw className="w-5 h-5 animate-spin mx-auto" /> : 'Discover & Add'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
