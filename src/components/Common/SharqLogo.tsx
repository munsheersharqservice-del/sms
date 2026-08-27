import React from 'react';

interface SharqLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark' | 'color';
  showText?: boolean;
}

export const SharqLogo: React.FC<SharqLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'color',
  showText = true,
}) => {
  const sizeMap = {
    sm: { icon: 'w-6 h-6', text: 'text-sm', sub: 'text-[9px]' },
    md: { icon: 'w-9 h-9', text: 'text-lg', sub: 'text-[11px]' },
    lg: { icon: 'w-12 h-12', text: 'text-2xl', sub: 'text-xs' },
    xl: { icon: 'w-16 h-16', text: 'text-3xl', sub: 'text-sm' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center space-x-2.5 ${className}`}>
      {/* Precision Vector Symbol: 4-petal Sharq Emblem */}
      <svg
        viewBox="0 0 100 100"
        className={`${currentSize.icon} shrink-0 drop-shadow-xs`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Top-Right Large Orange Petal */}
        <path
          d="M50 46 C 45 20, 70 8, 85 22 C 92 35, 75 52, 50 46 Z"
          fill="#FF5722"
        />
        {/* Top-Left Medium Orange Petal */}
        <path
          d="M46 50 C 20 40, 8 18, 22 8 C 35 2, 52 25, 46 50 Z"
          fill="#FF5722"
          transform="rotate(-50 46 50)"
        />
        {/* Right Lower Orange Petal */}
        <path
          d="M54 52 C 72 45, 96 52, 94 68 C 88 80, 64 70, 54 52 Z"
          fill="#FF5722"
        />
        {/* Bottom Small Orange Petal */}
        <path
          d="M50 56 C 58 65, 62 82, 52 86 C 44 88, 42 72, 50 56 Z"
          fill="#FF5722"
        />
        {/* Bottom-Left Leaf Petal - Vibrant Medical Green */}
        <path
          d="M46 54 C 40 70, 22 86, 12 76 C 5 62, 26 44, 46 54 Z"
          fill="#4CAF50"
        />
      </svg>

      {showText && (
        <div className="flex flex-col leading-none select-none">
          <div className="flex items-baseline space-x-1">
            <span
              className={`font-black tracking-tight lowercase ${
                variant === 'light' ? 'text-white' : 'text-[#212529]'
              } ${currentSize.text}`}
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
            >
              sharq
            </span>
          </div>
          <span
            className={`font-extrabold tracking-wide lowercase ${
              variant === 'light' ? 'text-emerald-400' : 'text-[#4CAF50]'
            } ${currentSize.sub}`}
            style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
          >
            medical supply
          </span>
        </div>
      )}
    </div>
  );
};
