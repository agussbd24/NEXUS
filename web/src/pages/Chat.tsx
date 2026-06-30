import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import { Loader2 } from 'lucide-react';

export default function Chat() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const fetchConversations = useChatStore((s) => s.fetchConversations);
  const loading = useChatStore((s) => s.loading);

  useEffect(() => {
    if (token) {
      fetchUser();
      fetchConversations(token);
    }
  }, [token, fetchUser, fetchConversations]);

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="w-8 h-8 text-nexus-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-100 overflow-hidden">
      <Sidebar />
      <ChatWindow />
    </div>
  );
}
