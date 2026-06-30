import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Shield, Loader2 } from 'lucide-react';

export default function Login() {
  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await login(dni, password);
      navigate('/');
    } catch {}
  };

  return (
    <div className="min-h-screen bg-[#0f0f23] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-nexus-600/20 via-transparent to-purple-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-nexus-500/15 via-transparent to-indigo-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-nexus-500/5 rounded-full blur-3xl" />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
        backgroundSize: '50px 50px'
      }} />

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-nexus-500 to-nexus-700 shadow-glow mb-6 relative">
            <Shield className="w-12 h-12 text-white" strokeWidth={1.5} />
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-transparent to-white/10" />
          </div>
          <h1 className="text-5xl font-bold text-white tracking-tight mb-2">
            <span className="gradient-text">NEXUS</span>
          </h1>
          <p className="text-nexus-300/70 text-sm tracking-widest uppercase">Mensajeria Institucional</p>
        </div>

        {/* Login Form */}
        <div className="bg-white/[0.03] backdrop-blur-xl rounded-3xl shadow-premium-xl border border-white/[0.06] p-8 relative overflow-hidden">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />

          <h2 className="text-xl font-semibold text-white mb-8 text-center relative">Iniciar Sesion</h2>

          <form onSubmit={handleSubmit} className="space-y-5 relative">
            <div>
              <label className="block text-xs font-medium text-nexus-300/60 mb-2 uppercase tracking-wider">DNI</label>
              <div className="relative">
                <input
                  type="text"
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  placeholder="Ingrese su DNI"
                  className="w-full px-4 py-3.5 bg-white/[0.04] border border-white/[0.08] rounded-2xl text-white placeholder-nexus-400/40 focus:outline-none focus:ring-2 focus:ring-nexus-500/50 focus:border-nexus-500/50 transition-all duration-300"
                  required
                  autoFocus
                />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-nexus-500/5 to-transparent opacity-0 focus-within:opacity-100 transition-opacity pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-nexus-300/60 mb-2 uppercase tracking-wider">Contrasena</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingrese su contrasena"
                  className="w-full px-4 py-3.5 bg-white/[0.04] border border-white/[0.08] rounded-2xl text-white placeholder-nexus-400/40 focus:outline-none focus:ring-2 focus:ring-nexus-500/50 focus:border-nexus-500/50 transition-all duration-300"
                  required
                />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-nexus-500/5 to-transparent opacity-0 focus-within:opacity-100 transition-opacity pointer-events-none" />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3 text-red-300/90 text-sm text-center backdrop-blur-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-nexus-600 to-nexus-500 hover:from-nexus-500 hover:to-nexus-400 disabled:from-nexus-800 disabled:to-nexus-700 text-white font-semibold rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-glow hover:shadow-glow-lg btn-premium relative overflow-hidden"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="relative z-10">Verificando...</span>
                </>
              ) : (
                <span className="relative z-10">Ingresar</span>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/[0.05] relative">
            <p className="text-nexus-400/40 text-xs text-center tracking-wide">
              Solo personal autorizado de Prefectura
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-nexus-400/20 text-xs mt-6 tracking-wider">
          Powered by NEXUS v2.0
        </p>
      </div>
    </div>
  );
}
