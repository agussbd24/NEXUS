import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { useWebSocket } from '../hooks/useWebSocket';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import UserAvatar from './UserAvatar';
import { Phone, Video, MoreVertical, ArrowLeft, Shield, Info, Trash2, UserPlus, X, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export default function ChatWindow() {
  const [showInfo, setShowInfo] = useState(false);
  const user = useAuthStore((s) => s.user);
  const currentConversation = useChatStore((s) => s.currentConversation);
  const messages = useChatStore((s) => s.messages);
  const typingUsers = useChatStore((s) => s.typingUsers);
  const connectedUsers = useChatStore((s) => s.connectedUsers);
  const setCurrentConversation = useChatStore((s) => s.setCurrentConversation);
  const sendMessageApi = useChatStore((s) => s.sendMessage);
  const markAsRead = useChatStore((s) => s.markAsRead);
  const token = useAuthStore((s) => s.token)!;
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (currentConversation && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.sender_id !== user?.id) {
        markAsRead(currentConversation.id, lastMsg.id, token);
      }
    }
  }, [messages, currentConversation, user?.id, token, markAsRead]);

  const handleSendMessage = async (content: string, fileUrl?: string, fileName?: string, fileSize?: number) => {
    if (!currentConversation) return;
    await sendMessageApi(
      currentConversation.id,
      content,
      token,
      fileUrl ? 'file' : 'text',
      fileUrl,
      fileName,
      fileSize
    );
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

  if (!currentConversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-nexus-100 rounded-full mb-4">
            <Shield className="w-12 h-12 text-nexus-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">NEXUS</h2>
          <p className="text-gray-500 max-w-sm">
            Seleccione una conversacion o cree una nueva para comenzar a comunicarse
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="h-16 px-4 flex items-center gap-3 bg-white border-b border-gray-200 shadow-sm">
        <button
          onClick={() => setCurrentConversation(null)}
          className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <UserAvatar name={conversationName} isOnline={isOnline} size="md" />

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{conversationName}</h3>
          <p className="text-xs text-gray-500">
            {isTyping ? (
              <span className="text-nexus-500 font-medium">Escribiendo...</span>
            ) : isOnline ? (
              <span className="text-green-500">En linea</span>
            ) : (
              `${otherParticipants.length} participante${otherParticipants.length !== 1 ? 's' : ''}`
            )}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            title="Info"
          >
            <Info className="w-5 h-5" />
          </button>
          <button
            onClick={handleDeleteConversation}
            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Eliminar conversacion"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Info panel */}
      {showInfo && (
        <ConversationInfo
          conversation={currentConversation}
          currentUserId={user?.id || 0}
          token={token}
          onClose={() => setShowInfo(false)}
          onUpdate={async () => {
            const data = await api(`/conversations/${currentConversation.id}`, { token });
            setCurrentConversation(data.conversation);
          }}
        />
      )}

      {/* Messages */}
      <MessageList
        messages={messages}
        currentUserId={user?.id || 0}
        messagesEndRef={messagesEndRef}
      />

      {/* Input */}
      <MessageInput
        onSend={handleSendMessage}
        onTyping={sendTyping}
        conversationName={conversationName}
      />
    </div>
  );
}

function ConversationInfo({ conversation, currentUserId, token, onClose, onUpdate }: {
  conversation: any;
  currentUserId: number;
  token: string;
  onClose: () => void;
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
        method: 'POST',
        token,
        body: { user_id: userId },
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
        method: 'DELETE',
        token,
      });
      onUpdate();
      toast.success('Participante removido');
    } catch (err: any) {
      toast.error(err.message || 'Error');
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">Info de conversacion</h3>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        {conversation.participants.map((p: any) => (
          <div key={p.id} className="flex items-center gap-2">
            <UserAvatar name={`${p.nombre} ${p.apellido}`} isOnline={!!p.is_online} size="sm" />
            <div className="flex-1">
              <p className="text-sm font-medium">{p.nombre} {p.apellido}</p>
              <p className="text-xs text-gray-500 capitalize">{p.role}</p>
            </div>
            {p.id !== currentUserId && (conversation.created_by === currentUserId || p.role !== 'admin') && (
              <button
                onClick={() => removeParticipant(p.id)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Quitar
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => { setShowAddUser(true); loadUsers(); }}
        className="mt-3 w-full py-2 text-sm text-nexus-600 border border-nexus-200 rounded-xl hover:bg-nexus-50 flex items-center justify-center gap-1"
      >
        <UserPlus className="w-4 h-4" />
        Agregar participante
      </button>

      {showAddUser && (
        <div className="mt-2 border border-gray-200 rounded-xl p-2 max-h-40 overflow-y-auto">
          {loadingUsers ? (
            <Loader2 className="w-4 h-4 animate-spin mx-auto" />
          ) : allUsers.length === 0 ? (
            <p className="text-xs text-gray-400 text-center">No hay mas usuarios</p>
          ) : (
            allUsers.map((u: any) => (
              <button
                key={u.id}
                onClick={() => addParticipant(u.id)}
                className="w-full p-2 flex items-center gap-2 hover:bg-gray-50 rounded-lg text-left"
              >
                <UserAvatar name={`${u.nombre} ${u.apellido}`} size="sm" />
                <span className="text-sm">{u.nombre} {u.apellido}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
