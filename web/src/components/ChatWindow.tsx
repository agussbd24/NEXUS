import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { useWebSocket } from '../hooks/useWebSocket';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import UserAvatar from './UserAvatar';
import ScrollToBottom from './ScrollToBottom';
import { Phone, Video, ArrowLeft, Shield, Info, Trash2, UserPlus, X, Loader2, Search, Bell, BellOff, Archive, Pin, Pencil, LogOut } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export default function ChatWindow() {
  const [showInfo, setShowInfo] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [externalFiles, setExternalFiles] = useState<File[] | null>(null);
  const [highlightMessageId, setHighlightMessageId] = useState<number | null>(null);
  const dragCounterRef = useRef(0);

  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token)!;
  const currentConversation = useChatStore((s) => s.currentConversation);
  const messages = useChatStore((s) => s.messages);
  const typingUsers = useChatStore((s) => s.typingUsers);
  const connectedUsers = useChatStore((s) => s.connectedUsers);
  const setCurrentConversation = useChatStore((s) => s.setCurrentConversation);
  const sendMessageApi = useChatStore((s) => s.sendMessage);
  const markAsRead = useChatStore((s) => s.markAsRead);
  const editMessage = useChatStore((s) => s.editMessage);
  const removeMessage = useChatStore((s) => s.removeMessage);
  const updateReactions = useChatStore((s) => s.updateReactions);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const { sendTyping } = useWebSocket(currentConversation?.id || null);

  const otherParticipants = currentConversation?.participants.filter(
    (p) => p.id !== user?.id
  ) || [];

  const isOnline = otherParticipants.some((p) =>
    connectedUsers.has(p.id) || p.is_online
  );

  const isTyping = otherParticipants.some((p) => typingUsers.has(p.id));

  const conversationName = currentConversation?.name ||
    otherParticipants.map((p) => `${p.nombre} ${p.apellido}`).join(', ');

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const atBottom = scrollHeight - scrollTop - clientHeight < 100;
    setIsAtBottom(atBottom);
    if (atBottom) setUnreadCount(0);
  };

  useEffect(() => {
    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      setUnreadCount((prev) => prev + 1);
    }
  }, [messages]);

  useEffect(() => {
    if (currentConversation && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.sender_id !== user?.id) {
        markAsRead(currentConversation.id, lastMsg.id, token);
        if (isAtBottom) setUnreadCount(0);
      }
    }
  }, [messages, currentConversation, user?.id, token, markAsRead, isAtBottom]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setUnreadCount(0);
  };

  const handleSendMessage = async (content: string, fileUrl?: string, fileName?: string, fileSize?: number) => {
    if (!currentConversation) return;
    await sendMessageApi(
      currentConversation.id,
      content,
      token,
      fileUrl ? 'file' : 'text',
      fileUrl,
      fileName,
      fileSize,
      replyTo?.id
    );
    setReplyTo(null);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !currentConversation) return;
    setSearching(true);
    try {
      const data = await api(`/messages/${currentConversation.id}/search?q=${encodeURIComponent(searchQuery)}`, { token });
      setSearchResults(data.messages);
    } catch {
      toast.error('Error al buscar');
    } finally {
      setSearching(false);
    }
  };

  const handleMute = async () => {
    if (!currentConversation) return;
    try {
      await api(`/conversations/${currentConversation.id}/mute`, {
        method: 'POST', token,
        body: { muted: !currentConversation.is_muted },
      });
      toast.success(currentConversation.is_muted ? 'Conversacion activada' : 'Conversacion silenciada');
      useChatStore.getState().fetchConversations(token);
    } catch {}
  };

  const handleArchive = async () => {
    if (!currentConversation) return;
    try {
      await api(`/conversations/${currentConversation.id}/archive`, {
        method: 'POST', token,
        body: { archived: !currentConversation.is_archived },
      });
      toast.success(currentConversation.is_archived ? 'Conversacion restaurada' : 'Conversacion archivada');
      setCurrentConversation(null);
      useChatStore.getState().fetchConversations(token);
    } catch {}
  };

  const handlePin = async () => {
    if (!currentConversation) return;
    try {
      await api(`/conversations/${currentConversation.id}/pin`, {
        method: 'POST', token,
        body: { pinned: !currentConversation.is_pinned },
      });
      toast.success(currentConversation.is_pinned ? 'Conversacion desfijada' : 'Conversacion fijada');
      useChatStore.getState().fetchConversations(token);
    } catch {}
  };

  const handleLeave = async () => {
    if (!currentConversation) return;
    if (!confirm('Seguro que quieres salir de esta conversacion?')) return;
    try {
      await api(`/conversations/${currentConversation.id}/leave`, { method: 'POST', token });
      toast.success('Saliste de la conversacion');
      setCurrentConversation(null);
      useChatStore.getState().fetchConversations(token);
    } catch (err: any) {
      toast.error(err.message || 'Error');
    }
  };

  const handleRename = async () => {
    const name = prompt('Nuevo nombre de la conversacion:', currentConversation?.name || '');
    if (!name || !currentConversation) return;
    try {
      await api(`/conversations/${currentConversation.id}`, {
        method: 'PUT', token,
        body: { name },
      });
      toast.success('Nombre actualizado');
      useChatStore.getState().fetchConversations(token);
    } catch {}
  };

  const handleDeleteConversation = async () => {
    if (!currentConversation) return;
    if (!confirm('Eliminar esta conversacion?')) return;
    try {
      await api(`/conversations/${currentConversation.id}`, { method: 'DELETE', token });
      setCurrentConversation(null);
      useChatStore.getState().fetchConversations(token);
      toast.success('Conversacion eliminada');
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar');
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      setExternalFiles(files);
    }
  }, []);

  const handleReact = (messageId: number, emoji: string) => {};

  const scrollToMessage = (messageId: number) => {
    setHighlightMessageId(messageId);
    setTimeout(() => setHighlightMessageId(null), 3000);

    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      if (!messages.find((m) => m.id === messageId)) {
        toast('Cargando mensaje...', { icon: '🔍' });
      }
    }
  };

  const handlePinMessage = async (messageId: number) => {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg || !currentConversation) return;
    try {
      await api(`/messages/${currentConversation.id}/${messageId}/pin`, {
        method: 'POST', token,
        body: { pinned: !msg.is_pinned },
      });
    } catch {}
  };

  if (!currentConversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-nexus-100 dark:bg-nexus-900/30 rounded-full mb-4">
            <Shield className="w-12 h-12 text-nexus-400 dark:text-nexus-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">NEXUS</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm">
            Seleccione una conversacion o cree una nueva para comenzar a comunicarse
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-1 flex flex-col h-full relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-nexus-500/10 dark:bg-nexus-400/10 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border-2 border-dashed border-nexus-500 p-12 text-center">
            <div className="text-5xl mb-4">📎</div>
            <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">Suelta los archivos aqui</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Se enviaran automaticamente</p>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="h-14 sm:h-16 px-3 sm:px-4 flex items-center gap-2 sm:gap-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <button
          onClick={() => setCurrentConversation(null)}
          className="lg:hidden p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <UserAvatar name={conversationName} isOnline={isOnline} size="md" />

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate text-sm sm:text-base">{conversationName}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {isTyping ? (
              <span className="text-nexus-500 font-medium">Escribiendo...</span>
            ) : isOnline ? (
              <span className="text-green-500">En linea</span>
            ) : (
              `${otherParticipants.length} participante${otherParticipants.length !== 1 ? 's' : ''}`
            )}
          </p>
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1">
          <button onClick={() => setShowSearch(!showSearch)} className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Buscar">
            <Search className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button onClick={handleMute} className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title={currentConversation.is_muted ? 'Activar notificaciones' : 'Silenciar'}>
            {currentConversation.is_muted ? <BellOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Bell className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
          <button onClick={handlePin} className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title={currentConversation.is_pinned ? 'Desfijar' : 'Fijar'}>
            <Pin className={`w-4 h-4 sm:w-5 sm:h-5 ${currentConversation.is_pinned ? 'text-nexus-500 fill-nexus-500' : ''}`} />
          </button>
          <button onClick={() => setShowInfo(!showInfo)} className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Info">
            <Info className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button onClick={handleDeleteConversation} className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="Eliminar">
            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="px-3 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Buscar en conversacion..."
            className="flex-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm outline-none dark:text-white"
            autoFocus
          />
          <button onClick={handleSearch} disabled={searching} className="px-3 py-1.5 bg-nexus-600 text-white text-sm rounded-xl">
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
          </button>
          <button onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }} className="p-1.5 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search results */}
      {searchResults.length > 0 && (
        <div className="px-3 py-2 bg-nexus-50 dark:bg-nexus-900/20 border-b border-nexus-200 dark:border-nexus-800 max-h-60 overflow-y-auto">
          <p className="text-xs text-nexus-600 dark:text-nexus-400 font-medium mb-1">{searchResults.length} resultado(s)</p>
          {searchResults.map((msg) => (
            <button
              key={msg.id}
              onClick={() => { scrollToMessage(msg.id); setSearchResults([]); setSearchQuery(''); setShowSearch(false); }}
              className="w-full text-left py-2 px-2 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors flex items-start gap-2 group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-nexus-700 dark:text-nexus-300">{msg.sender_nombre} {msg.sender_apellido}</span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">{new Date(msg.created_at).toLocaleString('es', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{msg.content}</p>
              </div>
              <span className="text-xs text-nexus-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5">Ir →</span>
            </button>
          ))}
        </div>
      )}

      {/* Info panel */}
      {showInfo && (
        <ConversationInfo
          conversation={currentConversation}
          currentUserId={user?.id || 0}
          token={token}
          onClose={() => setShowInfo(false)}
          onRename={handleRename}
          onLeave={handleLeave}
          onUpdate={async () => {
            const data = await api(`/conversations/${currentConversation.id}`, { token });
            setCurrentConversation(data.conversation);
          }}
        />
      )}

      {/* Messages */}
      <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto relative">
        <MessageList
          messages={messages}
          currentUserId={user?.id || 0}
          messagesEndRef={messagesEndRef}
          onReply={(msg) => setReplyTo({ id: msg.id, content: msg.content || msg.file_name || 'Archivo', sender: `${msg.sender_nombre} ${msg.sender_apellido}` })}
          onEdit={editMessage}
          onDelete={removeMessage}
          onReact={handleReact}
          onPin={handlePinMessage}
          replyToMessage={null}
          highlightMessageId={highlightMessageId}
        />
        <ScrollToBottom show={!isAtBottom} onClick={scrollToBottom} unreadCount={unreadCount} />
      </div>

      {/* Input */}
      <MessageInput
        onSend={handleSendMessage}
        onTyping={sendTyping}
        conversationName={conversationName}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        externalFiles={externalFiles}
        onExternalFilesConsumed={() => setExternalFiles(null)}
      />
    </div>
  );
}

function ConversationInfo({ conversation, currentUserId, token, onClose, onRename, onLeave, onUpdate }: {
  conversation: any;
  currentUserId: number;
  token: string;
  onClose: () => void;
  onRename: () => void;
  onLeave: () => void;
  onUpdate: () => void;
}) {
  const [showAddUser, setShowAddUser] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await api('/users', { token });
      const participantIds = conversation.participants.map((p: any) => p.id);
      setAllUsers(data.users.filter((u: any) => !participantIds.includes(u.id)));
    } catch {} finally {
      setLoadingUsers(false);
    }
  };

  const addParticipant = async (userId: number) => {
    try {
      await api(`/conversations/${conversation.id}/participants`, {
        method: 'POST', token, body: { user_id: userId },
      });
      onUpdate();
      setShowAddUser(false);
      toast.success('Participante agregado');
    } catch (err: any) {
      toast.error(err.message || 'Error');
    }
  };

  const removeParticipant = async (userId: number) => {
    if (!confirm('Remover participante?')) return;
    try {
      await api(`/conversations/${conversation.id}/participants/${userId}`, {
        method: 'DELETE', token,
      });
      onUpdate();
      toast.success('Participante removido');
    } catch (err: any) {
      toast.error(err.message || 'Error');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Info de conversacion</h3>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-2 mb-3">
        {conversation.type === 'group' && (
          <button onClick={onRename} className="flex-1 py-1.5 text-xs text-nexus-600 dark:text-nexus-400 border border-nexus-200 dark:border-nexus-700 rounded-xl hover:bg-nexus-50 dark:hover:bg-nexus-900/30 flex items-center justify-center gap-1">
            <Pencil className="w-3 h-3" /> Renombrar
          </button>
        )}
        <button onClick={onLeave} className="flex-1 py-1.5 text-xs text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center gap-1">
          <LogOut className="w-3 h-3" /> Salir
        </button>
      </div>

      <div className="space-y-2">
        {conversation.participants.map((p: any) => (
          <div key={p.id} className="flex items-center gap-2">
            <UserAvatar name={`${p.nombre} ${p.apellido}`} isOnline={!!p.is_online} size="sm" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{p.nombre} {p.apellido}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{p.role}</p>
            </div>
            {p.id !== currentUserId && (conversation.created_by === currentUserId || p.role !== 'admin') && (
              <button onClick={() => removeParticipant(p.id)} className="text-xs text-red-500 hover:text-red-700">
                Quitar
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => { setShowAddUser(true); loadUsers(); }}
        className="mt-3 w-full py-2 text-sm text-nexus-600 dark:text-nexus-400 border border-nexus-200 dark:border-nexus-700 rounded-xl hover:bg-nexus-50 dark:hover:bg-nexus-900/30 flex items-center justify-center gap-1"
      >
        <UserPlus className="w-4 h-4" />
        Agregar participante
      </button>

      {showAddUser && (
        <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-xl p-2 max-h-40 overflow-y-auto">
          {loadingUsers ? (
            <Loader2 className="w-4 h-4 animate-spin mx-auto" />
          ) : allUsers.length === 0 ? (
            <p className="text-xs text-gray-400 text-center">No hay mas usuarios</p>
          ) : (
            allUsers.map((u: any) => (
              <button
                key={u.id}
                onClick={() => addParticipant(u.id)}
                className="w-full p-2 flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-left"
              >
                <UserAvatar name={`${u.nombre} ${u.apellido}`} size="sm" />
                <span className="text-sm text-gray-900 dark:text-gray-100">{u.nombre} {u.apellido}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
