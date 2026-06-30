export class ChatRoom {
  state: DurableObjectState;
  sessions: Map<WebSocket, { userId: number; conversationId: number }> = new Map();

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Handle WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      const conversationId = parseInt(url.searchParams.get('conversationId') || '0');
      const userId = parseInt(url.searchParams.get('userId') || '0');

      if (!conversationId || !userId) {
        return new Response('Missing conversationId or userId', { status: 400 });
      }

      const pair = new WebSocketPair();
      const [client, server] = [pair[0], pair[1]];

      this.handleSession(server, userId, conversationId);

      return new Response(null, { status: 101, webSocket: client });
    }

    // Handle broadcast from Worker
    if (url.pathname === '/broadcast' && request.method === 'POST') {
      const message = await request.json() as { user_id: number; [key: string]: any };
      this.broadcast(JSON.stringify(message), message.user_id);
      return new Response('ok');
    }

    // Get connected users
    if (url.pathname === '/connected') {
      const conversationId = parseInt(url.searchParams.get('conversationId') || '0');
      const connected = Array.from(this.sessions.values())
        .filter(s => s.conversationId === conversationId)
        .map(s => s.userId);
      return new Response(JSON.stringify({ connected: [...new Set(connected)] }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not found', { status: 404 });
  }

  handleSession(ws: WebSocket, userId: number, conversationId: number) {
    ws.accept();
    this.sessions.set(ws, { userId, conversationId });

    // Broadcast user online status
    this.broadcast(JSON.stringify({
      type: 'online',
      payload: { userId, online: true },
      conversation_id: conversationId,
      user_id: userId,
      timestamp: new Date().toISOString(),
    }), userId);

    ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data as string);
        // Broadcast to all other sessions in same conversation
        this.broadcast(JSON.stringify({
          ...data,
          user_id: userId,
          conversation_id: conversationId,
          timestamp: new Date().toISOString(),
        }), userId);
      } catch (e) {
        // Invalid message format
      }
    });

    ws.addEventListener('close', () => {
      this.sessions.delete(ws);
      // Broadcast user offline status
      this.broadcast(JSON.stringify({
        type: 'online',
        payload: { userId, online: false },
        conversation_id: conversationId,
        user_id: userId,
        timestamp: new Date().toISOString(),
      }), userId);
    });

    ws.addEventListener('error', () => {
      this.sessions.delete(ws);
    });
  }

  broadcast(message: string, excludeUserId?: number) {
    for (const [ws, session] of this.sessions) {
      if (session.userId !== excludeUserId) {
        try {
          ws.send(message);
        } catch {
          this.sessions.delete(ws);
        }
      }
    }
  }
}
