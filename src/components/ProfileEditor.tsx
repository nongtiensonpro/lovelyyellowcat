import React, { useState, useRef } from "react";

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string;
  bio: string | null;
  banner_url: string | null;
  social_links: {
    instagram?: string;
    twitter?: string;
    artstation?: string;
  } | null;
}

interface ProfileEditorProps {
  profile: Profile;
}

export const ProfileEditor: React.FC<ProfileEditorProps> = ({ profile }) => {
  const [bio, setBio] = useState(profile.bio || "");
  const [bannerUrl, setBannerUrl] = useState(profile.banner_url || "");
  const [instagram, setInstagram] = useState(profile.social_links?.instagram || "");
  const [twitter, setTwitter] = useState(profile.social_links?.twitter || "");
  const [artstation, setArtstation] = useState(profile.social_links?.artstation || "");

  // Trạng thái tải lên
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  // Trạng thái gửi
  const [isSaving, setIsSaving] = useState(false);

  // Trạng thái thông báo kiểu Win95
  const [alertBox, setAlertBox] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Xử lý upload ảnh bìa (Banner) lên Cloudinary
  const handleBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(20);
    setLocalPreview(URL.createObjectURL(file));

    const cloudName = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      setAlertBox({
        show: true,
        title: "SYSTEM_ERROR.ERR",
        message: "Không tìm thấy cấu hình lưu trữ Cloudinary trong hệ thống.",
        type: "error"
      });
      setIsUploading(false);
      setLocalPreview(null);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    try {
      setUploadProgress(50);
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      setUploadProgress(80);
      if (!response.ok) {
        throw new Error("Giao thức Cloudinary trả về lỗi truyền tải.");
      }

      const responseData = await response.json();
      setBannerUrl(responseData.secure_url);
      setUploadProgress(100);
      
      setAlertBox({
        show: true,
        title: "EXPLORER.EXE",
        message: "Tải lên ảnh bìa (Banner) thành công! Hãy nhấn nút Lưu để lưu lại cấu hình.",
        type: "success"
      });
    } catch (err: any) {
      console.error(err);
      setAlertBox({
        show: true,
        title: "UPLOAD_FAILURE.ERR",
        message: "Gặp sự cố khi truyền tải ảnh bìa lên Cloudinary: " + err.message,
        type: "error"
      });
      setLocalPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  // Xử lý lưu hồ sơ cá nhân
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio: bio.trim(),
          banner_url: bannerUrl.trim(),
          social_links: {
            instagram: instagram.trim(),
            twitter: twitter.trim(),
            artstation: artstation.trim()
          }
        })
      });

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.error || "Gặp sự cố khi lưu hồ sơ.");
      }

      setAlertBox({
        show: true,
        title: "SYSTEM_SAVE.EXE",
        message: "Hồ sơ cá nhân của bạn đã được cập nhật thành công!",
        type: "success"
      });
    } catch (err: any) {
      console.error(err);
      setAlertBox({
        show: true,
        title: "SAVE_ERROR.ERR",
        message: err.message || "Không thể cập nhật hồ sơ cá nhân.",
        type: "error"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative max-w-2xl mx-auto my-6 font-retro text-black select-none">
      {/* 3D Properties Window */}
      <div className="win95-container w-full bg-win-gray flex flex-col">
        <div className="win95-header">
          <span>USER_PROPERTIES.CPL - {profile.full_name}</span>
          <a href={`/profile/${profile.id}`} className="win95-btn py-0 px-1.5 no-underline text-black hover:bg-red-700 hover:text-white">
            X
          </a>
        </div>

        {/* Tab Strip Simulation */}
        <div className="px-2 pt-2 bg-win-gray flex border-b border-win-dark/30 gap-0.5">
          <div className="px-4 py-1.5 bg-[#d4d4d4] border-t-2 border-l-2 border-r-2 border-white rounded-t-sm font-bold text-xs shadow-[-1px_-1px_0px_#808080_inset]">
            📁 Hồ Sơ Cá Nhân
          </div>
          <div className="px-4 py-1.5 bg-[#b8b8b8] text-black/60 border-t-2 border-l-2 border-r-2 border-win-dark/30 rounded-t-sm text-xs cursor-not-allowed">
            🔒 Bảo Mật
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-4 bg-win-gray flex-1 space-y-5">
          
          {/* Avatar and Name display info */}
          <div className="flex items-center gap-4 p-3 border border-win-dark/45 bg-[#d4d4d4] shadow-sm">
            <img 
              src={profile.avatar_url} 
              alt={profile.full_name} 
              className="w-12 h-12 border-2 border-win-dark filter saturate-150 contrast-110" 
            />
            <div>
              <h3 className="font-bold text-sm tracking-wide">{profile.full_name}</h3>
              <p className="text-[10px] text-win-dark uppercase tracking-wider font-mono">Tài khoản liên kết Google</p>
            </div>
          </div>

          {/* Section: Banner Image */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wide">
              🖼️ Ảnh Bìa Trang Cá Nhân (Banner)
            </label>
            
            {/* Banner Preview Box */}
            <div className="w-full h-32 border-2 border-win-dark bg-black relative flex items-center justify-center overflow-hidden">
              {localPreview || bannerUrl ? (
                <img 
                  src={localPreview || bannerUrl} 
                  alt="Banner preview" 
                  className="w-full h-full object-cover filter saturate-125 contrast-110 brightness-95" 
                />
              ) : (
                <div className="text-center text-vapor-blue p-2">
                  <span className="block text-4xl mb-1">📼</span>
                  <p className="text-[9px] tracking-widest uppercase">CHƯA CÓ BANNER HỒ SƠ</p>
                  <p className="text-[8px] text-win-dark">Khuyên dùng tỷ lệ 16:9 hoặc ảnh ngang rộng</p>
                </div>
              )}

              {isUploading && (
                <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-4">
                  <span className="text-vapor-green text-[10px] font-bold mb-2 tracking-widest animate-pulse">
                    ĐANG TẢI BANNER LÊN CLOUDINARY... ({uploadProgress}%)
                  </span>
                  <div className="w-2/3 bg-win-dark border border-white h-4 p-0.5">
                    <div 
                      className="bg-gradient-to-r from-vapor-pink via-vapor-purple to-vapor-blue h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <input 
                type="text" 
                className="flex-1 p-1.5 border border-win-dark bg-white outline-none text-xs shadow-inner font-mono text-black"
                placeholder="https://res.cloudinary.com/... hoặc chọn tải lên"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
              />
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleBannerUpload} 
                accept="image/*" 
                className="hidden" 
                disabled={isUploading}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="win95-btn px-4 font-bold text-xs py-1.5"
              >
                📁 Tải Ảnh Lên
              </button>
            </div>
          </div>

          {/* Section: Biography */}
          <div className="flex flex-col">
            <label className="text-xs font-bold mb-1 uppercase tracking-wide">
              📝 Tiểu Sử Nghệ Sĩ (Bio)
            </label>
            <textarea
              rows={4}
              maxLength={400}
              className="p-2 border border-win-dark bg-white outline-none text-xs text-black shadow-inner leading-relaxed"
              placeholder="Chia sẻ phong cách, nguồn cảm hứng nghệ thuật hoài cổ Vaporwave hoặc giới thiệu bản thân bạn..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
            <span className="text-[8px] text-win-dark text-right mt-1 font-mono">
              Tối đa 400 ký tự. Sử dụng ngôn từ văn minh.
            </span>
          </div>

          {/* Section: Social Links */}
          <div className="border border-win-dark p-3 bg-[#d4d4d4] space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-vapor-purple border-b border-win-dark pb-1.5">
              🔗 Liên Kết Mạng Xã Hội
            </div>
            
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="flex flex-col">
                <label className="text-[10px] font-bold mb-1 uppercase">📸 Instagram</label>
                <input
                  type="text"
                  className="p-1.5 border border-win-dark bg-white outline-none text-xs text-black shadow-inner font-mono"
                  placeholder="Username"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                />
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] font-bold mb-1 uppercase">🐦 Twitter (X)</label>
                <input
                  type="text"
                  className="p-1.5 border border-win-dark bg-white outline-none text-xs text-black shadow-inner font-mono"
                  placeholder="Username"
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                />
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] font-bold mb-1 uppercase">🎨 Artstation</label>
                <input
                  type="text"
                  className="p-1.5 border border-win-dark bg-white outline-none text-xs text-black shadow-inner font-mono"
                  placeholder="Username"
                  value={artstation}
                  onChange={(e) => setArtstation(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Buttons Navigation */}
          <div className="flex justify-between items-center pt-3 border-t border-white">
            <a 
              href={`/profile/${profile.id}`} 
              className="win95-btn no-underline text-black font-bold px-4 py-2 flex items-center text-xs"
            >
              &lt;&lt; Trang Cá Nhân
            </a>

            <div className="flex gap-2">
              <a 
                href="/" 
                className="win95-btn no-underline text-black px-4 py-2 text-xs"
              >
                Hủy Bỏ
              </a>
              <button
                type="submit"
                disabled={isSaving || isUploading}
                className="win95-btn font-bold px-6 py-2 text-xs text-vapor-purple"
              >
                {isSaving ? "Đang lưu..." : "💾 Lưu Thay Đổi"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Retro Windows 95 Message Box Dialog Alert overlay */}
      {alertBox && alertBox.show && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]">
          <div className="win95-container w-80 bg-win-gray text-black shadow-2xl">
            {/* Alert Header */}
            <div className="win95-header">
              <span>{alertBox.title}</span>
              <button 
                type="button" 
                onClick={() => {
                  setAlertBox(null);
                  if (alertBox.type === "success") {
                    window.location.href = `/profile/${profile.id}`;
                  }
                }}
                className="win95-btn py-0 px-1"
              >
                X
              </button>
            </div>
            {/* Alert Body */}
            <div className="p-4 bg-win-gray space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-3xl filter drop-shadow">
                  {alertBox.type === "success" ? "💾" : alertBox.type === "error" ? "⚠️" : "ℹ️"}
                </span>
                <p className="text-xs font-bold leading-normal pt-1">
                  {alertBox.message}
                </p>
              </div>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAlertBox(null);
                    if (alertBox.type === "success") {
                      window.location.href = `/profile/${profile.id}`;
                    }
                  }}
                  className="win95-btn font-bold px-6 py-1.5 text-xs inline-block"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
