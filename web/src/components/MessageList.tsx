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
  highlightMessageId?: number | null;
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
    <span className={`text-[10px] px-2 py-0.5 rounded-lg font-semibold ${color}`}>{label}</span>
  );

  const preview = () => {
    switch (category) {
      case 'image':
        return (
          <div className="cursor-pointer group/img" onClick={() => setShowModal(true)}>
            {msg.file_name && <p className="text-xs font-semibold truncate mb-1 max-w-[300px]">{msg.file_name}</p>}
            <img src={url} alt={msg.file_name || ''} className="max-w-[300px] max-h-[350px] rounded-xl object-cover shadow-sm transition-transform group-hover/img:scale-[1.02]" loading="lazy" />
          </div>
        );
      case 'video':
        return (
          <div>
            {msg.file_name && <p className="text-xs font-semibold truncate mb-1 max-w-[300px]">{msg.file_name}</p>}
            <video controls className="max-w-[300px] max-h-[350px] rounded-xl shadow-sm">
              <source src={url} />
            </video>
          </div>
        );
      case 'audio':
        return (
          <div className="flex items-center gap-3 min-w-[220px] p-1">
            <div className="flex-1">
              <p className="text-sm font-semibold truncate">{msg.file_name}</p>
              <audio controls className="w-full mt-2" style={{ height: 36 }}>
                <source src={url} />
              </audio>
            </div>
          </div>
        );
      case 'pdf':
        return (
          <div className="cursor-pointer" onClick={() => setShowModal(true)}>
            <div className={`flex items-center gap-3 p-3 rounded-xl ${isMe ? 'bg-white/10' : 'bg-red-50 dark:bg-red-900/20 border border-red-200/50 dark:border-red-800/30'}`}>
              <div className="p-2.5 bg-red-100 dark:bg-red-900/40 rounded-xl flex-shrink-0">
                <FileText className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{msg.file_name || 'Documento PDF'}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {badge('PDF', 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400')}
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">{msg.file_size ? formatFileSize(msg.file_size) : ''}</span>
                </div>
              </div>
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
            <div className="max-h-[200px] overflow-auto bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 p-3">
              <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">{msg.file_name}</pre>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-3 min-w-[220px] p-1">
            <div className={`p-3 rounded-xl ${isMe ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-700'}`}>
              <FileText className={`w-6 h-6 ${isMe ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{msg.file_name || 'Archivo'}</p>
              <p className={`text-xs ${isMe ? 'text-white/70' : 'text-gray-400'}`}>
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
        <div className="flex items-center gap-3 mt-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-xs flex items-center gap-1 font-medium ${isMe ? 'text-white/80 hover:text-white' : 'text-nexus-600 dark:text-nexus-400 hover:text-nexus-800'}`}
          >
            <ExternalLink className="w-3 h-3" /> Abrir
          </a>
          <a
            href={url}
            download={msg.file_name}
            className={`text-xs flex items-center gap-1 font-medium ${isMe ? 'text-white/80 hover:text-white' : 'text-nexus-600 dark:text-nexus-400 hover:text-nexus-800'}`}
          >
            <Download className="w-3 h-3" /> Descargar
          </a>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 p-2 hover:bg-white/10 rounded-xl transition-colors">
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-5xl max-h-[90vh] w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            {category === 'image' && <img src={url} alt={msg.file_name || ''} className="max-w-full max-h-[85vh] mx-auto rounded-2xl object-contain shadow-2xl" />}
            {category === 'pdf' && (
              <div className="bg-white rounded-2xl p-8 text-center shadow-2xl">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-2xl mb-4">
                  <FileText className="w-10 h-10 text-red-600" />
                </div>
                <p className="text-lg font-bold text-gray-900 mb-1">{msg.file_name || 'Documento PDF'}</p>
                <p className="text-sm text-gray-500 mb-6">{msg.file_size ? formatFileSize(msg.file_size) : ''}</p>
                <div className="flex gap-3 justify-center">
                  <a href={url} target="_blank" rel="noopener noreferrer" className="px-6 py-2.5 bg-nexus-600 hover:bg-nexus-500 text-white font-medium rounded-xl transition-colors">
                    Abrir en nueva pestana
                  </a>
                  <a href={url} download={msg.file_name} className="px-6 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-xl transition-colors">
                    Descargar
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default function MessageList({ messages, currentUserId, messagesEndRef, onReply, onEdit, onDelete, onReact, onPin, replyToMessage, highlightMessageId }: MessageListProps) {
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
      await api(`/messages/${convoId}/reactions`, {
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
      <div className={`text-xs mb-1.5 pl-2.5 border-l-2 ${replyMsg.sender_id === currentUserId ? 'border-white/40 text-white/70' : 'border-nexus-400 text-gray-500 dark:text-gray-400'}`}>
        <span className="font-semibold">{replyMsg.sender_nombre} {replyMsg.sender_apellido}</span>
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
    <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 bg-gradient-to-b from-gray-50 to-gray-100/50 dark:from-gray-950 dark:to-gray-900/50">
      {/* Subtle dot pattern */}
      <div className="fixed inset-0 opacity-[0.015] dark:opacity-[0.03] pointer-events-none" style={{
        backgroundImage: `radial-gradient(circle, #6366f1 1px, transparent 1px)`,
        backgroundSize: '24px 24px'
      }} />

      {groupedMessages.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-nexus-100 to-nexus-200 dark:from-nexus-900/30 dark:to-nexus-800/30 rounded-3xl mb-4 shadow-inner-glow">
              <span className="text-3xl">💬</span>
            </div>
            <p className="text-gray-400 dark:text-gray-500 text-sm font-medium">No hay mensajes todavia</p>
            <p className="text-gray-300 dark:text-gray-600 text-xs mt-1">Comienza la conversacion</p>
          </div>
        </div>
      )}
      {groupedMessages.map((group) => (
        <div key={group.date}>
          <div className="flex items-center justify-center my-5">
            <div className="px-4 py-1.5 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-600 dark:text-gray-400 text-xs rounded-full font-semibold shadow-sm border border-gray-200/50 dark:border-gray-700/50">
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
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1.5`}>
                  <div className="px-5 py-2.5 bg-gray-100 dark:bg-gray-800/80 rounded-2xl text-gray-400 dark:text-gray-500 text-sm italic shadow-sm">
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
                id={`msg-${msg.id}`}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1 message-enter ${highlightMessageId === msg.id ? 'message-highlight' : ''}`}
                onContextMenu={(e) => handleContextMenu(e, msg)}
                onTouchStart={(e) => handleTouchStart(e, msg)}
              >
                {!isMe && showAvatar && (
                  <UserAvatar
                    name={`${msg.sender_nombre} ${msg.sender_apellido}`}
                    size="sm"
                    className="mr-2.5 mt-1"
                  />
                )}
                {!isMe && !showAvatar && <div className="w-8 mr-2.5" />}

                <div className={`max-w-[85vw] sm:max-w-md ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && showAvatar && (
                    <p className="text-[11px] text-nexus-600 dark:text-nexus-400 ml-1 mb-1 font-semibold">
                      {msg.sender_nombre} {msg.sender_apellido}
                    </p>
                  )}

                  <div
                    className={`rounded-2xl overflow-hidden transition-shadow ${
                      isMe
                        ? 'bg-gradient-to-br from-nexus-500 to-nexus-600 text-white rounded-br-lg shadow-md'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200/60 dark:border-gray-700/60 rounded-bl-lg shadow-sm card-premium'
                    } ${isMedia ? 'p-1.5' : 'px-4 py-2.5'}`}
                  >
                    {msg.reply_to && getReplyPreview(msg.reply_to)}

                    {editingMessage?.id === msg.id ? (
                      <div className="flex flex-col gap-2">
                        <input
                          type="text"
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
                          className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 outline-none text-sm"
                          autoFocus
                        />
                        <div className="flex gap-2 text-xs">
                          <button onClick={() => setEditingMessage(null)} className="text-white/60 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 transition-colors">Cancelar</button>
                          <button onClick={handleEdit} className="text-white font-medium hover:text-nexus-200 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors">Guardar</button>
                        </div>
                      </div>
                    ) : hasFile ? (
                      <FilePreview msg={msg} isMe={isMe} />
                    ) : (
                      <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                    )}

                    {msg.is_pinned === 1 && (
                      <div className={`text-[10px] mt-1.5 flex items-center gap-1 ${isMe ? 'text-white/70' : 'text-gray-400'}`}>
                        📌 Mensaje fijado
                      </div>
                    )}
                  </div>

                  {/* Reactions */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1 px-1">
                      {Object.entries(
                        msg.reactions.reduce((acc, r) => {
                          acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      ).map(([emoji, count]) => (
                        <button
                          key={emoji}
                          onClick={() => handleReact(msg.id, emoji)}
                          className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-full text-xs hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm transition-all hover:scale-105"
                        >
                          <span>{emoji}</span>
                          <span className="text-gray-500 dark:text-gray-400 text-[10px] font-medium">{count}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Quick reaction button */}
                  {showReactPicker === msg.id && (
                    <div className="flex gap-0.5 mt-1.5 p-1.5 bg-white dark:bg-gray-800 rounded-2xl shadow-premium-lg border border-gray-200/60 dark:border-gray-700/60">
                      {QUICK_REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleReact(msg.id, emoji)}
                          className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all hover:scale-125"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className={`flex items-center gap-1 mt-0.5 ${isMe ? 'justify-end' : ''}`}>
                    <p className={`text-[10px] ${isMe ? 'mr-1' : 'ml-1'} text-gray-400 dark:text-gray-500`}>
                      {formatDate(msg.created_at)}
                      {msg.is_edited && <span className="ml-1 italic">(editado)</span>}
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
