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

interface Reaction {
  message_id: number;
  user_id: number;
  emoji: string;
  user_nombre: string;
  user_apellido: string;
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
  is_muted: number;
  is_archived: number;
  is_pinned: number;
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
  is_pinned: number;
  created_at: string;
  sender_nombre: string;
  sender_apellido: string;
  sender_avatar: string | null;
  reactions?: Reaction[];
}

interface ChatState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  typingUsers: Set<number>;
  connectedUsers: Set<number>;
  loading: boolean;
  pendingMessages: Map<string, { content: string; tempId: string; conversationId: number }>;
  fetchConversations: (token: string) => Promise<void>;
  setCurrentConversation: (convo: Conversation | null) => void;
  fetchMessages: (conversationId: number, token: string, search?: string) => Promise<void>;
  sendMessage: (conversationId: number, content: string, token: string, contentType?: string, fileUrl?: string, fileName?: string, fileSize?: number, replyTo?: number) => Promise<string>;
  addMessage: (message: Message) => void;
  editMessage: (message: Message) => void;
  removeMessage: (messageId: number) => void;
  updateReactions: (messageId: number, reactions: Reaction[]) => void;
  setTypingUser: (userId: number, typing: boolean) => void;
  setConnectedUser: (userId: number, connected: boolean) => void;
  createConversation: (type: string, participantIds: number[], name?: string, token?: string) => Promise<number>;
  markAsRead: (conversationId: number, messageId: number, token: string) => Promise<void>;
  searchMessages: (conversationId: number, query: string, token: string) => Promise<Message[]>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  typingUsers: new Set(),
  connectedUsers: new Set(),
  loading: false,
  pendingMessages: new Map(),

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

  fetchMessages: async (conversationId, token, search) => {
    try {
      const gen = ++fetchMessagesGeneration;
      let url = `/messages/${conversationId}?limit=100`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      const data = await api(url, { token });
      if (gen !== fetchMessagesGeneration) return;
      set({ messages: data.messages });
    } catch {}
  },

  sendMessage: async (conversationId, content, token, contentType = 'text', fileUrl, fileName, fileSize, replyTo) => {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const optimisticMsg: Message = {
      id: parseInt(tempId.replace(/\D/g, '').slice(0, 10)) || Date.now(),
      conversation_id: conversationId,
      sender_id: 0,
      content,
      content_type: fileUrl ? 'file' : contentType,
      file_url: fileUrl || null,
      file_name: fileName || null,
      file_size: fileSize || null,
      reply_to: replyTo || null,
      is_edited: 0,
      is_deleted: 0,
      is_pinned: 0,
      created_at: new Date().toISOString(),
      sender_nombre: '',
      sender_apellido: '',
      sender_avatar: null,
    };

    set((state) => ({
      messages: [...state.messages, optimisticMsg],
      pendingMessages: new Map(state.pendingMessages).set(tempId, { content, tempId, conversationId }),
    }));

    try {
      const data = await api(`/messages/${conversationId}`, {
        method: 'POST',
        token,
        body: { content, content_type: contentType, file_url: fileUrl, file_name: fileName, file_size: fileSize, reply_to: replyTo },
      });

      set((state) => {
        const newPending = new Map(state.pendingMessages);
        newPending.delete(tempId);
        const msgs = state.messages.map((m) => m.id === optimisticMsg.id ? { ...data.message, reactions: [] } : m);
        return { messages: msgs, pendingMessages: newPending };
      });

      return tempId;
    } catch (err) {
      set((state) => {
        const newPending = new Map(state.pendingMessages);
        newPending.delete(tempId);
        return { messages: state.messages.filter((m) => m.id !== optimisticMsg.id), pendingMessages: newPending };
      });
      throw err;
    }
  },

  addMessage: (message) => {
    const state = get();
    const isCurrentConvo = state.currentConversation?.id === message.conversation_id;

    if (isCurrentConvo) {
      if (state.messages.find((m) => m.id === message.id)) return;
      set({ messages: [...state.messages, { ...message, reactions: message.reactions || [] }] });
    }

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

  editMessage: (message) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === message.id ? { ...m, content: message.content, is_edited: 1 } : m
      ),
    }));
  },

  removeMessage: (messageId) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, is_deleted: 1, content: null, file_url: null } : m
      ),
    }));
  },

  updateReactions: (messageId, reactions) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, reactions } : m
      ),
    }));
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
      const convos = get().conversations.map((c) =>
        c.id === conversationId ? { ...c, unread_count: 0 } : c
      );
      set({ conversations: convos });
    } catch {}
  },

  searchMessages: async (conversationId, query, token) => {
    try {
      const data = await api(`/messages/${conversationId}/search?q=${encodeURIComponent(query)}`, { token });
      return data.messages;
    } catch {
      return [];
    }
  },
}));

let fetchMessagesGeneration = 0;
