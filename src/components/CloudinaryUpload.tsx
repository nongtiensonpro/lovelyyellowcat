import React, { useState, useRef } from "react";

interface CloudinaryUploadProps {
  onUploadSuccess?: (secureUrl: string) => void;
}

export const CloudinaryUpload: React.FC<CloudinaryUploadProps> = ({ onUploadSuccess }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setImageUrl(URL.createObjectURL(file));
    setUploadedUrl(null);
    setIsCopied(false);

    const cloudName = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Tải lên hình ảnh thất bại.");
      }

      const responseData = await response.json();
      setUploadedUrl(responseData.secure_url);
      if (onUploadSuccess) {
        onUploadSuccess(responseData.secure_url);
      }
    } catch (err) {
      console.error("Lỗi xảy ra trong quá trình upload ảnh:", err);
      alert("Đã xảy ra sự cố trong quá trình truyền tải tệp tin.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setImageUrl(null);
    setUploadedUrl(null);
    setIsCopied(false);
  };

  return (
    <div className="win95-container max-w-sm w-full font-retro">
      <div className="win95-header">
        <span>ART_ARCHIVE.EXE</span>
        <button className="win95-btn py-0 px-1" onClick={handleReset}>X</button>
      </div>
        
      <div className="p-4 bg-win-gray flex flex-col items-center">
        <div className="w-full min-h-40 border-2 border-win-dark bg-black mb-4 flex items-center justify-center relative overflow-hidden">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt="Preview artwork" 
              className="w-full h-full object-contain max-h-40 filter hue-rotate-15 contrast-125 brightness-110"
            />
          ) : (
            <div className="text-center text-vapor-pink p-2 animate-pulse">
              <span className="block text-4xl mb-1">🖼️</span>
              <p className="text-[10px] tracking-widest text-vapor-blue">WAITING FOR DATA...</p>
            </div>
          )}
            
          {isUploading && (
            <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center">
              <div className="text-vapor-green text-xs mb-2 tracking-widest animate-pulse">UPLOADING...</div>
              <div className="w-3/4 bg-win-dark border border-white h-4 p-0.5">
                <div className="bg-gradient-to-r from-vapor-pink via-vapor-purple to-vapor-blue h-full w-2/3 animate-[pulse_1s_infinite]"></div>
              </div>
            </div>
          )}
        </div>

        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleUpload}
          accept="image/*"
          className="hidden"
          disabled={isUploading}
        />

        <button 
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="win95-btn w-full text-xs py-2 tracking-wide font-bold mb-1"
        >
          {isUploading ? "ĐANG XỬ LÝ..." : "CHỌN TỆP TIN ẢNH"}
        </button>

        {uploadedUrl && (
          <div className="w-full mt-3 p-2 bg-[#d4d4d4] border border-win-dark text-black text-left">
            <div className="text-[10px] font-bold mb-1 uppercase tracking-wider text-vapor-purple flex items-center gap-1">
              ✦ TẢI ẢNH THÀNH CÔNG! ✦
            </div>
            <div className="flex gap-1">
              <input 
                type="text" 
                readOnly 
                value={uploadedUrl} 
                className="flex-1 p-1 bg-white text-black text-[9px] border border-win-dark outline-none font-mono"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button 
                type="button" 
                onClick={() => {
                  navigator.clipboard.writeText(uploadedUrl);
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 2000);
                }}
                className="win95-btn px-2 py-0 text-[10px] font-bold min-w-16"
              >
                {isCopied ? "ĐÃ LƯU" : "SAO CHÉP"}
              </button>
            </div>
            <p className="text-[8px] text-win-dark mt-1 leading-normal italic">
              * Bạn có thể sao chép liên kết này và dán vào phần bình luận bên dưới các bài viết nghệ thuật!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
