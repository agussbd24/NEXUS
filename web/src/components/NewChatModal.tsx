import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { api } from '../services/api';
import UserAvatar from './UserAvatar';
import { X, Search, Users, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface User {
  id: number;
  dni: string;
  nombre: string;
  apellido: string;
  avatar_url: string | null;
  is_online: number;
}

interface NewChatModalProps {
  onClose: () => void;
}

export default function NewChatModal({ onClose }: NewChatModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const token = useAuthStore((s) => s.token)!;
  const currentUser = useAuthStore((s) => s.user);
  const createConversation = useChatStore((s) => s.createConversation);
  const setCurrentConversation = useChatStore((s) => s.setCurrentConversation);
  const fetchMessages = useChatStore((s) => s.fetchMessages);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await api('/users', { token });
      setUsers(data.users.filter((u: User) => u.id !== currentUser?.id));
    } catch {
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const fullName = `${u.nombre} ${u.apellido}`.toLowerCase();
    return fullName.includes(search.toLowerCase()) || u.dni.includes(search);
  });

  const toggleUser = (userId: number) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreate = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Selecciona al menos un usuario');
      return;
    }

    setCreating(true);
    try {
      const type = selectedUsers.length === 1 ? 'direct' : 'group';
      const name = type === 'group'
        ? groupName.trim() || selectedUsers
            .map((id) => {
              const user = users.find((u) => u.id === id);
              return user ? `${user.nombre} ${user.apellido}` : '';
            })
            .join(', ')
        : undefined;

      const conversationId = await createConversation(type, selectedUsers, name, token);

      const convos = useChatStore.getState().conversations;
      const newConvo = convos.find((c) => c.id === conversationId);
      if (newConvo) {
        setCurrentConversation(newConvo);
        await fetchMessages(conversationId, token);
      }

      onClose();
      toast.success('Conversacion creada');
    } catch (err: any) {
      toast.error(err.message || 'Error al crear conversacion');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md shadow-premium-xl overflow-hidden border border-gray-200/60 dark:border-gray-800/60">
        <div className="flex items-center justify-between p-5 border-b border-gray-200/40 dark:border-gray-800/40">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Nueva conversacion</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-200/40 dark:border-gray-800/40">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o DNI..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100/80 dark:bg-gray-800/80 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500/30 dark:text-white placeholder-gray-400 transition-all"
              autoFocus
            />
          </div>
        </div>

        {selectedUsers.length > 0 && (
          <div className="px-4 py-3 border-b border-gray-200/40 dark:border-gray-800/40 bg-nexus-50/30 dark:bg-nexus-900/10">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">
              Seleccionados ({selectedUsers.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {selectedUsers.map((userId) => {
                const user = users.find((u) => u.id === userId);
                if (!user) return null;
                return (
                  <span key={userId} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-nexus-100 dark:bg-nexus-900/40 text-nexus-700 dark:text-nexus-300 rounded-full text-xs font-medium">
                    {user.nombre} {user.apellido}
                    <button onClick={() => toggleUser(userId)} className="hover:text-nexus-900 dark:hover:text-nexus-100 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
            </div>
            {selectedUsers.length > 1 && (
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Nombre del grupo (opcional)"
                className="w-full mt-2.5 px-4 py-2.5 bg-gray-100/80 dark:bg-gray-800/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500/30 dark:text-white placeholder-gray-400 transition-all"
              />
            )}
          </div>
        )}

        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-6 h-6 text-nexus-500 animate-spin mx-auto" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">Cargando usuarios...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-gray-400 dark:text-gray-500">
              <Users className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-sm">No se encontraron usuarios</p>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => toggleUser(user.id)}
                className={`w-full p-3.5 flex items-center gap-3 hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-all ${
                  selectedUsers.includes(user.id) ? 'bg-nexus-50 dark:bg-nexus-900/20' : ''
                }`}
              >
                <UserAvatar name={`${user.nombre} ${user.apellido}`} isOnline={!!user.is_online} size="sm" />
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.nombre} {user.apellido}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">DNI: {user.dni}</p>
                </div>
                {selectedUsers.includes(user.id) && (
                  <div className="w-5 h-5 bg-nexus-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            ))
          )}
        </div>

        <div className="p-4 border-t border-gray-200/40 dark:border-gray-800/40 bg-gray-50/50 dark:bg-gray-900/50">
          <button
            onClick={handleCreate}
            disabled={selectedUsers.length === 0 || creating}
            className="w-full py-3 bg-gradient-to-r from-nexus-600 to-nexus-500 hover:from-nexus-500 hover:to-nexus-400 disabled:from-gray-300 disabled:to-gray-300 dark:disabled:from-gray-600 dark:disabled:to-gray-600 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 btn-premium shadow-glow"
          >
            {creating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Creando...</>
            ) : selectedUsers.length > 1 ? (
              `Crear grupo (${selectedUsers.length})`
            ) : (
              'Iniciar chat'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
