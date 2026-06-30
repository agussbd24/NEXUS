import { useEffect, useRef } from 'react';
import { Copy, Reply, Smile, Pin, Pencil, Trash2, Forward } from 'lucide-react';

interface MessageContextMenuProps {
  x: number;
  y: number;
  isMe: boolean;
  isAdmin: boolean;
  onReply: () => void;
  onCopy: () => void;
  onReact: () => void;
  onPin: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function MessageContextMenu({
  x, y, isMe, isAdmin, onReply, onCopy, onReact, onPin, onEdit, onDelete, onClose,
}: MessageContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [onClose]);

  const adjustedY = Math.min(y, window.innerHeight - 280);
  const adjustedX = Math.min(x, window.innerWidth - 200);

  return (
    <div
      ref={ref}
      className="fixed z-[100] bg-white dark:bg-gray-900 rounded-2xl shadow-premium-xl border border-gray-200/60 dark:border-gray-800/60 py-1.5 min-w-[200px] overflow-hidden"
      style={{ top: adjustedY, left: adjustedX }}
    >
      <button
        onClick={onReply}
        className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <Reply className="w-4 h-4 text-gray-400" /> Responder
      </button>
      <button
        onClick={onCopy}
        className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <Copy className="w-4 h-4 text-gray-400" /> Copiar
      </button>
      <button
        onClick={onReact}
        className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <Smile className="w-4 h-4 text-gray-400" /> Reaccionar
      </button>
      <button
        onClick={onPin}
        className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <Pin className="w-4 h-4 text-gray-400" /> Fijar mensaje
      </button>
      {isMe && (
        <button
          onClick={onEdit}
          className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <Pencil className="w-4 h-4 text-gray-400" /> Editar
        </button>
      )}
      {(isMe || isAdmin) && (
        <>
          <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
          <button
            onClick={onDelete}
            className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Eliminar
          </button>
        </>
      )}
    </div>
  );
}
