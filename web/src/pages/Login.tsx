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
    <div className="min-h-screen bg-gradient-to-br from-nexus-900 via-nexus-800 to-nexus-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-nexus-600 rounded-2xl shadow-lg shadow-nexus-600/30 mb-4">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">NEXUS</h1>
          <p className="text-nexus-300 mt-2">Mensajeria Institucional</p>
        </div>

        {/* Login Form */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8">
          <h2 className="text-xl font-semibold text-white mb-6 text-center">Iniciar Sesion</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-nexus-200 mb-2">DNI</label>
              <input
                type="text"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                placeholder="Ingrese su DNI"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-nexus-400 focus:outline-none focus:ring-2 focus:ring-nexus-500 focus:border-transparent transition-all"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-nexus-200 mb-2">Contrasena</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingrese su contrasena"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-nexus-400 focus:outline-none focus:ring-2 focus:ring-nexus-500 focus:border-transparent transition-all"
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3 text-red-200 text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-nexus-600 hover:bg-nexus-500 disabled:bg-nexus-700 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-nexus-600/30"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Ingresar'
              )}
            </button>
          </form>

          <p className="text-nexus-400 text-xs text-center mt-6">
            Solo personal autorizado de Prefectura
          </p>
        </div>
      </div>
    </div>
  );
}
