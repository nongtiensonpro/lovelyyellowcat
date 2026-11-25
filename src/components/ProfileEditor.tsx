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
    redirectUrl?: string | null;
  } | null>(null);

  // Trạng thái xóa tài khoản (Luật 91/2025/QH15)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const closeAlertBox = () => {
    if (!alertBox) return;
    const targetUrl = alertBox.redirectUrl;
    setAlertBox(null);
    if (targetUrl) {
      window.location.href = targetUrl;
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim() !== "XOA TAI KHOAN") {
      setDeleteError("Vui lòng nhập chính xác cụm từ 'XOA TAI KHOAN' để xác nhận.");
      return;
    }
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "XOA TAI KHOAN" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || "Không thể thực hiện xóa tài khoản.");
        setIsDeleting(false);
        return;
      }
      setShowDeleteModal(false);
      setAlertBox({
        show: true,
        title: "TÀI KHOẢN ĐÃ ĐƯỢC XÓA",
        message: "Toàn bộ dữ liệu cá nhân, tranh ảnh và lịch sử đã được xóa sạch. Cảm ơn bạn đã tham gia cùng LovelyYellowCat.",
        type: "info",
        redirectUrl: "/",
      });
    } catch {
      setDeleteError("Lỗi kết nối máy chủ khi xử lý yêu cầu xóa.");
      setIsDeleting(false);
    }
  };

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
        type: "error",
        redirectUrl: null
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
      setLocalPreview(responseData.secure_url);
      setUploadProgress(100);
      
      setAlertBox({
        show: true,
        title: "EXPLORER.EXE",
        message: "Tải lên ảnh bìa (Banner) thành công! Hãy nhấn nút \"💾 Lưu Thay Đổi\" ở dưới để hoàn tất lưu cấu hình.",
        type: "info",
        redirectUrl: null
      });
    } catch (err) {
      console.error(err);
      setAlertBox({
        show: true,
        title: "UPLOAD_FAILURE.ERR",
        message: "Gặp sự cố khi truyền tải ảnh bìa lên Cloudinary: " + (err instanceof Error ? err.message : String(err)),
        type: "error",
        redirectUrl: null
      });
      setLocalPreview(null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
        type: "success",
        redirectUrl: `/profile/${profile.id}`
      });
    } catch (err) {
      console.error(err);
      setAlertBox({
        show: true,
        title: "SAVE_ERROR.ERR",
        message: (err instanceof Error ? err.message : "") || "Không thể cập nhật hồ sơ cá nhân.",
        type: "error",
        redirectUrl: null
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
          <div className="px-4 py-1.5 bg-web-gray-mid border-t-2 border-l-2 border-r-2 border-white rounded-t-sm font-bold text-xs shadow-[-1px_-1px_0px_#808080_inset]">
            📁 Hồ Sơ Cá Nhân
          </div>
          <div className="px-4 py-1.5 bg-web-gray-shade text-black/60 border-t-2 border-l-2 border-r-2 border-win-dark/30 rounded-t-sm text-xs cursor-not-allowed">
            🔒 Bảo Mật
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-4 bg-win-gray flex-1 space-y-5">
          
          {/* Avatar and Name display info */}
          <div className="flex items-center gap-4 p-3 border border-win-dark/45 bg-web-gray-mid shadow-sm">
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
            <label htmlFor="pe-banner" className="block text-xs font-bold uppercase tracking-wide">
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
                  <p className="text-[10px] tracking-widest uppercase">CHƯA CÓ BANNER HỒ SƠ</p>
                  <p className="text-[10px] text-win-dark">Khuyên dùng tỷ lệ 16:9 hoặc ảnh ngang rộng</p>
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
                id="pe-banner"
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
            <label htmlFor="pe-bio" className="text-xs font-bold mb-1 uppercase tracking-wide">
              📝 Tiểu Sử Nghệ Sĩ (Bio)
            </label>
            <textarea
              rows={4}
              maxLength={400}
              id="pe-bio"
              className="p-2 border border-win-dark bg-white outline-none text-xs text-black shadow-inner leading-relaxed"
              placeholder="Chia sẻ phong cách, nguồn cảm hứng nghệ thuật hoài cổ Vaporwave hoặc giới thiệu bản thân bạn..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
            <span className="text-[10px] text-win-dark text-right mt-1 font-mono">
              Tối đa 400 ký tự. Sử dụng ngôn từ văn minh.
            </span>
          </div>

          {/* Section: Social Links */}
          <div className="border border-win-dark p-3 bg-web-gray-mid space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-vapor-purple border-b border-win-dark pb-1.5">
              🔗 Liên Kết Mạng Xã Hội
            </div>
            
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="flex flex-col">
                <label htmlFor="pe-instagram" className="text-[10px] font-bold mb-1 uppercase">📸 Instagram</label>
                <input
                  type="text"
                  id="pe-instagram"
                  className="p-1.5 border border-win-dark bg-white outline-none text-xs text-black shadow-inner font-mono"
                  placeholder="Username"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                />
              </div>

              <div className="flex flex-col">
                <label htmlFor="pe-twitter" className="text-[10px] font-bold mb-1 uppercase">🐦 Twitter (X)</label>
                <input
                  type="text"
                  id="pe-twitter"
                  className="p-1.5 border border-win-dark bg-white outline-none text-xs text-black shadow-inner font-mono"
                  placeholder="Username"
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                />
              </div>

              <div className="flex flex-col">
                <label htmlFor="pe-artstation" className="text-[10px] font-bold mb-1 uppercase">🎨 Artstation</label>
                <input
                  type="text"
                  id="pe-artstation"
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

      {/* Privacy & Data Rights Section (Tuân thủ Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15) */}
      <div className="win95-container bg-win-gray border border-win-dark p-4 mt-6 text-black shadow-sm">
        <div className="flex items-center gap-2 border-b border-win-dark pb-2 mb-3">
          <span className="text-base">🔒</span>
          <h3 className="font-bold text-xs uppercase text-black">
            Quyền dữ liệu cá nhân & Quản trị tài khoản (Luật 91/2025/QH15)
          </h3>
          <span className="ml-auto text-[10px] text-win-dark font-mono bg-white px-1.5 py-0.5 border border-win-dark">
            DATA RIGHTS
          </span>
        </div>

        <p className="text-[11px] text-win-dark leading-relaxed mb-4">
          Bạn có toàn quyền đối với dữ liệu cá nhân của mình: tải về bản sao lưu hoàn chỉnh (Data Export) hoặc yêu cầu xóa vĩnh viễn tài khoản và toàn bộ hình ảnh, bình luận, lịch sử hội thoại AI liên quan khỏi hệ thống.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/api/account/export"
            download
            className="win95-btn font-bold px-4 py-2 text-xs text-black no-underline flex items-center gap-1.5 hover:bg-vapor-green/30"
          >
            <span>📦</span> Xuất dữ liệu của tôi (.json)
          </a>

          <button
            type="button"
            onClick={() => {
              setDeleteConfirmText("");
              setDeleteError(null);
              setShowDeleteModal(true);
            }}
            className="win95-btn font-bold px-4 py-2 text-xs text-red-700 flex items-center gap-1.5 hover:bg-red-100"
          >
            <span>🗑️</span> Xóa tài khoản vĩnh viễn...
          </button>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 z-[9999]">
          <div className="win95-container w-full max-w-md bg-win-gray text-black shadow-2xl border-2 border-win-dark">
            <div className="win95-header bg-red-800 text-white flex justify-between items-center p-1.5">
              <span className="font-bold text-xs flex items-center gap-1.5">
                <span>⚠️</span> XÁC NHẬN XÓA TÀI KHOẢN VĨNH VIỄN
              </span>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="win95-btn py-0 px-1.5 text-[10px] font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3.5 bg-win-gray text-xs">
              <div className="bg-red-50 border-2 border-red-500 p-3 space-y-2 text-red-900">
                <p className="font-bold text-xs">HÀNH ĐỘNG NÀY KHÔNG THỂ HOÀN TÁC!</p>
                <ul className="list-disc pl-4 space-y-1 text-[11px] leading-tight">
                  <li>Toàn bộ thông tin hồ sơ và tác phẩm tranh sẽ bị xóa.</li>
                  <li>Mọi tệp ảnh của bạn trên Cloudinary CDN sẽ bị thanh lọc.</li>
                  <li>Lịch sử hội thoại AI (mã hóa E2EE) sẽ bị hủy bỏ vĩnh viễn.</li>
                  <li>Bình luận, lượt thích, huy hiệu và điểm XP sẽ bị xóa hoàn toàn.</li>
                </ul>
              </div>

              <div className="bg-vapor-yellow/20 border border-win-dark p-2.5 flex items-center justify-between gap-2">
                <span className="text-[11px] text-black leading-snug">
                  Nên tải bản sao lưu dữ liệu trước khi xóa:
                </span>
                <a
                  href="/api/account/export"
                  download
                  className="win95-btn px-2.5 py-1 text-[11px] font-bold text-black no-underline shrink-0 bg-white hover:bg-vapor-green/30"
                >
                  📦 Tải JSON
                </a>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="pe-delete-confirm" className="font-bold text-[11px] block text-black">
                  Để xác nhận, vui lòng nhập chính xác chữ: <code className="bg-black text-vapor-pink px-1.5 py-0.5">XOA TAI KHOAN</code>
                </label>
                <input
                  id="pe-delete-confirm"
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="XOA TAI KHOAN"
                  className="w-full p-2 border border-win-dark bg-white text-xs outline-none font-mono font-bold"
                />
              </div>

              {deleteError && (
                <p className="text-red-700 font-bold text-[11px] bg-red-100 p-2 border border-red-400">
                  ⚠️ {deleteError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-win-dark/30">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setShowDeleteModal(false)}
                  className="win95-btn px-4 py-1.5 text-xs font-bold"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  disabled={isDeleting || deleteConfirmText.trim() !== "XOA TAI KHOAN"}
                  onClick={handleDeleteAccount}
                  className="win95-btn px-4 py-1.5 text-xs font-bold bg-red-700 text-white hover:bg-red-800 disabled:opacity-50"
                >
                  {isDeleting ? "Đang xử lý xóa..." : "Xác nhận xóa vĩnh viễn"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Retro Windows 95 Message Box Dialog Alert overlay */}
      {alertBox && alertBox.show && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]">
          <div className="win95-container w-80 bg-win-gray text-black shadow-2xl">
            {/* Alert Header */}
            <div className="win95-header">
              <span>{alertBox.title}</span>
              <button 
                type="button" 
                onClick={closeAlertBox}
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
                  onClick={closeAlertBox}
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
