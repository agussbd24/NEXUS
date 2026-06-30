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

  useEffect(() => {
    loadUsers();
  }, []);

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-nexus-600" />
            <h2 className="text-lg font-semibold">Panel de Administracion</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o DNI..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 text-nexus-500 animate-spin mx-auto" />
            </div>
          ) : filteredUsers.map((user) => (
            <div key={user.id} className="p-3 flex items-center gap-3 border-b border-gray-50 hover:bg-gray-50">
              <UserAvatar name={`${user.nombre} ${user.apellido}`} isOnline={!!user.is_online} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user.nombre} {user.apellido}</p>
                <p className="text-xs text-gray-500">DNI: {user.dni}</p>
              </div>
              <select
                value={user.role}
                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                className="text-xs px-2 py-1 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-nexus-500"
              >
                <option value="agente">Agente</option>
                <option value="oficial">Oficial</option>
                <option value="admin">Admin</option>
              </select>
              <button
                onClick={() => setEditingUser(user)}
                className="p-1.5 text-gray-400 hover:text-nexus-600 hover:bg-nexus-50 rounded-lg"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(user.id)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => setShowCreate(true)}
            className="w-full py-2.5 bg-nexus-600 hover:bg-nexus-500 text-white font-medium rounded-xl transition-colors"
          >
            + Crear Usuario
          </button>
        </div>
      </div>

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={loadUsers}
          token={token}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onUpdated={loadUsers}
          token={token}
        />
      )}
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Crear Usuario</h3>
        <div className="space-y-3">
          <input type="text" placeholder="DNI" value={dni} onChange={(e) => setDni(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500" />
          <input type="text" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500" />
          <input type="text" placeholder="Apellido" value={apellido} onChange={(e) => setApellido(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500" />
          <input type="password" placeholder="Contrasena" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500" />
          <select value={role} onChange={(e) => setRole(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500">
            <option value="agente">Agente</option>
            <option value="oficial">Oficial</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancelar</button>
          <button onClick={handleCreate} disabled={loading}
            className="flex-1 py-2 bg-nexus-600 text-white rounded-xl text-sm hover:bg-nexus-500 disabled:opacity-50">
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Editar Usuario</h3>
        <div className="space-y-3">
          <input type="text" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500" />
          <input type="text" placeholder="Apellido" value={apellido} onChange={(e) => setApellido(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500" />
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSave} disabled={loading}
            className="flex-1 py-2 bg-nexus-600 text-white rounded-xl text-sm hover:bg-nexus-500 disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
