import { create } from 'zustand';
import { api } from '../services/api';

interface Participant {
  id: number;
  nombre: string;
  apellido: string;
  avatar_url: string | null;
  is_online: number;
  role: string;
}

interface Conversation {
  id: number;
  type: 'direct' | 'group';
  name: string | null;
  avatar_url: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  last_message: string | null;
  last_message_at: string | null;
  last_message_sender: number | null;
  unread_count: number;
  participants: Participant[];
}

interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string | null;
  content_type: string;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  reply_to: number | null;
  is_edited: number;
  is_deleted: number;
  created_at: string;
  sender_nombre: string;
  sender_apellido: string;
  sender_avatar: string | null;
}

interface ChatState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  typingUsers: Set<number>;
  connectedUsers: Set<number>;
  loading: boolean;
  fetchConversations: (token: string) => Promise<void>;
  setCurrentConversation: (convo: Conversation | null) => void;
  fetchMessages: (conversationId: number, token: string) => Promise<void>;
  sendMessage: (conversationId: number, content: string, token: string, contentType?: string, fileUrl?: string, fileName?: string, fileSize?: number) => Promise<void>;
  addMessage: (message: Message) => void;
  setTypingUser: (userId: number, typing: boolean) => void;
  setConnectedUser: (userId: number, connected: boolean) => void;
  createConversation: (type: string, participantIds: number[], name?: string, token?: string) => Promise<number>;
  markAsRead: (conversationId: number, messageId: number, token: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  typingUsers: new Set(),
  connectedUsers: new Set(),
  loading: false,

  fetchConversations: async (token) => {
    set({ loading: true });
    try {
      const data = await api('/conversations', { token });
      set({ conversations: data.conversations, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  setCurrentConversation: (convo) => {
    set({ currentConversation: convo, messages: [] });
  },

  fetchMessages: async (conversationId, token) => {
    try {
      const data = await api(`/messages/${conversationId}?limit=100`, { token });
      set({ messages: data.messages });
    } catch {}
  },

  sendMessage: async (conversationId, content, token, contentType = 'text', fileUrl, fileName, fileSize) => {
    try {
      const data = await api(`/messages/${conversationId}`, {
        method: 'POST',
        token,
        body: { content, content_type: contentType, file_url: fileUrl, file_name: fileName, file_size: fileSize },
      });
      // Message will come via WebSocket, but also add locally for instant feedback
    } catch (err) {
      throw err;
    }
  },

  addMessage: (message) => {
    const state = get();
    // Avoid duplicates
    if (state.messages.find((m) => m.id === message.id)) return;

    set({ messages: [...state.messages, message] });

    // Update conversation list
    const convos = state.conversations.map((c) => {
      if (c.id === message.conversation_id) {
        return {
          ...c,
          last_message: message.content || message.file_name || 'Archivo',
          last_message_at: message.created_at,
          last_message_sender: message.sender_id,
          unread_count: state.currentConversation?.id === message.conversation_id
            ? 0
            : c.unread_count + (message.sender_id !== state.currentConversation?.participants?.[0]?.id ? 1 : 0),
        };
      }
      return c;
    });

    set({ conversations: convos.sort((a, b) => {
      const dateA = a.last_message_at || a.created_at;
      const dateB = b.last_message_at || b.created_at;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    })});
  },

  setTypingUser: (userId, typing) => {
    const state = get();
    const newTyping = new Set(state.typingUsers);
    if (typing) newTyping.add(userId);
    else newTyping.delete(userId);
    set({ typingUsers: newTyping });
  },

  setConnectedUser: (userId, connected) => {
    const state = get();
    const newConnected = new Set(state.connectedUsers);
    if (connected) newConnected.add(userId);
    else newConnected.delete(userId);
    set({ connectedUsers: newConnected });
  },

  createConversation: async (type, participantIds, name, token) => {
    const data = await api('/conversations', {
      method: 'POST',
      token: token!,
      body: { type, participant_ids: participantIds, name },
    });
    // Refresh conversations
    await get().fetchConversations(token!);
    return data.conversationId;
  },

  markAsRead: async (conversationId, messageId, token) => {
    try {
      await api(`/messages/${conversationId}/read`, {
        method: 'POST',
        token,
        body: { message_id: messageId },
      });
      // Update unread count
      const convos = get().conversations.map((c) =>
        c.id === conversationId ? { ...c, unread_count: 0 } : c
      );
      set({ conversations: convos });
    } catch {}
  },
}));
