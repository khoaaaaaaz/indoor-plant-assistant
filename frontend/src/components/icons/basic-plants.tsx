import type React from 'react'

interface BasicPlantProps {
  size?: number
  className?: string
  plantColor?: string
  potColor?: string
}

// Basic Plant - Simple Leaves
export const BasicSimplePlant: React.FC<BasicPlantProps> = ({
  size = 64,
  className = '',
  plantColor = '#4A9D6B',
  potColor = '#C9956F'
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Pot */}
    <path
      d="M 16 40 L 14 62 Q 14 72 22 76 L 42 76 Q 50 72 50 62 L 48 40 Z"
      fill={potColor}
      stroke={potColor}
      strokeWidth="0.5"
    />

    {/* Pot Rim */}
    <ellipse cx="32" cy="40" rx="16" ry="6" fill={potColor} />

    {/* Soil */}
    <ellipse cx="32" cy="46" rx="14" ry="5" fill="#A67C52" opacity="0.5" />

    {/* Left stems with leaves */}
    <path d="M 24 46 Q 18 35 15 20" stroke={plantColor} strokeWidth="1.5" fill="none" />
    <ellipse cx="16" cy="22" rx="3" ry="5" fill={plantColor} transform="rotate(-30 16 22)" />
    <ellipse cx="12" cy="25" rx="2.5" ry="4" fill={plantColor} transform="rotate(-50 12 25)" />

    {/* Center stem with leaves */}
    <path d="M 32 46 Q 32 30 32 12" stroke={plantColor} strokeWidth="1.5" fill="none" />
    <ellipse cx="38" cy="25" rx="3" ry="5" fill={plantColor} transform="rotate(35 38 25)" />
    <ellipse cx="26" cy="25" rx="3" ry="5" fill={plantColor} transform="rotate(-35 26 25)" />

    {/* Right stems with leaves */}
    <path d="M 40 46 Q 46 35 49 20" stroke={plantColor} strokeWidth="1.5" fill="none" />
    <ellipse cx="48" cy="22" rx="3" ry="5" fill={plantColor} transform="rotate(30 48 22)" />
    <ellipse cx="52" cy="25" rx="2.5" ry="4" fill={plantColor} transform="rotate(50 52 25)" />
  </svg>
)

// Basic Plant - Monstera Style
export const BasicMonsteraPlant: React.FC<BasicPlantProps> = ({
  size = 64,
  className = '',
  plantColor = '#3D8B6E',
  potColor = '#D9A87C'
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Pot */}
    <path
      d="M 16 42 L 14 64 Q 14 74 22 78 L 42 78 Q 50 74 50 64 L 48 42 Z"
      fill={potColor}
      stroke={potColor}
      strokeWidth="0.5"
    />

    {/* Pot Rim */}
    <ellipse cx="32" cy="42" rx="16" ry="6" fill={potColor} />

    {/* Soil */}
    <ellipse cx="32" cy="48" rx="14" ry="5" fill="#A67C52" opacity="0.5" />

    {/* Left large leaf */}
    <path
      d="M 22 48 Q 12 40 8 50 Q 12 55 22 50 Z"
      fill={plantColor}
      stroke={plantColor}
      strokeWidth="0.5"
    />
    <path d="M 12 46 Q 10 50 12 54" stroke={potColor} strokeWidth="0.5" opacity="0.3" />

    {/* Center tall leaf */}
    <path
      d="M 32 48 L 32 15 Q 30 20 32 25 Q 34 20 32 15 Z"
      fill={plantColor}
      stroke={plantColor}
      strokeWidth="0.5"
    />

    {/* Right large leaf */}
    <path
      d="M 42 48 Q 52 40 56 50 Q 52 55 42 50 Z"
      fill={plantColor}
      stroke={plantColor}
      strokeWidth="0.5"
    />
    <path d="M 52 46 Q 54 50 52 54" stroke={potColor} strokeWidth="0.5" opacity="0.3" />

    {/* Small accent leaves */}
    <ellipse cx="26" cy="35" rx="2" ry="4" fill={plantColor} transform="rotate(-25 26 35)" />
    <ellipse cx="38" cy="35" rx="2" ry="4" fill={plantColor} transform="rotate(25 38 35)" />
  </svg>
)

// Basic Plant - Cactus
export const BasicCactusPlant: React.FC<BasicPlantProps> = ({
  size = 64,
  className = '',
  plantColor = '#5CB85C',
  potColor = '#D4A574'
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Pot */}
    <path
      d="M 18 44 L 16 66 Q 16 76 24 80 L 40 80 Q 48 76 48 66 L 46 44 Z"
      fill={potColor}
      stroke={potColor}
      strokeWidth="0.5"
    />

    {/* Pot Rim */}
    <ellipse cx="32" cy="44" rx="14" ry="6" fill={potColor} />

    {/* Soil */}
    <ellipse cx="32" cy="50" rx="12" ry="5" fill="#A67C52" opacity="0.5" />

    {/* Main cactus body */}
    <rect x="28" y="18" width="8" height="32" rx="4" fill={plantColor} />

    {/* Left arm */}
    <rect x="14" y="35" width="6" height="14" rx="3" fill={plantColor} />

    {/* Right arm */}
    <rect x="44" y="35" width="6" height="14" rx="3" fill={plantColor} />

    {/* Spines on main body */}
    <line x1="27" y1="25" x2="22" y2="22" stroke={plantColor} strokeWidth="0.8" opacity="0.6" />
    <line x1="37" y1="25" x2="42" y2="22" stroke={plantColor} strokeWidth="0.8" opacity="0.6" />
    <line x1="27" y1="40" x2="22" y2="38" stroke={plantColor} strokeWidth="0.8" opacity="0.6" />
    <line x1="37" y1="40" x2="42" y2="38" stroke={plantColor} strokeWidth="0.8" opacity="0.6" />

    {/* Small flower on top */}
    <circle cx="32" cy="15" r="3" fill="#F4D860" />
    <circle cx="28" cy="13" r="2" fill="#F4D860" />
    <circle cx="36" cy="13" r="2" fill="#F4D860" />
  </svg>
)

// Basic Plant - Trailing Ivy
export const BasicIvyPlant: React.FC<BasicPlantProps> = ({
  size = 64,
  className = '',
  plantColor = '#6BC765',
  potColor = '#E8C560'
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Pot */}
    <path
      d="M 16 40 L 14 62 Q 14 72 22 76 L 42 76 Q 50 72 50 62 L 48 40 Z"
      fill={potColor}
      stroke={potColor}
      strokeWidth="0.5"
    />

    {/* Pot Rim */}
    <ellipse cx="32" cy="40" rx="16" ry="6" fill={potColor} />

    {/* Soil */}
    <ellipse cx="32" cy="46" rx="14" ry="5" fill="#A67C52" opacity="0.5" />

    {/* Main vine stem */}
    <path d="M 32 46 Q 28 35 25 20 Q 22 8 20 2" stroke={plantColor} strokeWidth="1.5" fill="none" />

    {/* Side vine */}
    <path d="M 32 46 Q 36 35 39 22 Q 42 12 44 4" stroke={plantColor} strokeWidth="1.5" fill="none" />

    {/* Trailing leaves on main vine */}
    <ellipse cx="20" cy="25" rx="2.5" ry="4" fill={plantColor} transform="rotate(-45 20 25)" />
    <ellipse cx="18" cy="35" rx="2.5" ry="4" fill={plantColor} transform="rotate(-45 18 35)" />
    <ellipse cx="22" cy="45" rx="2.5" ry="4" fill={plantColor} transform="rotate(-45 22 45)" />

    {/* Trailing leaves on side vine */}
    <ellipse cx="42" cy="28" rx="2.5" ry="4" fill={plantColor} transform="rotate(45 42 28)" />
    <ellipse cx="44" cy="38" rx="2.5" ry="4" fill={plantColor} transform="rotate(45 44 38)" />
    <ellipse cx="40" cy="48" rx="2.5" ry="4" fill={plantColor} transform="rotate(45 40 48)" />

    {/* Cascading single leaves at bottom */}
    <circle cx="24" cy="8" r="1.5" fill={plantColor} />
    <circle cx="42" cy="6" r="1.5" fill={plantColor} />
  </svg>
)
