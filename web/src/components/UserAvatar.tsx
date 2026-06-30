interface UserAvatarProps {
  name: string;
  isOnline?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const COLORS = [
  'from-rose-400 to-rose-600',
  'from-sky-400 to-sky-600',
  'from-amber-400 to-amber-600',
  'from-emerald-400 to-emerald-600',
  'from-violet-400 to-violet-600',
  'from-pink-400 to-pink-600',
  'from-cyan-400 to-cyan-600',
  'from-orange-400 to-orange-600',
];

function getColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const sizes = {
  sm: 'w-9 h-9 text-[11px]',
  md: 'w-11 h-11 text-sm',
  lg: 'w-16 h-16 text-xl',
};

const onlineSizes = {
  sm: 'w-2.5 h-2.5 border-[1.5px]',
  md: 'w-3 h-3 border-2',
  lg: 'w-4 h-4 border-2',
};

export default function UserAvatar({ name, isOnline, size = 'md', className = '' }: UserAvatarProps) {
  return (
    <div className={`relative inline-flex flex-shrink-0 ${className}`}>
      <div
        className={`${sizes[size]} bg-gradient-to-br ${getColor(name)} rounded-full flex items-center justify-center text-white font-bold shadow-sm`}
      >
        {getInitials(name)}
      </div>
      {isOnline !== undefined && (
        <span
          className={`absolute bottom-0 right-0 ${onlineSizes[size]} rounded-full border-white dark:border-gray-900 ${
            isOnline ? 'bg-green-500 online-pulse' : 'bg-gray-400 dark:bg-gray-600'
          }`}
        />
      )}
    </div>
  );
}
