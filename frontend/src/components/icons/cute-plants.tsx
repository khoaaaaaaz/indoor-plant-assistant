import type React from 'react'

interface CutePlantProps {
  size?: number
  className?: string
}

// Cute Pink Pot with Yellow Flowers
export const CuteYellowFlowerPlant: React.FC<CutePlantProps> = ({
  size = 80,
  className = ''
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 120 140"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Shadow */}
    <ellipse cx="60" cy="128" rx="35" ry="8" fill="#E8D4C4" />

    {/* Pot */}
    <path
      d="M 30 65 L 25 100 Q 25 115 35 120 L 85 120 Q 95 115 95 100 L 90 65 Z"
      fill="#F4A8C8"
      stroke="#E085A8"
      strokeWidth="1.5"
    />

    {/* Pot Rim */}
    <ellipse cx="60" cy="65" rx="30" ry="10" fill="#F4C4D9" stroke="#E085A8" strokeWidth="1.5" />

    {/* Soil */}
    <ellipse cx="60" cy="75" rx="28" ry="8" fill="#D4A574" />

    {/* Left Flower Branch */}
    <path d="M 40 75 Q 35 60 30 40" stroke="#A8C86B" strokeWidth="2.5" fill="none" />
    
    {/* Right Flower Branch */}
    <path d="M 50 75 Q 52 55 55 35" stroke="#A8C86B" strokeWidth="2.5" fill="none" />
    
    {/* Center Flower Branch */}
    <path d="M 60 75 Q 65 58 70 38" stroke="#A8C86B" strokeWidth="2.5" fill="none" />

    {/* Flowers - Yellow petals */}
    <circle cx="30" cy="38" r="5" fill="#F4D860" />
    <circle cx="32" cy="33" r="5" fill="#F4D860" />
    <circle cx="28" cy="33" r="5" fill="#F4D860" />
    <circle cx="55" cy="32" r="5" fill="#F4D860" />
    <circle cx="57" cy="27" r="5" fill="#F4D860" />
    <circle cx="53" cy="27" r="5" fill="#F4D860" />
    <circle cx="70" cy="36" r="5" fill="#F4D860" />
    <circle cx="72" cy="31" r="5" fill="#F4D860" />
    <circle cx="68" cy="31" r="5" fill="#F4D860" />

    {/* Small leaves */}
    <ellipse cx="45" cy="68" rx="4" ry="8" fill="#A8C86B" transform="rotate(-30 45 68)" />
    <ellipse cx="75" cy="70" rx="4" ry="8" fill="#A8C86B" transform="rotate(30 75 70)" />

    {/* Eyes */}
    <circle cx="48" cy="95" r="3.5" fill="#8B4545" />
    <circle cx="72" cy="95" r="3.5" fill="#8B4545" />

    {/* Shine in eyes */}
    <circle cx="49" cy="94" r="1.5" fill="#FFFFFF" />
    <circle cx="73" cy="94" r="1.5" fill="#FFFFFF" />

    {/* Happy mouth */}
    <path
      d="M 55 105 Q 60 108 65 105"
      stroke="#8B4545"
      strokeWidth="1.5"
      fill="none"
      strokeLinecap="round"
    />

    {/* Small nose */}
    <circle cx="60" cy="100" r="1.5" fill="#8B4545" />

    {/* Blush */}
    <ellipse cx="42" cy="100" rx="4" ry="3" fill="#F4A8C8" opacity="0.6" />
    <ellipse cx="78" cy="100" rx="4" ry="3" fill="#F4A8C8" opacity="0.6" />
  </svg>
)

// Cute Orange Pot with Monstera (closed eyes happy face)
export const CuteMonsteraPlant: React.FC<CutePlantProps> = ({
  size = 80,
  className = ''
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 120 140"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Shadow */}
    <ellipse cx="60" cy="128" rx="35" ry="8" fill="#D9C4B8" />

    {/* Pot */}
    <path
      d="M 30 70 L 25 105 Q 25 120 35 125 L 85 125 Q 95 120 95 105 L 90 70 Z"
      fill="#F4B860"
      stroke="#E89844"
      strokeWidth="1.5"
    />

    {/* Pot Rim */}
    <ellipse cx="60" cy="70" rx="30" ry="10" fill="#F4D090" stroke="#E89844" strokeWidth="1.5" />

    {/* Soil */}
    <ellipse cx="60" cy="80" rx="28" ry="8" fill="#C49060" />

    {/* Monstera Stems */}
    <path d="M 50 80 Q 45 60 40 35" stroke="#9E9E9E" strokeWidth="2" fill="none" />
    <path d="M 60 80 Q 62 55 65 30" stroke="#9E9E9E" strokeWidth="2" fill="none" />
    <path d="M 70 80 Q 75 65 80 40" stroke="#9E9E9E" strokeWidth="2" fill="none" />

    {/* Large Monstera Leaves */}
    <g>
      {/* Left leaf */}
      <path
        d="M 40 35 Q 25 30 20 45 Q 25 50 40 45 Z"
        fill="#5CB85C"
        stroke="#4A9D4A"
        strokeWidth="1"
      />
      {/* Leaf holes */}
      <circle cx="30" cy="38" r="2" fill="#F4B860" opacity="0.3" />
    </g>

    <g>
      {/* Center leaf */}
      <path
        d="M 65 30 L 50 25 Q 45 28 50 40 L 65 45 Z"
        fill="#5CB85C"
        stroke="#4A9D4A"
        strokeWidth="1"
      />
    </g>

    <g>
      {/* Right leaf */}
      <path
        d="M 80 40 Q 95 35 100 50 Q 95 55 80 50 Z"
        fill="#5CB85C"
        stroke="#4A9D4A"
        strokeWidth="1"
      />
    </g>

    {/* Closed Happy Eyes */}
    <path
      d="M 48 98 Q 50 100 52 98"
      stroke="#8B4545"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
    />
    <path
      d="M 68 98 Q 70 100 72 98"
      stroke="#8B4545"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
    />

    {/* Happy smile */}
    <path
      d="M 55 105 Q 60 108 65 105"
      stroke="#8B4545"
      strokeWidth="1.5"
      fill="none"
      strokeLinecap="round"
    />

    {/* Blush */}
    <ellipse cx="42" cy="102" rx="4" ry="3" fill="#F4B860" opacity="0.6" />
    <ellipse cx="78" cy="102" rx="4" ry="3" fill="#F4B860" opacity="0.6" />
  </svg>
)

// Cute Coral Pot with Tulips
export const CuteTulipPlant: React.FC<CutePlantProps> = ({
  size = 80,
  className = ''
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 120 140"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Shadow */}
    <ellipse cx="60" cy="128" rx="35" ry="8" fill="#D4B8AC" />

    {/* Pot */}
    <path
      d="M 32 68 L 28 103 Q 28 118 38 123 L 82 123 Q 92 118 92 103 L 88 68 Z"
      fill="#E8A895"
      stroke="#D68870"
      strokeWidth="1.5"
    />

    {/* Pot Rim with pattern */}
    <ellipse cx="60" cy="68" rx="28" ry="9" fill="#F0BFA8" stroke="#D68870" strokeWidth="1.5" />
    <path d="M 35 68 L 35 72 M 45 68 L 45 72 M 55 68 L 55 72 M 65 68 L 65 72 M 75 68 L 75 72 M 85 68 L 85 72" stroke="#D68870" strokeWidth="0.8" />

    {/* Soil */}
    <ellipse cx="60" cy="78" rx="26" ry="7" fill="#C48060" />

    {/* Stems */}
    <path d="M 48 78 Q 45 55 43 30" stroke="#7BAE5C" strokeWidth="2" fill="none" />
    <path d="M 60 78 Q 62 50 65 25" stroke="#7BAE5C" strokeWidth="2" fill="none" />
    <path d="M 72 78 Q 75 60 78 35" stroke="#7BAE5C" strokeWidth="2" fill="none" />

    {/* Tulip flowers */}
    {/* Left tulip - red */}
    <ellipse cx="43" cy="25" rx="4" ry="7" fill="#E85D5D" />
    <ellipse cx="40" cy="28" rx="3.5" ry="6" fill="#E85D5D" />
    <ellipse cx="46" cy="28" rx="3.5" ry="6" fill="#E85D5D" />

    {/* Center tulip - pink */}
    <ellipse cx="65" cy="20" rx="4" ry="7" fill="#F4A8C8" />
    <ellipse cx="62" cy="23" rx="3.5" ry="6" fill="#F4A8C8" />
    <ellipse cx="68" cy="23" rx="3.5" ry="6" fill="#F4A8C8" />

    {/* Right tulip - red */}
    <ellipse cx="78" cy="30" rx="4" ry="7" fill="#E85D5D" />
    <ellipse cx="75" cy="33" rx="3.5" ry="6" fill="#E85D5D" />
    <ellipse cx="81" cy="33" rx="3.5" ry="6" fill="#E85D5D" />

    {/* Green leaves on stems */}
    <ellipse cx="40" cy="55" rx="3" ry="6" fill="#7BAE5C" transform="rotate(-25 40 55)" />
    <ellipse cx="70" cy="50" rx="3" ry="6" fill="#7BAE5C" transform="rotate(15 70 50)" />
    <ellipse cx="80" cy="60" rx="3" ry="6" fill="#7BAE5C" transform="rotate(30 80 60)" />

    {/* Eyes */}
    <circle cx="48" cy="100" r="3.5" fill="#8B4545" />
    <circle cx="72" cy="100" r="3.5" fill="#8B4545" />

    {/* Shine in eyes */}
    <circle cx="49" cy="99" r="1.5" fill="#FFFFFF" />
    <circle cx="73" cy="99" r="1.5" fill="#FFFFFF" />

    {/* Smile with small wink */}
    <path
      d="M 55 108 Q 60 111 65 108"
      stroke="#8B4545"
      strokeWidth="1.5"
      fill="none"
      strokeLinecap="round"
    />
    <path d="M 65 99 Q 67 101 69 99" stroke="#8B4545" strokeWidth="1.5" fill="none" strokeLinecap="round" />

    {/* Blush */}
    <ellipse cx="40" cy="105" rx="5" ry="3.5" fill="#E8A895" opacity="0.7" />
    <ellipse cx="80" cy="105" rx="5" ry="3.5" fill="#E8A895" opacity="0.7" />
  </svg>
)
