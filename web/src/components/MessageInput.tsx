import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { uploadFile } from '../services/api';
import { Send, Paperclip, Mic, X, Loader2, Image as ImageIcon, Smile, ArrowUp } from 'lucide-react';
import EmojiPicker from './EmojiPicker';
import toast from 'react-hot-toast';

interface MessageInputProps {
  onSend: (content: string, fileUrl?: string, fileName?: string, fileSize?: number) => void;
  onTyping: (typing: boolean) => void;
  conversationName: string;
  replyTo?: { id: number; content: string; sender: string } | null;
  onCancelReply?: () => void;
  externalFiles?: File[] | null;
  onExternalFilesConsumed?: () => void;
}

interface PendingFile {
  file: File;
  previewUrl?: string;
}

export default function MessageInput({ onSend, onTyping, conversationName, replyTo, onCancelReply, externalFiles, onExternalFilesConsumed }: MessageInputProps) {
  const [text, setText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);
  const token = useAuthStore((s) => s.token)!;

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      pendingFiles.forEach((pf) => { if (pf.previewUrl) URL.revokeObjectURL(pf.previewUrl); });
    };
  }, []);

  useEffect(() => {
    if (externalFiles && externalFiles.length > 0) {
      addFiles(externalFiles);
      onExternalFilesConsumed?.();
    }
  }, [externalFiles]);

  const handleTextChange = (value: string) => {
    setText(value);
    onTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => onTyping(false), 2000);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  };

  const addFiles = (files: FileList | File[]) => {
    const newFiles: PendingFile[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 25 * 1024 * 1024) {
        toast.error(`${file.name} supera 25MB`);
        continue;
      }
      const pf: PendingFile = { file };
      if (file.type.startsWith('image/')) {
        pf.previewUrl = URL.createObjectURL(file);
      }
      newFiles.push(pf);
    }
    setPendingFiles((prev) => [...prev, ...newFiles]);
  };

  const handleSend = async () => {
    if (!text.trim() && pendingFiles.length === 0) return;

    if (pendingFiles.length > 0) {
      setIsUploading(true);
      try {
        for (const pf of pendingFiles) {
          const result = await uploadFile(pf.file, token);
          onSend(text.trim() || '', result.url, result.name, result.size);
          setText('');
        }
        setPendingFiles([]);
      } catch (err: any) {
        toast.error(err.message || 'Error al subir archivo');
      } finally {
        setIsUploading(false);
      }
    } else {
      onSend(text.trim());
      setText('');
    }

    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    onTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = '';
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) addFiles([file]);
      }
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }, []);

  const removeFile = (index: number) => {
    setPendingFiles((prev) => {
      const updated = [...prev];
      if (updated[index].previewUrl) URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      ref={containerRef}
      className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 transition-colors"
    >
      {/* Reply preview */}
      {replyTo && (
        <div className="mb-2 p-2 bg-nexus-50 dark:bg-nexus-900/30 rounded-xl border-l-4 border-nexus-500 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-nexus-700 dark:text-nexus-300">{replyTo.sender}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{replyTo.content}</p>
          </div>
          <button onClick={onCancelReply} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* File previews */}
      {pendingFiles.length > 0 && (
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
          {pendingFiles.map((pf, i) => (
            <div key={i} className="relative flex-shrink-0">
              {pf.previewUrl ? (
                <img src={pf.previewUrl} alt="Preview" className="h-20 rounded-lg object-cover" />
              ) : (
                <div className="h-20 w-32 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-700 dark:text-gray-300 truncate">{pf.file.name}</p>
                    <p className="text-[10px] text-gray-400">{formatFileSize(pf.file.size)}</p>
                  </div>
                </div>
              )}
              <button
                onClick={() => removeFile(i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs shadow"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={() => imageInputRef.current?.click()}
            disabled={isUploading}
            className="p-2.5 text-gray-500 dark:text-gray-400 hover:text-nexus-600 dark:hover:text-nexus-400 hover:bg-nexus-50 dark:hover:bg-nexus-900/30 rounded-xl transition-colors"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="p-2.5 text-gray-500 dark:text-gray-400 hover:text-nexus-600 dark:hover:text-nexus-400 hover:bg-nexus-50 dark:hover:bg-nexus-900/30 rounded-xl transition-colors"
          >
            <Paperclip className="w-5 h-5" />
          </button>
        </div>
        <input ref={imageInputRef} type="file" onChange={handleFileSelect} className="hidden" accept="image/*" multiple />
        <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" multiple />

        <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-2 flex items-end">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={`Escribir mensaje a ${conversationName}...`}
            className="flex-1 bg-transparent resize-none outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 max-h-[150px]"
            rows={1}
          />
        </div>

        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowEmoji(!showEmoji)}
            className="p-2.5 text-gray-500 dark:text-gray-400 hover:text-nexus-600 dark:hover:text-nexus-400 hover:bg-nexus-50 dark:hover:bg-nexus-900/30 rounded-xl transition-colors"
          >
            <Smile className="w-5 h-5" />
          </button>
          {showEmoji && (
            <EmojiPicker
              onSelect={(emoji) => setText((prev) => prev + emoji)}
              onClose={() => setShowEmoji(false)}
            />
          )}
        </div>

        {text.trim() || pendingFiles.length > 0 ? (
          <button
            onClick={handleSend}
            disabled={isUploading}
            className="p-2.5 bg-nexus-600 hover:bg-nexus-500 text-white rounded-xl transition-colors flex-shrink-0 shadow-sm"
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ArrowUp className="w-5 h-5" />
            )}
          </button>
        ) : (
          <button className="p-2.5 text-gray-500 dark:text-gray-400 hover:text-nexus-600 dark:hover:text-nexus-400 hover:bg-nexus-50 dark:hover:bg-nexus-900/30 rounded-xl transition-colors flex-shrink-0">
            <Mic className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
