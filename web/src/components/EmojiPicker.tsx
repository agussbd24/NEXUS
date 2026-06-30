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
    <div ref={ref} className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-900 rounded-2xl shadow-premium-xl border border-gray-200/60 dark:border-gray-800/60 w-[340px] z-50 overflow-hidden">
      <div className="p-2.5 border-b border-gray-100 dark:border-gray-800">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar emoji..."
          className="w-full px-3.5 py-2 bg-gray-100/80 dark:bg-gray-800/80 rounded-xl text-sm outline-none dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-nexus-500/30 transition-all"
          autoFocus
        />
      </div>

      {!search && (
        <div className="flex gap-1 px-2.5 py-2 border-b border-gray-100 dark:border-gray-800 overflow-x-auto scrollbar-thin">
          {EMOJI_CATEGORIES.map((cat, i) => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(i)}
              className={`px-2.5 py-1.5 text-xs rounded-xl whitespace-nowrap transition-all ${
                activeCategory === i
                  ? 'bg-nexus-100 dark:bg-nexus-900/50 text-nexus-700 dark:text-nexus-300 font-semibold'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      <div className="max-h-[240px] overflow-y-auto p-2.5 scrollbar-thin">
        {(search ? filteredCategories : [EMOJI_CATEGORIES[activeCategory]]).map((cat) => (
          <div key={cat.name}>
            {!search && <p className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider px-1 mb-1.5">{cat.name}</p>}
            <div className="grid grid-cols-8 gap-0.5">
              {cat.emojis.map((emoji, i) => (
                <button
                  key={`${emoji}-${i}`}
                  onClick={() => { onSelect(emoji); onClose(); }}
                  className="w-9 h-9 flex items-center justify-center text-xl hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all hover:scale-110"
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
