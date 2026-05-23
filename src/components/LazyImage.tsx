import React, { useState, useEffect, useRef } from "react";

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: string | number;
  height?: string | number;
  style?: React.CSSProperties;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = "",
  width,
  height,
  style
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Reset state khi URL thay đổi
    setIsLoaded(false);
    setHasError(false);

    // Kiểm tra xem ảnh đã được nạp từ bộ nhớ đệm (cache) chưa
    if (imgRef.current && imgRef.current.complete) {
      setIsLoaded(true);
    }
  }, [src]);

  const handleImageLoad = () => {
    setIsLoaded(true);
  };

  const handleImageError = () => {
    setHasError(true);
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0d001f] flex items-center justify-center min-h-[inherit] max-h-[inherit]">
      {/* 1. Vaporwave CRT-Style Scanning Placeholder */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d001f] select-none z-10 pointer-events-none">
          {/* Animated Neon cassette icon */}
          <span className="text-3xl animate-bounce mb-1">📼</span>
          <span className="text-[9px] text-[#ff71ce] font-retro tracking-[0.2em] animate-pulse">AESTHETIC_LOAD.EXE</span>
          
          {/* Windows 95 Progress Bar inside image placeholder */}
          <div className="w-24 h-2 bg-win-dark border border-white p-0.5 mt-2.5">
            <div className="h-full bg-gradient-to-r from-vapor-blue to-vapor-pink w-1/2 animate-[pulse_1s_infinite]" />
          </div>
          
          {/* CRT lines filter overlay */}
          <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.3)_50%)] bg-[length:100%_4px]" />
        </div>
      )}

      {/* Fallback when image fails to load */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-win-gray p-4 select-none z-10 text-center font-retro text-[10px] text-win-dark">
          <span className="text-2xl mb-1">⚠️</span>
          <span className="font-bold text-red-800 uppercase">LOAD_ERROR.SYS</span>
          <p className="mt-1">Không thể tải tài nguyên ảnh.</p>
        </div>
      )}

      {/* 2. Actual Image with high-end aesthetic transition */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={handleImageLoad}
        onError={handleImageError}
        className={`${className} transition-all duration-700 ease-out ${
          isLoaded 
            ? "opacity-100 blur-0 scale-100 filter saturate-[1.1] contrast-[1.03]" 
            : "opacity-0 blur-xl scale-95 filter saturate-[1.8] contrast-[1.5] hue-rotate-15"
        }`}
        width={width}
        height={height}
        style={style}
      />

      {/* Subtle retro scanline overlay shown only when fully loaded */}
      {isLoaded && (
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.2)_50%)] bg-[length:100%_4px] pointer-events-none z-[5]" />
      )}
    </div>
  );
};
