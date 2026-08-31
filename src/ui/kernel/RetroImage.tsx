// RetroImage.tsx — ảnh theo policy (ADR-0003): srcset width descriptors, decoding async,
// lazy mặc định, fallback khi lỗi mà không làm vỡ layout (aspect-ratio token).
import React, { useState } from "react";

export interface RetroImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  /** Cloudinary: sinh srcset từ các width này (mặc định 400/800/1200/1600). */
  widths?: number[];
  /** Dự phòng aspect-ratio để tránh CLS (vd "16 / 9"). */
  aspect?: string;
  /** Nội dung thay thế khi lỗi (mặc định: error art Win95). */
  fallback?: React.ReactNode;
}

const isCloudinary = (src: string): boolean => /res\.cloudinary\.com|\/upload\//.test(src);

export function buildCloudinarySrcSet(src: string, widths: number[]): string {
  if (!isCloudinary(src)) return "";
  return widths
    .map((w) => {
      const parts = src.split("/upload/");
      if (parts.length !== 2) return null;
      return `${parts[0]}/upload/f_auto,q_auto,w_${w}/${parts[1]} ${w}w`;
    })
    .filter(Boolean)
    .join(", ");
}

export const RetroImage: React.FC<RetroImageProps> = ({
  src, alt, widths = [400, 800, 1200, 1600], aspect, fallback, className = "", loading = "lazy", ...rest
}) => {
  const [failed, setFailed] = useState(false);
  const srcSet = buildCloudinarySrcSet(src, widths);
  const sizes = rest.sizes ?? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 800px";

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={["retro-image-fallback bg-cosmic-mid border-2 border-win-dark flex items-center justify-center overflow-hidden", className].join(" ")}
        style={aspect ? { aspectRatio: aspect } : undefined}
      >
        {fallback ?? (
          <span className="font-retro text-[10px] text-text-secondary p-2 text-center">
            \u26A0\uFE0F Ảnh không tải được
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      srcSet={srcSet || undefined}
      sizes={srcSet ? sizes : undefined}
      loading={loading}
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
      style={aspect ? { aspectRatio: aspect } : undefined}
      {...rest}
    />
  );
};
