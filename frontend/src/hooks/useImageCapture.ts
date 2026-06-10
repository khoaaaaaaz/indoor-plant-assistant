import { useRef } from 'react';
import imageCompression from 'browser-image-compression';

export function useImageCapture() {
  const controllerRef = useRef<AbortController | null>(null);

  const squareCrop = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        const size = Math.min(img.width, img.height);
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas ctx null'));

        const startX = (img.width - size) / 2;
        const startY = (img.height - size) / 2;

        ctx.drawImage(img, startX, startY, size, size, 0, 0, size, size);
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('Blob failed'));
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          },
          'image/jpeg',
          1.0
        );
      };
      img.onerror = (err) => {
        URL.revokeObjectURL(img.src);
        reject(err);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const prepareImage = async (file: File): Promise<File> => {
    // 1. Crop to square to prevent backend distortion
    const squaredFile = await squareCrop(file);

    // 2. Compress (relaxed limits for better model accuracy)
    return await imageCompression(squaredFile, {
      maxSizeMB: 1, // Increased from 0.2MB to retain texture details
      maxWidthOrHeight: 1200, // Increased from 800px to maintain high res center crop
      useWebWorker: true,
    });
  };

  const createSignal = () => {
    controllerRef.current = new AbortController();
    return controllerRef.current.signal;
  };

  const cancel = () => {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
  };

  return { prepareImage, createSignal, cancel };
}
