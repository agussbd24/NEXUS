import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { useThemeStore } from '../store/themeStore';
import UserAvatar from './UserAvatar';
import NewChatModal from './NewChatModal';
import AdminPanel from './AdminPanel';
import Settings from './Settings';
import { Search, Plus, Shield, LogOut, Settings as SettingsIcon, Users, Archive, Moon, Sun } from 'lucide-react';

export default function Sidebar() {
  const [search, setSearch] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const conversations = useChatStore((s) => s.conversations);
  const currentConversation = useChatStore((s) => s.currentConversation);
  const setCurrentConversation = useChatStore((s) => s.setCurrentConversation);
  const fetchMessages = useChatStore((s) => s.fetchMessages);
  const token = useAuthStore((s) => s.token)!;
  const { theme, toggleTheme } = useThemeStore();

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
    setCurrentConversation(convo);
    await fetchMessages(convo.id, token);
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
              <button
                key={convo.id}
                onClick={() => handleSelectConversation(convo)}
                className={`w-full p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-50 dark:border-gray-700/50 ${
                  currentConversation?.id === convo.id ? 'bg-nexus-50 dark:bg-nexus-900/20 border-l-4 border-l-nexus-500' : ''
                }`}
              >
                <UserAvatar
                  name={getConversationName(convo)}
                  isOnline={convo.participants.some((p) => p.id !== user?.id && p.is_online)}
                  size="md"
                />
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate flex items-center gap-1">
                      {convo.is_pinned === 1 && <span className="text-nexus-500">📌</span>}
                      {convo.name && <span className="text-nexus-500 text-xs">👥</span>}
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
                      {convo.is_muted === 1 && <span title="Silenciado">🔇</span>}
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
