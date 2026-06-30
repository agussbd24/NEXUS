import { RefObject, useState, useCallback } from 'react';
import UserAvatar from './UserAvatar';
import ReadReceipt from './ReadReceipt';
import MessageContextMenu from './MessageContextMenu';
import EmojiPicker from './EmojiPicker';
import { FileText, Download, X, ExternalLink, Reply, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import toast from 'react-hot-toast';

interface Reaction {
  message_id: number;
  user_id: number;
  emoji: string;
  user_nombre: string;
  user_apellido: string;
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

interface MessageListProps {
  messages: Message[];
  currentUserId: number;
  messagesEndRef: RefObject<HTMLDivElement>;
  onReply?: (msg: Message) => void;
  onEdit?: (msg: Message) => void;
  onDelete?: (messageId: number) => void;
  onReact?: (messageId: number, emoji: string) => void;
  onPin?: (messageId: number) => void;
  replyToMessage?: Message | null;
}

function getFileCategory(name: string | null): string {
  if (!name) return 'other';
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'].includes(ext)) return 'audio';
  if (ext === 'pdf') return 'pdf';
  if (['txt', 'md', 'json', 'csv', 'log'].includes(ext)) return 'text';
  return 'other';
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏'];

function FilePreview({ msg, isMe }: { msg: Message; isMe: boolean }) {
  const [showModal, setShowModal] = useState(false);
  const category = getFileCategory(msg.file_name);
  const url = msg.file_url || '';

  const badge = (label: string, color: string) => (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${color}`}>{label}</span>
  );

  const preview = () => {
    switch (category) {
      case 'image':
        return (
          <div className="cursor-pointer" onClick={() => setShowModal(true)}>
            <img src={url} alt={msg.file_name || ''} className="max-w-[300px] max-h-[350px] rounded-lg object-cover" loading="lazy" />
          </div>
        );
      case 'video':
        return (
          <video controls className="max-w-[300px] max-h-[350px] rounded-lg">
            <source src={url} />
          </video>
        );
      case 'audio':
        return (
          <div className="flex items-center gap-3 min-w-[200px]">
            <div className="flex-1">
              <p className="text-sm font-medium truncate">{msg.file_name}</p>
              <audio controls className="w-full mt-1" style={{ height: 36 }}>
                <source src={url} />
              </audio>
            </div>
          </div>
        );
      case 'pdf':
        return (
          <div className="cursor-pointer" onClick={() => setShowModal(true)}>
            <div className="flex items-center gap-2 mb-2">
              {badge('PDF', 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400')}
              <span className="text-xs text-gray-500">{msg.file_size ? formatFileSize(msg.file_size) : ''}</span>
            </div>
            <div className="w-full h-[300px] border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
              <object data={url} type="application/pdf" className="w-full h-full">
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">No se puede previsualizar</div>
              </object>
            </div>
          </div>
        );
      case 'text':
        return (
          <div className="cursor-pointer" onClick={() => setShowModal(true)}>
            <div className="flex items-center gap-2 mb-1">
              {badge('TXT', 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300')}
              <span className="text-xs text-gray-500">{msg.file_size ? formatFileSize(msg.file_size) : ''}</span>
            </div>
            <div className="max-h-[200px] overflow-auto bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-2">
              <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">{msg.file_name}</pre>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-3 min-w-[200px]">
            <div className={`p-3 rounded-xl ${isMe ? 'bg-nexus-700' : 'bg-gray-100 dark:bg-gray-700'}`}>
              <FileText className={`w-6 h-6 ${isMe ? 'text-nexus-200' : 'text-gray-500 dark:text-gray-400'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{msg.file_name || 'Archivo'}</p>
              <p className={`text-xs ${isMe ? 'text-nexus-200' : 'text-gray-400'}`}>
                {msg.file_size ? formatFileSize(msg.file_size) : ''}
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      <div>
        {preview()}
        <div className="flex items-center gap-2 mt-1.5">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-xs flex items-center gap-1 ${isMe ? 'text-nexus-200 hover:text-white' : 'text-nexus-600 dark:text-nexus-400 hover:text-nexus-800'}`}
          >
            <ExternalLink className="w-3 h-3" /> Abrir
          </a>
          <a
            href={url}
            download={msg.file_name}
            className={`text-xs flex items-center gap-1 ${isMe ? 'text-nexus-200 hover:text-white' : 'text-nexus-600 dark:text-nexus-400 hover:text-nexus-800'}`}
          >
            <Download className="w-3 h-3" /> Descargar
          </a>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-white hover:text-gray-300 z-10">
            <X className="w-8 h-8" />
          </button>
          <div className="max-w-5xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
            {category === 'image' && <img src={url} alt={msg.file_name || ''} className="max-w-full max-h-[85vh] mx-auto rounded-lg object-contain" />}
            {category === 'pdf' && <object data={url} type="application/pdf" className="w-full h-[85vh] rounded-lg bg-white" />}
          </div>
        </div>
      )}
    </>
  );
}

export default function MessageList({ messages, currentUserId, messagesEndRef, onReply, onEdit, onDelete, onReact, onPin, replyToMessage }: MessageListProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; msg: Message } | null>(null);
  const [showReactPicker, setShowReactPicker] = useState<number | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editContent, setEditContent] = useState('');
  const token = useAuthStore((s) => s.token)!;
  const user = useAuthStore((s) => s.user);

  const handleContextMenu = useCallback((e: React.MouseEvent, msg: Message) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, msg });
    setShowReactPicker(null);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent, msg: Message) => {
    const touch = e.touches[0];
    const timer = setTimeout(() => {
      setContextMenu({ x: touch.clientX, y: touch.clientY, msg });
    }, 500);
    const clear = () => {
      clearTimeout(timer);
      e.currentTarget.removeEventListener('touchend', clear);
      e.currentTarget.removeEventListener('touchmove', clear);
    };
    e.currentTarget.addEventListener('touchend', clear);
    e.currentTarget.addEventListener('touchmove', clear);
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Copiado al portapapeles');
    });
  };

  const handleEdit = async () => {
    if (!editingMessage || !editContent.trim()) return;
    try {
      await api(`/messages/${editingMessage.conversation_id}/${editingMessage.id}`, {
        method: 'PUT',
        token,
        body: { content: editContent },
      });
      onEdit?.({ ...editingMessage, content: editContent });
      setEditingMessage(null);
      setEditContent('');
      toast.success('Mensaje editado');
    } catch (err: any) {
      toast.error(err.message || 'Error al editar');
    }
  };

  const handleDelete = async (msg: Message) => {
    if (!confirm('Eliminar este mensaje?')) return;
    try {
      await api(`/messages/${msg.conversation_id}/${msg.id}`, { method: 'DELETE', token });
      onDelete?.(msg.id);
      toast.success('Mensaje eliminado');
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar');
    }
  };

  const handlePin = async (msg: Message) => {
    try {
      await api(`/messages/${msg.conversation_id}/${msg.id}/pin`, {
        method: 'POST',
        token,
        body: { pinned: !msg.is_pinned },
      });
      onPin?.(msg.id);
      toast.success(msg.is_pinned ? 'Mensaje desfijado' : 'Mensaje fijado');
    } catch (err: any) {
      toast.error(err.message || 'Error');
    }
  };

  const handleReact = async (messageId: number, emoji: string) => {
    const convoId = messages.find((m) => m.id === messageId)?.conversation_id;
    if (!convoId) return;
    try {
      const data = await api(`/messages/${convoId}/reactions`, {
        method: 'POST',
        token,
        body: { message_id: messageId, emoji },
      });
      onReact?.(messageId, emoji);
      setShowReactPicker(null);
    } catch {}
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return `Ayer ${date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('es', {
        day: '2-digit', month: '2-digit', year: '2-digit',
        hour: '2-digit', minute: '2-digit',
      });
    }
  };

  const getReplyPreview = (replyToId: number) => {
    const replyMsg = messages.find((m) => m.id === replyToId);
    if (!replyMsg) return null;
    return (
      <div className={`text-xs mb-1 pl-2 border-l-2 ${replyMsg.sender_id === currentUserId ? 'border-nexus-300 text-nexus-200' : 'border-nexus-400 text-gray-500 dark:text-gray-400'}`}>
        <span className="font-medium">{replyMsg.sender_nombre} {replyMsg.sender_apellido}</span>
        <p className="truncate max-w-[250px]">{replyMsg.content || replyMsg.file_name || 'Archivo'}</p>
      </div>
    );
  };

  const groupedMessages: { date: string; messages: Message[] }[] = [];
  let currentDate = '';

  messages.forEach((msg) => {
    const msgDate = new Date(msg.created_at).toLocaleDateString('es');
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groupedMessages.push({ date: msgDate, messages: [] });
    }
    groupedMessages[groupedMessages.length - 1].messages.push(msg);
  });

  return (
    <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-4 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjEiIGZpbGw9IiNlNWU3ZWIiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZykiLz48L3N2Zz4=')] bg-gray-50 dark:bg-gray-900">
      {groupedMessages.length === 0 && (
        <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
          No hay mensajes todavia
        </div>
      )}
      {groupedMessages.map((group) => (
        <div key={group.date}>
          <div className="flex items-center justify-center my-4">
            <div className="px-3 py-1 bg-white/80 dark:bg-gray-800/80 text-gray-600 dark:text-gray-400 text-xs rounded-full font-medium shadow-sm border border-gray-200 dark:border-gray-700">
              {new Date(group.messages[0].created_at).toLocaleDateString('es', {
                weekday: 'long', day: 'numeric', month: 'long',
              })}
            </div>
          </div>

          {group.messages.map((msg, idx) => {
            const isMe = msg.sender_id === currentUserId;
            const showAvatar = idx === 0 || group.messages[idx - 1].sender_id !== msg.sender_id;

            if (msg.is_deleted) {
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1`}>
                  <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-400 dark:text-gray-500 text-sm italic">
                    Mensaje eliminado
                  </div>
                </div>
              );
            }

            const hasFile = msg.content_type === 'file' && msg.file_url;
            const isMedia = hasFile && ['image', 'video', 'audio', 'pdf'].includes(getFileCategory(msg.file_name));

            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1 message-enter`}
                onContextMenu={(e) => handleContextMenu(e, msg)}
                onTouchStart={(e) => handleTouchStart(e, msg)}
              >
                {!isMe && showAvatar && (
                  <UserAvatar
                    name={`${msg.sender_nombre} ${msg.sender_apellido}`}
                    size="sm"
                    className="mr-2 mt-1"
                  />
                )}
                {!isMe && !showAvatar && <div className="w-8 mr-2" />}

                <div className={`max-w-[85vw] sm:max-w-md ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && showAvatar && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 ml-1 mb-0.5 font-medium">
                      {msg.sender_nombre} {msg.sender_apellido}
                    </p>
                  )}

                  <div
                    className={`rounded-2xl overflow-hidden ${
                      isMe
                        ? 'bg-nexus-600 text-white rounded-br-md'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-bl-md shadow-sm'
                    } ${isMedia ? 'p-1' : 'px-3 sm:px-4 py-2'}`}
                  >
                    {msg.reply_to && getReplyPreview(msg.reply_to)}

                    {editingMessage?.id === msg.id ? (
                      <div className="flex flex-col gap-1">
                        <input
                          type="text"
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
                          className="bg-transparent border-b border-white/30 outline-none text-sm py-1"
                          autoFocus
                        />
                        <div className="flex gap-2 text-[10px]">
                          <button onClick={() => setEditingMessage(null)} className="text-gray-300 hover:text-white">Cancelar</button>
                          <button onClick={handleEdit} className="text-white font-medium hover:text-nexus-200">Guardar</button>
                        </div>
                      </div>
                    ) : hasFile ? (
                      <FilePreview msg={msg} isMe={isMe} />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    )}

                    {msg.is_pinned === 1 && (
                      <div className={`text-[10px] mt-1 flex items-center gap-1 ${isMe ? 'text-nexus-200' : 'text-gray-400'}`}>
                        📌 Mensaje fijado
                      </div>
                    )}
                  </div>

                  {/* Reactions */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5 px-1">
                      {Object.entries(
                        msg.reactions.reduce((acc, r) => {
                          acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      ).map(([emoji, count]) => (
                        <button
                          key={emoji}
                          onClick={() => handleReact(msg.id, emoji)}
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <span>{emoji}</span>
                          <span className="text-gray-500 dark:text-gray-400 text-[10px]">{count}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Quick reaction button */}
                  {showReactPicker === msg.id && (
                    <div className="flex gap-0.5 mt-1 p-1 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700">
                      {QUICK_REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleReact(msg.id, emoji)}
                          className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-transform hover:scale-125"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className={`flex items-center gap-1 mt-0.5 ${isMe ? 'justify-end' : ''}`}>
                    <p className={`text-[10px] ${isMe ? 'mr-1' : 'ml-1'} text-gray-400 dark:text-gray-500`}>
                      {formatDate(msg.created_at)}
                      {msg.is_edited && <span className="ml-1">(editado)</span>}
                    </p>
                    <ReadReceipt isMe={isMe} readByOthers={false} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
      <div ref={messagesEndRef} />

      {contextMenu && (
        <MessageContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isMe={contextMenu.msg.sender_id === currentUserId}
          isAdmin={user?.role === 'admin'}
          onReply={() => { onReply?.(contextMenu.msg); setContextMenu(null); }}
          onCopy={() => { copyToClipboard(contextMenu.msg.content || ''); setContextMenu(null); }}
          onReact={() => { setShowReactPicker(contextMenu.msg.id); setContextMenu(null); }}
          onPin={() => { handlePin(contextMenu.msg); setContextMenu(null); }}
          onEdit={() => { setEditingMessage(contextMenu.msg); setEditContent(contextMenu.msg.content || ''); setContextMenu(null); }}
          onDelete={() => { handleDelete(contextMenu.msg); setContextMenu(null); }}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
