'use client';

import { useState, useEffect } from 'react';
import { Router, Plus, Trash2, Shield, Activity, RefreshCw, ArrowRight } from 'lucide-react';

type Node = { id: string; name: string; ip: string; port: number };
type Tunnel = {
    id: string;
    name: string;
    type: string;
    localIp: string;
    remoteIp: string;
    status: string;
    localNode: Node;
    remoteNode: Node;
};

export default function TunnelsPage() {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [tunnels, setTunnels] = useState<Tunnel[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    // Form states
    const [name, setName] = useState('');
    const [type, setType] = useState('gre');
    const [localNodeId, setLocalNodeId] = useState('');
    const [remoteNodeId, setRemoteNodeId] = useState('');
    const [localIp, setLocalIp] = useState('10.0.0.1');
    const [remoteIp, setRemoteIp] = useState('10.0.0.2');
    const [addingError, setAddingError] = useState('');
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [nodesRes, tunnelsRes] = await Promise.all([
                fetch('/api/nodes'),
                fetch('/api/tunnels')
            ]);

            if (nodesRes.ok) {
                const data = await nodesRes.json();
                setNodes(data.nodes);
                if (data.nodes.length >= 2) {
                    setLocalNodeId(data.nodes[0].id);
                    setRemoteNodeId(data.nodes[1].id);
                }
            }
            if (tunnelsRes.ok) {
                const data = await tunnelsRes.json();
                setTunnels(data.tunnels);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTunnel = async (e: React.FormEvent) => {
        e.preventDefault();
        if (localNodeId === remoteNodeId) {
            setAddingError('Local and Remote nodes must be different');
            return;
        }
        setAdding(true);
        setAddingError('');

        try {
            const res = await fetch('/api/tunnels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, type, localNodeId, remoteNodeId, localIp, remoteIp }),
            });

            if (res.ok) {
                setShowAddModal(false);
                fetchData();
            } else {
                const data = await res.json();
                setAddingError(data.error || 'Failed to create tunnel');
            }
        } catch (e) {
            setAddingError('Network error occurred');
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to remove tunnel ${name}? This will execute teardown commands on both servers.`)) return;
        try {
            const res = await fetch(`/api/tunnels?id=${id}`, { method: 'DELETE' });
            if (res.ok) fetchData();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Router className="w-8 h-8 text-success" /> Tunnel Network
                </h1>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="btn-primary gap-2"
                    disabled={nodes.length < 2}
                >
                    <Plus className="w-4 h-4" /> Create Tunnel
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <RefreshCw className="w-8 h-8 animate-spin text-accent-primary" />
                </div>
            ) : tunnels.length === 0 ? (
                <div className="glass-panel p-12 text-center border border-dashed border-border-color/50 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-success/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <Router className="w-16 h-16 text-secondary/30 mx-auto mb-4 group-hover:text-success/50 transition-colors" />
                    <h3 className="text-xl font-bold mb-2">No Active Tunnels</h3>
                    <p className="text-secondary max-w-md mx-auto relative z-10">
                        {nodes.length < 2
                            ? "You need at least 2 nodes registered to create a tunnel."
                            : "Create a GRE or VXLAN tunnel between your registered nodes."}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {tunnels.map(tunnel => (
                        <div key={tunnel.id} className="glass-panel p-6 flex flex-col relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4">
                                <button
                                    onClick={() => handleDelete(tunnel.id, tunnel.name || tunnel.id)}
                                    className="p-2 text-secondary hover:text-error hover:bg-error/10 rounded-md transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex items-center gap-2 mb-6">
                                <span className={`px-2 py-1 text-xs font-bold rounded bg-success/20 text-success uppercase`}>
                                    {tunnel.type}
                                </span>
                                <span className="font-bold text-lg">{tunnel.name || `${tunnel.localNode.name} ↔ ${tunnel.remoteNode.name}`}</span>
                            </div>

                            <div className="flex items-center justify-between bg-black/20 p-4 rounded-lg relative">
                                {/* Connecting Line */}
                                <div className="absolute top-1/2 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-success/50 via-success to-success/50 -translate-y-1/2"></div>

                                <div className="z-10 bg-base p-2 rounded-lg border border-border-color w-1/3 text-center">
                                    <div className="font-bold text-sm truncate">{tunnel.localNode.name}</div>
                                    <div className="text-xs text-secondary font-mono">{tunnel.localNode.ip}</div>
                                    <div className="text-xs text-success font-mono mt-1">{tunnel.localIp}</div>
                                </div>

                                <div className="z-10 bg-base rounded-full p-2 border border-success text-success shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                                    <Activity className="w-5 h-5" />
                                </div>

                                <div className="z-10 bg-base p-2 rounded-lg border border-border-color w-1/3 text-center">
                                    <div className="font-bold text-sm truncate">{tunnel.remoteNode.name}</div>
                                    <div className="text-xs text-secondary font-mono">{tunnel.remoteNode.ip}</div>
                                    <div className="text-xs text-success font-mono mt-1">{tunnel.remoteIp}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Tunnel Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel w-full max-w-xl p-6 animate-fade-in relative border border-success/30 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <Plus className="w-6 h-6 text-success" /> Establish Tunnel
                            </h2>
                            <button onClick={() => setShowAddModal(false)} className="text-secondary hover:text-primary text-2xl leading-none">
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleCreateTunnel} className="space-y-5">
                            {addingError && (
                                <div className="bg-error/10 text-error p-3 rounded-md text-sm border border-error/20">
                                    {addingError}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-1">Tunnel Name (Optional)</label>
                                    <input type="text" className="input-base" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Frankfurt-London GRE" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-1">Tunnel Protocol</label>
                                    <select className="input-base" value={type} onChange={e => setType(e.target.value)}>
                                        <option value="gre">GRE (Generic Routing Encapsulation)</option>
                                        <option value="vxlan">VXLAN (Virtual eXtensible LAN)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-5 gap-4 items-center bg-black/20 p-4 rounded-lg">
                                <div className="col-span-2 space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-secondary mb-1">Local Node</label>
                                        <select className="input-base text-sm" value={localNodeId} onChange={e => setLocalNodeId(e.target.value)}>
                                            {nodes.map(n => <option key={n.id} value={n.id}>{n.name} ({n.ip})</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-secondary mb-1">Tunnel IP</label>
                                        <input type="text" required className="input-base text-sm font-mono" value={localIp} onChange={e => setLocalIp(e.target.value)} />
                                    </div>
                                </div>

                                <div className="col-span-1 flex justify-center text-success">
                                    <ArrowRight className="w-8 h-8" />
                                </div>

                                <div className="col-span-2 space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-secondary mb-1">Remote Node</label>
                                        <select className="input-base text-sm" value={remoteNodeId} onChange={e => setRemoteNodeId(e.target.value)}>
                                            {nodes.map(n => <option key={n.id} value={n.id}>{n.name} ({n.ip})</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-secondary mb-1">Tunnel IP</label>
                                        <input type="text" required className="input-base text-sm font-mono" value={remoteIp} onChange={e => setRemoteIp(e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
                                <button type="submit" disabled={adding} className="btn-primary min-w-[140px] !bg-success/80 hover:!bg-success">
                                    {adding ? <RefreshCw className="w-5 h-5 animate-spin mx-auto" /> : 'Execute & Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
