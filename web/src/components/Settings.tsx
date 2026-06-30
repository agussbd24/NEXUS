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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Configuracion</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-gray-200 dark:border-gray-700">
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

        <div className="p-4">
          {tab === 'profile' ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">DNI</label>
                <input type="text" value={user?.dni || ''} disabled
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Nombre</label>
                <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500 dark:text-white" />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Apellido</label>
                <input type="text" value={apellido} onChange={(e) => setApellido(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500 dark:text-white" />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" /> Estado / Acerca de
                </label>
                <input type="text" value={status} onChange={(e) => setStatus(e.target.value)}
                  placeholder="Escribe tu estado..."
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500 dark:text-white" />
              </div>
              <button
                onClick={handleUpdateProfile}
                disabled={loading}
                className="w-full py-2.5 bg-nexus-600 hover:bg-nexus-500 disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Guardar cambios
              </button>
            </div>
          ) : tab === 'password' ? (
            <div className="space-y-3">
              <input type="password" placeholder="Contrasena actual" value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500 dark:text-white dark:bg-gray-700" />
              <input type="password" placeholder="Nueva contrasena" value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500 dark:text-white dark:bg-gray-700" />
              <input type="password" placeholder="Confirmar contrasena" value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500 dark:text-white dark:bg-gray-700" />
              <button
                onClick={handleChangePassword}
                disabled={loading}
                className="w-full py-2.5 bg-nexus-600 hover:bg-nexus-500 disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Actualizar contrasena
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Apariencia de la aplicacion</p>
              <div className="flex gap-3">
                <button
                  onClick={() => theme !== 'light' && toggleTheme()}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                    theme === 'light'
                      ? 'border-nexus-500 bg-nexus-50 dark:bg-nexus-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Sun className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Claro</p>
                </button>
                <button
                  onClick={() => theme !== 'dark' && toggleTheme()}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                    theme === 'dark'
                      ? 'border-nexus-500 bg-nexus-50 dark:bg-nexus-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Moon className="w-8 h-8 mx-auto mb-2 text-indigo-400" />
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Oscuro</p>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
