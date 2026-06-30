import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { useWebSocket } from '../hooks/useWebSocket';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import UserAvatar from './UserAvatar';
import { Phone, Video, MoreVertical, ArrowLeft, Shield } from 'lucide-react';

export default function ChatWindow() {
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

  // Mark messages as read
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
              'Desconectado'
            )}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
            <Phone className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
            <Video className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

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
