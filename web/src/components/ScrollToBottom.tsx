import { ArrowDown } from 'lucide-react';

interface ScrollToBottomProps {
  show: boolean;
  onClick: () => void;
  unreadCount?: number;
}

export default function ScrollToBottom({ show, onClick, unreadCount }: ScrollToBottomProps) {
  if (!show) return null;

  return (
    <button
      onClick={onClick}
      className="absolute bottom-4 right-4 z-20 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-premium-lg rounded-full p-2.5 transition-all duration-300 animate-bounce border border-gray-200/60 dark:border-gray-700/60 hover:scale-105"
    >
      <div className="relative">
        <ArrowDown className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        {unreadCount && unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-gradient-to-r from-nexus-500 to-nexus-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center shadow-glow">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>
    </button>
  );
}
