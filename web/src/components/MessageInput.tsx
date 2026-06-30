import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { uploadFile } from '../services/api';
import { Send, Paperclip, Mic, X, Loader2, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

interface MessageInputProps {
  onSend: (content: string, fileUrl?: string, fileName?: string, fileSize?: number) => void;
  onTyping: (typing: boolean) => void;
  conversationName: string;
}

export default function MessageInput({ onSend, onTyping, conversationName }: MessageInputProps) {
  const [text, setText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const token = useAuthStore((s) => s.token)!;

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

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

  const handleSend = async () => {
    if (!text.trim() && !selectedFile) return;

    if (selectedFile) {
      setIsUploading(true);
      try {
        const result = await uploadFile(selectedFile, token);
        onSend(text.trim(), result.url, result.name, result.size);
        setSelectedFile(null);
        setPreviewUrl(null);
        setText('');
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
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        toast.error('El archivo no puede superar 100MB');
        return;
      }
      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
    }
    e.target.value = '';
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="border-t border-gray-200 bg-white p-3">
      {/* File preview */}
      {selectedFile && (
        <div className="mb-2 p-2 bg-gray-50 rounded-xl">
          {previewUrl ? (
            <div className="relative inline-block">
              <img src={previewUrl} alt="Preview" className="max-h-32 rounded-lg" />
              <button
                onClick={clearFile}
                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700 flex-1 truncate">{selectedFile.name}</span>
              <span className="text-xs text-gray-400">{formatFileSize(selectedFile.size)}</span>
              <button onClick={clearFile} className="p-1 text-gray-400 hover:text-red-500 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* File upload */}
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={() => imageInputRef.current?.click()}
            disabled={isUploading}
            className="p-2.5 text-gray-500 hover:text-nexus-600 hover:bg-nexus-50 rounded-xl transition-colors"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="p-2.5 text-gray-500 hover:text-nexus-600 hover:bg-nexus-50 rounded-xl transition-colors"
          >
            <Paperclip className="w-5 h-5" />
          </button>
        </div>
        <input
          ref={imageInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*"
        />
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar,.mp3,.mp4"
        />

        {/* Text input */}
        <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-2 flex items-end">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Escribir mensaje a ${conversationName}...`}
            className="flex-1 bg-transparent resize-none outline-none text-sm text-gray-900 placeholder-gray-500 max-h-[150px]"
            rows={1}
          />
        </div>

        {/* Send button */}
        {text.trim() || selectedFile ? (
          <button
            onClick={handleSend}
            disabled={isUploading}
            className="p-2.5 bg-nexus-600 hover:bg-nexus-500 text-white rounded-xl transition-colors flex-shrink-0 shadow-sm"
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        ) : (
          <button className="p-2.5 text-gray-500 hover:text-nexus-600 hover:bg-nexus-50 rounded-xl transition-colors flex-shrink-0">
            <Mic className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
