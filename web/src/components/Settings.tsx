import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { api } from '../services/api';
import { X, Lock, User, Loader2, Check, Moon, Sun, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

interface SettingsProps {
  onClose: () => void;
}

export default function Settings({ onClose }: SettingsProps) {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token)!;
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const { theme, toggleTheme } = useThemeStore();

  const [tab, setTab] = useState<'password' | 'profile' | 'appearance'>('profile');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nombre, setNombre] = useState(user?.nombre || '');
  const [apellido, setApellido] = useState(user?.apellido || '');
  const [status, setStatus] = useState((user as any)?.status || '');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error('Todos los campos son requeridos');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Las contrasenas no coinciden');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Minimo 6 caracteres');
      return;
    }
    setLoading(true);
    try {
      await api('/auth/change-password', {
        method: 'POST', token,
        body: { currentPassword, newPassword },
      });
      toast.success('Contrasena actualizada');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Error al cambiar contrasena');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await api(`/users/${user.id}`, {
        method: 'PUT', token,
        body: { nombre, apellido },
      });
      await api('/auth/status', {
        method: 'PUT', token,
        body: { status },
      });
      await fetchUser();
      toast.success('Perfil actualizado');
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md shadow-premium-xl overflow-hidden border border-gray-200/60 dark:border-gray-800/60">
        <div className="flex items-center justify-between p-5 border-b border-gray-200/40 dark:border-gray-800/40">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Configuracion</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-gray-200/40 dark:border-gray-800/40">
          {[
            { key: 'profile' as const, icon: User, label: 'Perfil' },
            { key: 'password' as const, icon: Lock, label: 'Contrasena' },
            { key: 'appearance' as const, icon: theme === 'dark' ? Moon : Sun, label: 'Tema' },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === key ? 'border-nexus-600 text-nexus-600 dark:text-nexus-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="w-4 h-4 inline mr-1" />
              {label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === 'profile' ? (
            <div className="space-y-3.5">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 block font-medium uppercase tracking-wider">DNI</label>
                <input type="text" value={user?.dni || ''} disabled
                  className="w-full px-4 py-3 border border-gray-200/60 dark:border-gray-700/60 rounded-xl text-sm bg-gray-50/80 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 block font-medium uppercase tracking-wider">Nombre</label>
                <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200/60 dark:border-gray-700/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500/30 dark:text-white bg-gray-50/80 dark:bg-gray-800/80 transition-all" />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 block font-medium uppercase tracking-wider">Apellido</label>
                <input type="text" value={apellido} onChange={(e) => setApellido(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200/60 dark:border-gray-700/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500/30 dark:text-white bg-gray-50/80 dark:bg-gray-800/80 transition-all" />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 block font-medium uppercase tracking-wider flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" /> Estado / Acerca de
                </label>
                <input type="text" value={status} onChange={(e) => setStatus(e.target.value)}
                  placeholder="Escribe tu estado..."
                  className="w-full px-4 py-3 border border-gray-200/60 dark:border-gray-700/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500/30 dark:text-white bg-gray-50/80 dark:bg-gray-800/80 transition-all" />
              </div>
              <button
                onClick={handleUpdateProfile}
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-nexus-600 to-nexus-500 hover:from-nexus-500 hover:to-nexus-400 disabled:opacity-50 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 btn-premium shadow-glow"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Guardar cambios
              </button>
            </div>
          ) : tab === 'password' ? (
            <div className="space-y-3.5">
              <input type="password" placeholder="Contrasena actual" value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50/80 dark:bg-gray-800/80 border border-gray-200/60 dark:border-gray-700/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500/30 dark:text-white transition-all" />
              <input type="password" placeholder="Nueva contrasena" value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50/80 dark:bg-gray-800/80 border border-gray-200/60 dark:border-gray-700/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500/30 dark:text-white transition-all" />
              <input type="password" placeholder="Confirmar contrasena" value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50/80 dark:bg-gray-800/80 border border-gray-200/60 dark:border-gray-700/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500/30 dark:text-white transition-all" />
              <button
                onClick={handleChangePassword}
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-nexus-600 to-nexus-500 hover:from-nexus-500 hover:to-nexus-400 disabled:opacity-50 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 btn-premium shadow-glow"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Actualizar contrasena
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Apariencia de la aplicacion</p>
              <div className="flex gap-3">
                <button
                  onClick={() => theme !== 'light' && toggleTheme()}
                  className={`flex-1 p-5 rounded-2xl border-2 transition-all ${
                    theme === 'light'
                      ? 'border-nexus-500 bg-nexus-50 dark:bg-nexus-900/20 shadow-glow'
                      : 'border-gray-200/60 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <Sun className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Claro</p>
                </button>
                <button
                  onClick={() => theme !== 'dark' && toggleTheme()}
                  className={`flex-1 p-5 rounded-2xl border-2 transition-all ${
                    theme === 'dark'
                      ? 'border-nexus-500 bg-nexus-50 dark:bg-nexus-900/20 shadow-glow'
                      : 'border-gray-200/60 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <Moon className="w-8 h-8 mx-auto mb-2 text-indigo-400" />
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Oscuro</p>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
