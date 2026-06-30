import { useState, useRef, useEffect } from 'react';

const EMOJI_CATEGORIES = [
  { name: 'Frecuentes', emojis: ['😀', '😂', '😍', '🥰', '😎', '🤔', '😅', '👍', '👋', '❤️', '🔥', '✅', '👏', '🙏', '💪', '🎉'] },
  { name: 'Caras', emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🫢', '🤫', '🤔', '🫡', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐'] },
  { name: 'Gestos', emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '🫱', '🫲', '🫳', '🫴', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '🫵', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '🫶', '👐', '🤲', '🤝', '🙏', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🦷', '🦴', '👀', '👁️', '👅', '👄'] },
  { name: 'Animales', emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞'] },
  { name: 'Comida', emojis: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🍆', '🥔', '🥕', '🌽', '🌶️', '🫑', '🥒', '🥬', '🥦', '🧄', '🧅', '🍄'] },
  { name: 'Actividades', emojis: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌', '🎿', '🎯'] },
  { name: 'Objetos', emojis: ['⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️'] },
  { name: 'Símbolos', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '✨', '⭐', '🌟', '💫', '🔥', '💥', '❄️', '🌈', '☀️', '🌤️', '⛅', '🌥️'] },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const filteredCategories = search
    ? [{ name: 'Busqueda', emojis: EMOJI_CATEGORIES.flatMap((c) => c.emojis).filter((e) => e.includes(search)) }]
    : EMOJI_CATEGORIES;

  return (
    <div ref={ref} className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-[340px] z-50 overflow-hidden">
      <div className="p-2 border-b border-gray-100 dark:border-gray-700">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar emoji..."
          className="w-full px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm outline-none dark:text-white"
          autoFocus
        />
      </div>

      {!search && (
        <div className="flex gap-1 px-2 py-1.5 border-b border-gray-100 dark:border-gray-700 overflow-x-auto">
          {EMOJI_CATEGORIES.map((cat, i) => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(i)}
              className={`px-2 py-1 text-xs rounded-lg whitespace-nowrap transition-colors ${
                activeCategory === i
                  ? 'bg-nexus-100 dark:bg-nexus-900 text-nexus-700 dark:text-nexus-300 font-medium'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      <div className="max-h-[240px] overflow-y-auto p-2">
        {(search ? filteredCategories : [EMOJI_CATEGORIES[activeCategory]]).map((cat) => (
          <div key={cat.name}>
            {!search && <p className="text-xs text-gray-400 dark:text-gray-500 font-medium px-1 mb-1">{cat.name}</p>}
            <div className="grid grid-cols-8 gap-0.5">
              {cat.emojis.map((emoji, i) => (
                <button
                  key={`${emoji}-${i}`}
                  onClick={() => { onSelect(emoji); onClose(); }}
                  className="w-9 h-9 flex items-center justify-center text-xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
