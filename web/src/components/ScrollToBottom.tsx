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
      className="absolute bottom-4 right-4 z-20 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 shadow-lg rounded-full p-2.5 transition-all animate-bounce border border-gray-200 dark:border-gray-600"
    >
      <div className="relative">
        <ArrowDown className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        {unreadCount && unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-nexus-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>
    </button>
  );
}
