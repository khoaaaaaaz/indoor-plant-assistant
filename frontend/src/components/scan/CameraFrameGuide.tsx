import { memo } from 'react';

// src/components/scan/CameraFrameGuide.tsx
export const CameraFrameGuide = memo(function CameraFrameGuide() {
  return (
    <svg viewBox="0 0 300 220" className="w-full opacity-60">
      {/* Rule-of-thirds grid — 2 đường ngang, 2 đường dọc */}
      <line x1="100" y1="0" x2="100" y2="220" stroke="white" strokeWidth="0.5" strokeDasharray="4,4" />
      <line x1="200" y1="0" x2="200" y2="220" stroke="white" strokeWidth="0.5" strokeDasharray="4,4" />
      <line x1="0" y1="73" x2="300" y2="73" stroke="white" strokeWidth="0.5" strokeDasharray="4,4" />
      <line x1="0" y1="147" x2="300" y2="147" stroke="white" strokeWidth="0.5" strokeDasharray="4,4" />

      {/* Corner brackets */}
      <path d="M20,20 L20,50 M20,20 L50,20" stroke="white" strokeWidth="2.5" fill="none" />
      <path d="M280,20 L280,50 M280,20 L250,20" stroke="white" strokeWidth="2.5" fill="none" />
      <path d="M20,200 L20,170 M20,200 L50,200" stroke="white" strokeWidth="2.5" fill="none" />
      <path d="M280,200 L280,170 M280,200 L250,200" stroke="white" strokeWidth="2.5" fill="none" />

      {/* Focus ring — animate pulse bằng CSS */}
      <circle cx="150" cy="110" r="28" stroke="white" strokeWidth="1.5"
        fill="none" className="animate-pulse opacity-50" />
      <circle cx="150" cy="110" r="28" stroke="white" strokeWidth="1.5" fill="none" />
    </svg>
  );
});

