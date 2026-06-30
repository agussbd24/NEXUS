import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import type { Message } from '../store/chatStore';

export function useWebSocket(conversationId: number | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const addMessage = useChatStore((s) => s.addMessage);
  const setTypingUser = useChatStore((s) => s.setTypingUser);
  const setConnectedUser = useChatStore((s) => s.setConnectedUser);

  const connect = useCallback(() => {
    if (!conversationId || !token || !user) return;

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Try same domain first, fallback to worker domain
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.hostname.includes('pages.dev')
      ? 'nexus-backend.agussbd24.workers.dev'
      : window.location.host;
    const wsUrl = `${wsProtocol}//${wsHost}/ws/chat/${conversationId}?token=${token}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setConnectedUser(user.id, true);
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
      } catch (e) {
        // Invalid message
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      if (user) setConnectedUser(user.id, false);
      // Reconnect after 3 seconds
      setTimeout(connect, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, [conversationId, token, user, addMessage, setTypingUser, setConnectedUser]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendTyping = useCallback((typing: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        payload: { typing },
      }));
    }
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        payload: message,
      }));
    }
  }, []);

  return { sendTyping, sendMessage };
}
