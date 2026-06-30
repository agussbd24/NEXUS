interface UserAvatarProps {
  name: string;
  isOnline?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const COLORS = [
  'bg-rose-500', 'bg-sky-500', 'bg-amber-500', 'bg-emerald-500',
  'bg-violet-500', 'bg-pink-500', 'bg-cyan-500', 'bg-orange-500',
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
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
};

export default function UserAvatar({ name, isOnline, size = 'md', className = '' }: UserAvatarProps) {
  return (
    <div className={`relative inline-flex flex-shrink-0 ${className}`}>
      <div
        className={`${sizes[size]} ${getColor(name)} rounded-full flex items-center justify-center text-white font-semibold shadow-sm`}
      >
        {getInitials(name)}
      </div>
      {isOnline !== undefined && (
        <span
          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${
            isOnline ? 'bg-green-500 online-pulse' : 'bg-gray-400 dark:bg-gray-600'
          }`}
        />
      )}
    </div>
  );
}
