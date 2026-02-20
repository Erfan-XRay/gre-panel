'use client';

import { useState } from 'react';
import { Network, Lock, User, Terminal, ArrowRight, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        router.push('/dashboard');
      } else {
        const data = await res.json();
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('An error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="glass-panel p-8 text-center relative overflow-hidden">
          {/* Subtle Background Elements within Panel */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent-primary to-transparent opacity-50"></div>

          <div className="flex justify-center mb-6 relative">
            <div className="w-16 h-16 rounded-full bg-accent-glow flex items-center justify-center backdrop-blur-md border border-border-color shadow-glow z-10">
              <Network className="w-8 h-8 text-accent-primary" />
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-2">GRE/VXLAN Hub</h1>
          <p className="text-secondary mb-8">Secure Access Portal</p>

          <form onSubmit={handleLogin} className="flex flex-col gap-4 text-left">
            {error && (
              <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-md flex items-center gap-2 text-sm">
                <ShieldCheck className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-secondary">
                <User className="h-5 w-5" />
              </div>
              <input
                type="text"
                placeholder="Username"
                className="input-base pl-10"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-secondary">
                <Lock className="h-5 w-5" />
              </div>
              <input
                type="password"
                placeholder="Password"
                className="input-base pl-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full mt-4 flex items-center justify-center gap-2 group"
              disabled={loading}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  Initialize Session <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 flex justify-center gap-6 text-secondary/50">
            <Terminal className="w-5 h-5" />
            <Network className="w-5 h-5" />
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>
    </main>
  );
}
