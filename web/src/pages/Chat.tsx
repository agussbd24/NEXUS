import { useEffect, useState } from 'react';
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
  const currentConversation = useChatStore((s) => s.currentConversation);
  const loading = useChatStore((s) => s.loading);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (token) {
      fetchUser();
      fetchConversations(token);
    }
  }, [token, fetchUser, fetchConversations]);

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 text-nexus-600 animate-spin" />
      </div>
    );
  }

  const showSidebar = !isMobile || !currentConversation;
  const showChat = !isMobile || currentConversation;

  return (
    <div className="h-screen flex bg-gray-100 dark:bg-gray-900 overflow-hidden">
      {showSidebar && <Sidebar />}
      {showChat && <ChatWindow />}
    </div>
  );
}
