import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import UserAvatar from './UserAvatar';
import { X, Search, Users, Loader2, Trash2, Shield, Edit3 } from 'lucide-react';
import toast from 'react-hot-toast';

interface User {
  id: number;
  dni: string;
  nombre: string;
  apellido: string;
  role: string;
  avatar_url: string | null;
  status: string;
  last_seen: string;
  is_online: number;
}

interface AdminPanelProps {
  onClose: () => void;
}

export default function AdminPanel({ onClose }: AdminPanelProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const token = useAuthStore((s) => s.token)!;

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      const data = await api('/users', { token });
      setUsers(data.users);
    } catch {
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const full = `${u.nombre} ${u.apellido}`.toLowerCase();
    return full.includes(search.toLowerCase()) || u.dni.includes(search);
  });

  const handleDelete = async (userId: number) => {
    if (!confirm('Eliminar este usuario?')) return;
    try {
      await api(`/users/${userId}`, { method: 'DELETE', token });
      toast.success('Usuario eliminado');
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar');
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      await api(`/users/${userId}`, { method: 'PUT', token, body: { role: newRole } });
      toast.success('Rol actualizado');
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg shadow-premium-xl overflow-hidden max-h-[90vh] flex flex-col border border-gray-200/60 dark:border-gray-800/60">
        <div className="flex items-center justify-between p-5 border-b border-gray-200/40 dark:border-gray-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-nexus-100 dark:bg-nexus-900/30 rounded-xl">
              <Shield className="w-5 h-5 text-nexus-600 dark:text-nexus-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Panel de Administracion</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-200/40 dark:border-gray-800/40">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o DNI..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100/80 dark:bg-gray-800/80 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500/30 dark:text-white placeholder-gray-400 transition-all" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 text-nexus-500 animate-spin mx-auto" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl mb-4">
                <Users className="w-8 h-8 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-gray-400 dark:text-gray-500 text-sm">No se encontraron usuarios</p>
            </div>
          ) : filteredUsers.map((user) => (
            <div key={user.id} className="p-4 flex items-center gap-3 border-b border-gray-100/60 dark:border-gray-800/60 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
              <UserAvatar name={`${user.nombre} ${user.apellido}`} isOnline={!!user.is_online} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user.nombre} {user.apellido}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">DNI: {user.dni}</p>
                {user.status && <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{user.status}</p>}
              </div>
              <select value={user.role} onChange={(e) => handleRoleChange(user.id, e.target.value)}
                className="text-xs px-2.5 py-1.5 border border-gray-200/60 dark:border-gray-700/60 rounded-xl bg-white dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-nexus-500/30 transition-all cursor-pointer">
                <option value="agente">Agente</option>
                <option value="oficial">Oficial</option>
                <option value="admin">Admin</option>
              </select>
              <button onClick={() => setEditingUser(user)} className="p-2 text-gray-400 hover:text-nexus-600 dark:hover:text-nexus-400 hover:bg-nexus-50 dark:hover:bg-nexus-900/30 rounded-xl transition-colors">
                <Edit3 className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(user.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-200/40 dark:border-gray-800/40 bg-gray-50/50 dark:bg-gray-900/50">
          <button onClick={() => setShowCreate(true)}
            className="w-full py-3 bg-gradient-to-r from-nexus-600 to-nexus-500 hover:from-nexus-500 hover:to-nexus-400 text-white font-semibold rounded-xl transition-all duration-300 btn-premium shadow-glow">
            + Crear Usuario
          </button>
        </div>
      </div>

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={loadUsers} token={token} />}
      {editingUser && <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} onUpdated={loadUsers} token={token} />}
    </div>
  );
}

function CreateUserModal({ onClose, onCreated, token }: { onClose: () => void; onCreated: () => void; token: string }) {
  const [dni, setDni] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('agente');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!dni || !nombre || !apellido || !password) {
      toast.error('Todos los campos son requeridos');
      return;
    }
    setLoading(true);
    try {
      await api('/auth/register', { method: 'POST', token, body: { dni, nombre, apellido, password, role } });
      toast.success('Usuario creado');
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error al crear usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm shadow-premium-xl p-6 border border-gray-200/60 dark:border-gray-800/60">
        <h3 className="text-lg font-bold mb-5 text-gray-900 dark:text-white">Crear Usuario</h3>
        <div className="space-y-3.5">
          <input type="text" placeholder="DNI" value={dni} onChange={(e) => setDni(e.target.value)}
            className="w-full px-4 py-3 bg-gray-100/80 dark:bg-gray-800/80 border border-gray-200/60 dark:border-gray-700/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500/30 dark:text-white placeholder-gray-400 transition-all" />
          <input type="text" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)}
            className="w-full px-4 py-3 bg-gray-100/80 dark:bg-gray-800/80 border border-gray-200/60 dark:border-gray-700/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500/30 dark:text-white placeholder-gray-400 transition-all" />
          <input type="text" placeholder="Apellido" value={apellido} onChange={(e) => setApellido(e.target.value)}
            className="w-full px-4 py-3 bg-gray-100/80 dark:bg-gray-800/80 border border-gray-200/60 dark:border-gray-700/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500/30 dark:text-white placeholder-gray-400 transition-all" />
          <input type="password" placeholder="Contrasena" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-gray-100/80 dark:bg-gray-800/80 border border-gray-200/60 dark:border-gray-700/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500/30 dark:text-white placeholder-gray-400 transition-all" />
          <select value={role} onChange={(e) => setRole(e.target.value)}
            className="w-full px-4 py-3 bg-gray-100/80 dark:bg-gray-800/80 border border-gray-200/60 dark:border-gray-700/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500/30 dark:text-white transition-all cursor-pointer">
            <option value="agente">Agente</option>
            <option value="oficial">Oficial</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="flex gap-2.5 mt-6">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-200/60 dark:border-gray-700/60 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium transition-colors">Cancelar</button>
          <button onClick={handleCreate} disabled={loading}
            className="flex-1 py-3 bg-gradient-to-r from-nexus-600 to-nexus-500 text-white rounded-xl text-sm font-semibold hover:from-nexus-500 hover:to-nexus-400 disabled:opacity-50 transition-all btn-premium">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditUserModal({ user, onClose, onUpdated, token }: { user: User; onClose: () => void; onUpdated: () => void; token: string }) {
  const [nombre, setNombre] = useState(user.nombre);
  const [apellido, setApellido] = useState(user.apellido);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await api(`/users/${user.id}`, { method: 'PUT', token, body: { nombre, apellido } });
      toast.success('Usuario actualizado');
      onUpdated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm shadow-premium-xl p-6 border border-gray-200/60 dark:border-gray-800/60">
        <h3 className="text-lg font-bold mb-5 text-gray-900 dark:text-white">Editar Usuario</h3>
        <div className="space-y-3.5">
          <input type="text" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)}
            className="w-full px-4 py-3 bg-gray-100/80 dark:bg-gray-800/80 border border-gray-200/60 dark:border-gray-700/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500/30 dark:text-white placeholder-gray-400 transition-all" />
          <input type="text" placeholder="Apellido" value={apellido} onChange={(e) => setApellido(e.target.value)}
            className="w-full px-4 py-3 bg-gray-100/80 dark:bg-gray-800/80 border border-gray-200/60 dark:border-gray-700/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500/30 dark:text-white placeholder-gray-400 transition-all" />
        </div>
        <div className="flex gap-2.5 mt-6">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-200/60 dark:border-gray-700/60 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={loading}
            className="flex-1 py-3 bg-gradient-to-r from-nexus-600 to-nexus-500 text-white rounded-xl text-sm font-semibold hover:from-nexus-500 hover:to-nexus-400 disabled:opacity-50 transition-all btn-premium">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
