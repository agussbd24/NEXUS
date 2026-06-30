import { RefObject } from 'react';
import UserAvatar from './UserAvatar';
import { FileText, Download, Image as ImageIcon } from 'lucide-react';

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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImageFile = (name: string | null) => {
    if (!name) return false;
    const ext = name.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '');
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
                    className={`px-4 py-2 rounded-2xl ${
                      isMe
                        ? 'bg-nexus-600 text-white rounded-br-md'
                        : 'bg-white text-gray-900 border border-gray-200 rounded-bl-md shadow-sm'
                    }`}
                  >
                    {msg.content_type === 'file' && msg.file_url ? (
                      <div>
                        {isImageFile(msg.file_name) ? (
                          <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="block">
                            <img
                              src={msg.file_url}
                              alt={msg.file_name || 'Imagen'}
                              className="max-w-[280px] max-h-[300px] rounded-lg object-cover"
                              loading="lazy"
                            />
                            <p className="text-xs mt-1 opacity-75">{msg.file_name}</p>
                          </a>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-lg ${isMe ? 'bg-nexus-700' : 'bg-gray-100'}`}>
                              <FileText className={`w-5 h-5 ${isMe ? 'text-nexus-200' : 'text-gray-500'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{msg.file_name || 'Archivo'}</p>
                              {msg.file_size && (
                                <p className={`text-xs ${isMe ? 'text-nexus-200' : 'text-gray-400'}`}>
                                  {formatFileSize(msg.file_size)}
                                </p>
                              )}
                            </div>
                            <a
                              href={msg.file_url}
                              download
                              className={`p-1.5 rounded-lg ${isMe ? 'bg-nexus-700 hover:bg-nexus-800' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}
                            >
                              <Download className={`w-4 h-4 ${isMe ? 'text-white' : 'text-gray-600'}`} />
                            </a>
                          </div>
                        )}
                      </div>
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
