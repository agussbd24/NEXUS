interface UserAvatarProps {
  name: string;
  isOnline?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function UserAvatar({ name, isOnline = false, size = 'md', className = '' }: UserAvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const colors = [
    'bg-nexus-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-cyan-500',
    'bg-violet-500',
    'bg-pink-500',
    'bg-teal-500',
  ];

  const colorIndex = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      <div
        className={`${sizeClasses[size]} ${colors[colorIndex]} rounded-full flex items-center justify-center text-white font-semibold shadow-sm`}
      >
        {initials}
      </div>
      {isOnline && (
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full online-pulse" />
      )}
    </div>
  );
}
