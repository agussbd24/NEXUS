import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import { X, Lock, User, Loader2, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface SettingsProps {
  onClose: () => void;
}

export default function Settings({ onClose }: SettingsProps) {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token)!;
  const fetchUser = useAuthStore((s) => s.fetchUser);

  const [tab, setTab] = useState<'password' | 'profile'>('password');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nombre, setNombre] = useState(user?.nombre || '');
  const [apellido, setApellido] = useState(user?.apellido || '');
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
        method: 'POST',
        token,
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
        method: 'PUT',
        token,
        body: { nombre, apellido },
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
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Configuracion</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setTab('password')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === 'password' ? 'border-nexus-600 text-nexus-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Lock className="w-4 h-4 inline mr-1" />
            Contrasena
          </button>
          <button
            onClick={() => setTab('profile')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === 'profile' ? 'border-nexus-600 text-nexus-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <User className="w-4 h-4 inline mr-1" />
            Perfil
          </button>
        </div>

        <div className="p-4">
          {tab === 'password' ? (
            <div className="space-y-3">
              <input
                type="password"
                placeholder="Contrasena actual"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500"
              />
              <input
                type="password"
                placeholder="Nueva contrasena"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500"
              />
              <input
                type="password"
                placeholder="Confirmar contrasena"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500"
              />
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
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">DNI</label>
                <input type="text" value={user?.dni || ''} disabled
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Nombre</label>
                <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Apellido</label>
                <input type="text" value={apellido} onChange={(e) => setApellido(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500" />
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
          )}
        </div>
      </div>
    </div>
  );
}
