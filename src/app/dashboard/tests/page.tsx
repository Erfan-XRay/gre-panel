'use client';

import { useState, useEffect } from 'react';
import { Activity, Play, RefreshCw, Terminal } from 'lucide-react';

type Node = { id: string; name: string; ip: string };

export default function TestsPage() {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [sourceNodeId, setSourceNodeId] = useState('');
    const [targetNodeId, setTargetNodeId] = useState('');
    const [testType, setTestType] = useState('ping');
    const [output, setOutput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch('/api/nodes')
            .then(r => r.json())
            .then(d => {
                if (d.nodes) {
                    setNodes(d.nodes);
                    if (d.nodes.length >= 2) {
                        setSourceNodeId(d.nodes[0].id);
                        setTargetNodeId(d.nodes[1].id);
                    } else if (d.nodes.length === 1) {
                        setSourceNodeId(d.nodes[0].id);
                    }
                }
            });
    }, []);

    const runTest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sourceNodeId) return setError('Please select a source node');
        // If iperf3, we need target. But ping could be generic. Let's assume testing between nodes.
        if (!targetNodeId && testType === 'iperf3') return setError('iperf3 requires a target node');

        setLoading(true);
        setError('');
        setOutput(`[Initializing ${testType.toUpperCase()} test from Node ${nodes.find(n => n.id === sourceNodeId)?.name}...]\\n`);

        try {
            const res = await fetch('/api/tests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sourceNodeId, targetNodeId, testType })
            });
            const data = await res.json();

            if (res.ok) {
                setOutput(prev => prev + data.output);
            } else {
                setError(data.error || 'Test failed');
                setOutput(prev => prev + `\\n[ERROR] ${data.error || 'Test failed'}`);
            }
        } catch (err) {
            setError('Network error running test');
            setOutput(prev => prev + `\\n[ERROR] Network request failed.`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Activity className="w-8 h-8 text-info" /> Network Diagnostics
                </h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Test Controls */}
                <div className="glass-panel p-6 h-fit">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        Configure Test
                    </h2>

                    <form onSubmit={runTest} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-secondary mb-1">Test Type</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setTestType('ping')}
                                    className={`py-2 px-4 rounded-md text-sm font-medium transition-all ${testType === 'ping'
                                            ? 'bg-info/20 text-info border border-info/50 shadow-[inset_0_0_10px_rgba(14,165,233,0.3)]'
                                            : 'bg-black/20 text-secondary border border-border-color hover:bg-white/5'
                                        }`}
                                >
                                    ICMP Ping
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTestType('iperf3')}
                                    className={`py-2 px-4 rounded-md text-sm font-medium transition-all ${testType === 'iperf3'
                                            ? 'bg-warning/20 text-warning border border-warning/50 shadow-[inset_0_0_10px_rgba(245,158,11,0.3)]'
                                            : 'bg-black/20 text-secondary border border-border-color hover:bg-white/5'
                                        }`}
                                >
                                    iPerf3 Speed
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-secondary mb-1">Source Node (Executor)</label>
                            <select className="input-base" value={sourceNodeId} onChange={e => setSourceNodeId(e.target.value)} required>
                                <option value="">Select Node</option>
                                {nodes.map(n => <option key={n.id} value={n.id}>{n.name} ({n.ip})</option>)}
                            </select>
                        </div>

                        <div className={`transition-opacity ${testType === 'iperf3' || testType === 'ping' ? 'opacity-100' : 'opacity-0 h-0 hidden'}`}>
                            <label className="block text-sm font-medium text-secondary mb-1">Target Node</label>
                            <select className="input-base" value={targetNodeId} onChange={e => setTargetNodeId(e.target.value)}>
                                <option value="">Select Target (Optional for Ping)</option>
                                {nodes.filter(n => n.id !== sourceNodeId).map(n => <option key={n.id} value={n.id}>{n.name} ({n.ip})</option>)}
                            </select>
                        </div>

                        {error && (
                            <div className="bg-error/10 text-error p-3 rounded-md text-sm border border-error/20">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || nodes.length === 0}
                            className={`btn-primary w-full mt-4 justify-center gap-2 ${testType === 'iperf3' ? '!bg-warning hover:!bg-amber-400' : '!bg-info hover:!bg-sky-400'
                                }`}
                        >
                            {loading ? (
                                <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
                            ) : (
                                <>
                                    <Play className="w-4 h-4" /> Start {testType.toUpperCase()}
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Terminal Output */}
                <div className="lg:col-span-2 glass-panel p-6 flex flex-col font-mono relative overflow-hidden h-[500px]">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-info to-transparent opacity-30"></div>

                    <div className="flex items-center gap-2 mb-4 text-secondary/70 border-b border-border-color/50 pb-2">
                        <Terminal className="w-5 h-5" />
                        <span className="text-sm">Session Output</span>
                        {loading && <span className="ml-auto flex items-center gap-2 text-xs text-info animate-pulse"><div className="w-2 h-2 rounded-full bg-info"></div> Executing...</span>}
                    </div>

                    <div className="flex-1 bg-black/50 border border-border-color/30 rounded-lg p-4 overflow-y-auto text-sm text-green-400 whitespace-pre-wrap">
                        {output || <span className="text-secondary/50 italic">Awaiting command execution...</span>}
                    </div>
                </div>
            </div>
        </>
    );
}
