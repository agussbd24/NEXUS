import { RefObject, useState } from 'react';
import UserAvatar from './UserAvatar';
import { FileText, Download, X, ExternalLink } from 'lucide-react';

interface Message {
  id: number;
  sender_id: number;
  content: string | null;
  content_type: string;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  is_deleted: number;
  is_edited: number;
  created_at: string;
  sender_nombre: string;
  sender_apellido: string;
  sender_avatar: string | null;
}

interface MessageListProps {
  messages: Message[];
  currentUserId: number;
  messagesEndRef: RefObject<HTMLDivElement>;
}

function getFileCategory(name: string | null): string {
  if (!name) return 'other';
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'].includes(ext)) return 'audio';
  if (ext === 'pdf') return 'pdf';
  if (['txt', 'md', 'json', 'csv', 'log'].includes(ext)) return 'text';
  if (['doc', 'docx'].includes(ext)) return 'doc';
  if (['xls', 'xlsx'].includes(ext)) return 'xls';
  if (['ppt', 'pptx'].includes(ext)) return 'ppt';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
  return 'other';
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
              {badge('PDF', 'bg-red-100 text-red-700')}
              <span className="text-xs text-gray-500">{msg.file_size ? formatFileSize(msg.file_size) : ''}</span>
            </div>
            <div className="w-full h-[300px] border border-gray-200 rounded-lg overflow-hidden bg-white">
              <iframe src={url} className="w-full h-full" title={msg.file_name || 'PDF'} />
            </div>
          </div>
        );
      case 'text':
        return (
          <div className="cursor-pointer" onClick={() => setShowModal(true)}>
            <div className="flex items-center gap-2 mb-1">
              {badge('TXT', 'bg-gray-100 text-gray-700')}
              <span className="text-xs text-gray-500">{msg.file_size ? formatFileSize(msg.file_size) : ''}</span>
            </div>
            <div className="max-h-[200px] overflow-auto bg-gray-50 rounded-lg border border-gray-200 p-2">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">{msg.file_name}</pre>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-3 min-w-[200px]">
            <div className={`p-3 rounded-xl ${isMe ? 'bg-nexus-700' : 'bg-gray-100'}`}>
              <FileText className={`w-6 h-6 ${isMe ? 'text-nexus-200' : 'text-gray-500'}`} />
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
            className={`text-xs flex items-center gap-1 ${isMe ? 'text-nexus-200 hover:text-white' : 'text-nexus-600 hover:text-nexus-800'}`}
          >
            <ExternalLink className="w-3 h-3" /> Abrir
          </a>
          <a
            href={url}
            download={msg.file_name}
            className={`text-xs flex items-center gap-1 ${isMe ? 'text-nexus-200 hover:text-white' : 'text-nexus-600 hover:text-nexus-800'}`}
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
            {category === 'pdf' && <iframe src={url} className="w-full h-[85vh] rounded-lg bg-white" title={msg.file_name || 'PDF'} />}
          </div>
        </div>
      )}
    </>
  );
}

export default function MessageList({ messages, currentUserId, messagesEndRef }: MessageListProps) {
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
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
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
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjEiIGZpbGw9IiNlNWU3ZWIiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZykiLz48L3N2Zz4=')] bg-gray-50">
      {groupedMessages.length === 0 && (
        <div className="flex items-center justify-center h-full text-gray-400 text-sm">
          No hay mensajes todavia
        </div>
      )}
      {groupedMessages.map((group) => (
        <div key={group.date}>
          <div className="flex items-center justify-center my-4">
            <div className="px-3 py-1 bg-white/80 text-gray-600 text-xs rounded-full font-medium shadow-sm border border-gray-200">
              {new Date(group.messages[0].created_at).toLocaleDateString('es', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </div>
          </div>

          {group.messages.map((msg, idx) => {
            const isMe = msg.sender_id === currentUserId;
            const showAvatar = idx === 0 || group.messages[idx - 1].sender_id !== msg.sender_id;

            if (msg.is_deleted) {
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1`}>
                  <div className="px-4 py-2 bg-gray-100 rounded-xl text-gray-400 text-sm italic">
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
              >
                {!isMe && showAvatar && (
                  <UserAvatar
                    name={`${msg.sender_nombre} ${msg.sender_apellido}`}
                    size="sm"
                    className="mr-2 mt-1"
                  />
                )}
                {!isMe && !showAvatar && <div className="w-8 mr-2" />}

                <div className={`max-w-md ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && showAvatar && (
                    <p className="text-xs text-gray-500 ml-1 mb-0.5 font-medium">
                      {msg.sender_nombre} {msg.sender_apellido}
                    </p>
                  )}

                  <div
                    className={`rounded-2xl overflow-hidden ${
                      isMe
                        ? 'bg-nexus-600 text-white rounded-br-md'
                        : 'bg-white text-gray-900 border border-gray-200 rounded-bl-md shadow-sm'
                    } ${isMedia ? 'p-1' : 'px-4 py-2'}`}
                  >
                    {hasFile ? (
                      <FilePreview msg={msg} isMe={isMe} />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    )}
                  </div>

                  <p className={`text-[10px] mt-0.5 ${isMe ? 'text-right mr-1' : 'ml-1'} text-gray-400`}>
                    {formatDate(msg.created_at)}
                    {msg.is_edited && <span className="ml-1">(editado)</span>}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
