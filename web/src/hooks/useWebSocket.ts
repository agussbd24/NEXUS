import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import type { Message } from '../store/chatStore';

const POLL_INTERVAL = 3000;

export function useWebSocket(conversationId: number | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageIdRef = useRef<number>(0);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const addMessage = useChatStore((s) => s.addMessage);
  const setTypingUser = useChatStore((s) => s.setTypingUser);
  const setConnectedUser = useChatStore((s) => s.setConnectedUser);

  const pollMessages = useCallback(async () => {
    if (!conversationId || !token) return;
    try {
      const res = await fetch(`/api/messages/${conversationId}/poll?last_id=${lastMessageIdRef.current}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.messages && data.messages.length > 0) {
        data.messages.forEach((msg: Message) => {
          if (msg.id > lastMessageIdRef.current) {
            lastMessageIdRef.current = msg.id;
            addMessage(msg);
          }
        });
      }
      if (data.typing_users) {
        data.typing_users.forEach((uid: number) => setTypingUser(uid, true));
      }
      if (data.online_users) {
        data.online_users.forEach((uid: number) => setConnectedUser(uid, true));
      }
    } catch {}
  }, [conversationId, token, addMessage, setTypingUser, setConnectedUser]);

  const connectWs = useCallback(() => {
    if (!conversationId || !token || !user) return;

    if (wsRef.current) {
      wsRef.current.close();
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.hostname.includes('pages.dev')
      ? 'nexus-backend.agussbd24.workers.dev'
      : window.location.host;
    const wsUrl = `${wsProtocol}//${wsHost}/ws/chat/${conversationId}?token=${token}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnectedUser(user.id, true);
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          switch (data.type) {
            case 'message':
              addMessage(data.payload as Message);
              break;
            case 'typing':
              setTypingUser(data.user_id, data.payload.typing);
              break;
            case 'online':
              setConnectedUser(data.payload.userId, data.payload.online);
              break;
          }
        } catch {}
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected, falling back to polling');
        if (user) setConnectedUser(user.id, false);
        startPolling();
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      startPolling();
    }
  }, [conversationId, token, user, addMessage, setTypingUser, setConnectedUser]);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollMessages();
    pollRef.current = setInterval(pollMessages, POLL_INTERVAL);
  }, [pollMessages]);

  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
    }

    if (conversationId) {
      lastMessageIdRef.current = 0;
      connectWs();
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [conversationId, connectWs]);

  const sendTyping = useCallback((typing: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        payload: { typing },
      }));
    }
  }, []);

  const sendMessageWs = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        payload: message,
      }));
    }
  }, []);

  return { sendTyping, sendMessage: sendMessageWs };
}
