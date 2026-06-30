import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { useThemeStore } from '../store/themeStore';
import UserAvatar from './UserAvatar';
import NewChatModal from './NewChatModal';
import AdminPanel from './AdminPanel';
import Settings from './Settings';
import { api } from '../services/api';
import { Search, Plus, Shield, LogOut, Settings as SettingsIcon, Users, Archive, Moon, Sun, MoreVertical, Pin, Bell, BellOff, Pencil, LogOut as LeaveIcon, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Sidebar() {
  const [search, setSearch] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [menuConvoId, setMenuConvoId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const conversations = useChatStore((s) => s.conversations);
  const currentConversation = useChatStore((s) => s.currentConversation);
  const setCurrentConversation = useChatStore((s) => s.setCurrentConversation);
  const fetchMessages = useChatStore((s) => s.fetchMessages);
  const fetchConversations = useChatStore((s) => s.fetchConversations);
  const token = useAuthStore((s) => s.token)!;
  const { theme, toggleTheme } = useThemeStore();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuConvoId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredConversations = conversations.filter((c) => {
    if (showArchived ? !c.is_archived : c.is_archived) return false;
    if (!search) return true;
    const name = c.name || c.participants
      .filter((p) => p.id !== user?.id)
      .map((p) => `${p.nombre} ${p.apellido}`)
      .join(', ');
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const archivedCount = conversations.filter((c) => c.is_archived).length;

  const getConversationName = (convo: typeof conversations[0]) => {
    if (convo.name) return convo.name;
    return convo.participants
      .filter((p) => p.id !== user?.id)
      .map((p) => `${p.nombre} ${p.apellido}`)
      .join(', ');
  };

  const handleSelectConversation = async (convo: typeof conversations[0]) => {
    setMenuConvoId(null);
    setCurrentConversation(convo);
    await fetchMessages(convo.id, token);
  };

  const handleMenuAction = async (action: string, convo: typeof conversations[0]) => {
    setMenuConvoId(null);
    try {
      switch (action) {
        case 'pin':
          await api(`/conversations/${convo.id}/pin`, { method: 'POST', token, body: { pinned: !convo.is_pinned } });
          toast.success(convo.is_pinned ? 'Desfijada' : 'Fijada');
          break;
        case 'mute':
          await api(`/conversations/${convo.id}/mute`, { method: 'POST', token, body: { muted: !convo.is_muted } });
          toast.success(convo.is_muted ? 'Activada' : 'Silenciada');
          break;
        case 'archive':
          await api(`/conversations/${convo.id}/archive`, { method: 'POST', token, body: { archived: !convo.is_archived } });
          toast.success(convo.is_archived ? 'Restaurada' : 'Archivada');
          break;
        case 'rename': {
          const name = prompt('Nuevo nombre:', convo.name || '');
          if (name !== null && name.trim()) {
            await api(`/conversations/${convo.id}`, { method: 'PUT', token, body: { name: name.trim() } });
            toast.success('Nombre actualizado');
          }
          break;
        }
        case 'leave':
          if (confirm('Salir de esta conversacion?')) {
            await api(`/conversations/${convo.id}/leave`, { method: 'POST', token });
            toast.success('Saliste de la conversacion');
            if (currentConversation?.id === convo.id) setCurrentConversation(null);
          }
          break;
        case 'delete':
          if (confirm('Eliminar esta conversacion?')) {
            await api(`/conversations/${convo.id}`, { method: 'DELETE', token });
            toast.success('Eliminada');
            if (currentConversation?.id === convo.id) setCurrentConversation(null);
          }
          break;
      }
      await fetchConversations(token);
    } catch (err: any) {
      toast.error(err.message || 'Error');
    }
  };

  return (
    <>
      <div className="w-full sm:w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full">
        {/* Header */}
        <div className="p-4 bg-nexus-600 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/20 rounded-xl">
              <Shield className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-bold">NEXUS</h1>
              <p className="text-xs text-nexus-200">Mensajeria Institucional</p>
            </div>
            <button onClick={toggleTheme} className="p-2 hover:bg-white/10 rounded-xl transition-colors" title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}>
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nexus-300" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar conversaciones..."
              className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-nexus-300 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="p-2 border-b border-gray-100 dark:border-gray-700 flex gap-2">
          <button
            onClick={() => setShowNewChat(true)}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-nexus-50 hover:bg-nexus-100 dark:bg-nexus-900/30 dark:hover:bg-nexus-900/50 text-nexus-700 dark:text-nexus-300 rounded-xl transition-colors font-medium text-sm"
          >
            <Plus className="w-4 h-4" /> Nueva
          </button>
          {archivedCount > 0 && (
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`flex items-center justify-center gap-1 px-3 py-2 rounded-xl transition-colors text-sm ${
                showArchived
                  ? 'bg-nexus-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Archive className="w-4 h-4" /> {archivedCount}
            </button>
          )}
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-gray-400 dark:text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-sm">{showArchived ? 'No hay conversaciones archivadas' : 'No hay conversaciones'}</p>
              {!showArchived && <p className="text-xs mt-1">Crea una nueva para comenzar</p>}
            </div>
          ) : (
            filteredConversations.map((convo) => (
              <div
                key={convo.id}
                className={`relative flex items-center border-b border-gray-50 dark:border-gray-700/50 ${
                  currentConversation?.id === convo.id ? 'bg-nexus-50 dark:bg-nexus-900/20 border-l-4 border-l-nexus-500' : ''
                }`}
              >
                <button
                  onClick={() => handleSelectConversation(convo)}
                  className="flex-1 p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                >
                  <UserAvatar
                    name={getConversationName(convo)}
                    isOnline={convo.participants.some((p) => p.id !== user?.id && p.is_online)}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate flex items-center gap-1">
                        {convo.is_pinned === 1 && <Pin className="w-3 h-3 text-nexus-500 fill-nexus-500 flex-shrink-0" />}
                        {convo.name && <span className="text-nexus-500 text-xs flex-shrink-0">👥</span>}
                        {getConversationName(convo)}
                      </p>
                      {convo.last_message_at && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 ml-2 flex-shrink-0">
                          {formatTime(convo.last_message_at)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
                        {convo.is_muted === 1 && <BellOff className="w-3 h-3 text-gray-400 flex-shrink-0" />}
                        {convo.last_message || 'Sin mensajes'}
                      </p>
                      {convo.unread_count > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-nexus-500 text-white text-xs rounded-full font-medium">
                          {convo.unread_count > 99 ? '99+' : convo.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                {/* Three dots menu */}
                <div className="pr-2 flex-shrink-0" ref={menuConvoId === convo.id ? menuRef : undefined}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuConvoId(menuConvoId === convo.id ? null : convo.id);
                    }}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {menuConvoId === convo.id && (
                    <div className="absolute right-2 top-12 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-1 min-w-[180px] animate-in">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMenuAction('pin', convo); }}
                        className="w-full px-3 py-2 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Pin className="w-4 h-4" />
                        {convo.is_pinned ? 'Desfijar' : 'Fijar'}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMenuAction('mute', convo); }}
                        className="w-full px-3 py-2 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        {convo.is_muted ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                        {convo.is_muted ? 'Activar notificaciones' : 'Silenciar'}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMenuAction('archive', convo); }}
                        className="w-full px-3 py-2 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Archive className="w-4 h-4" />
                        {convo.is_archived ? 'Restaurar' : 'Archivar'}
                      </button>
                      {convo.type === 'group' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMenuAction('rename', convo); }}
                          className="w-full px-3 py-2 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                          Renombrar
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMenuAction('leave', convo); }}
                        className="w-full px-3 py-2 flex items-center gap-3 text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                      >
                        <LeaveIcon className="w-4 h-4" />
                        Salir
                      </button>
                      <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMenuAction('delete', convo); }}
                        className="w-full px-3 py-2 flex items-center gap-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* User Info */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            <UserAvatar name={`${user?.nombre} ${user?.apellido}`} isOnline={true} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {user?.nombre} {user?.apellido}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
            </div>
            {user?.role === 'admin' && (
              <button
                onClick={() => setShowAdmin(true)}
                className="p-2 text-gray-400 hover:text-nexus-600 dark:hover:text-nexus-400 hover:bg-nexus-50 dark:hover:bg-nexus-900/30 rounded-lg transition-colors"
                title="Panel de administracion"
              >
                <Shield className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Configuracion"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Cerrar sesion"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} />}
      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </>
  );
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  } else if (days === 1) {
    return 'Ayer';
  } else if (days < 7) {
    return date.toLocaleDateString('es', { weekday: 'short' });
  } else {
    return date.toLocaleDateString('es', { day: '2-digit', month: '2-digit' });
  }
}
