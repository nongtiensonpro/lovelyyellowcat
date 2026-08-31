import React, { useState, useRef } from "react";

declare global {
  interface Window {
    __RECAPTCHA_SITEKEY__?: string;
  }
}

interface SubmissionWizardProps {
  currentUser: {
    id: string;
    full_name: string;
    avatar_url: string;
  } | null;
}

const AVAILABLE_TAGS = [
  "vaporwave",
  "synthwave",
  "retro95",
  "cyberpunk",
  "vhs_glitch",
  "roman_statue",
  "citypop",
  "pixel_art"
];

export const SubmissionWizard: React.FC<SubmissionWizardProps> = ({ currentUser }) => {
  const [step, setStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Trạng thái ảnh
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePid, setImagePid] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  // Trạng thái biểu mẫu thông tin
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>(["vaporwave"]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      if (selectedTags.length > 1) {
        setSelectedTags(selectedTags.filter((t) => t !== tag));
      }
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // Lấy token reCAPTCHA v3
  const executeRecaptcha = async (action: string): Promise<string | null> => {
    return new Promise((resolve) => {
      // @ts-expect-error — type def thư viện chưa khớp runtime API này
      if (window.grecaptcha && window.grecaptcha.execute) {
        const sitekey = window.__RECAPTCHA_SITEKEY__ || import.meta.env.PUBLIC_RECAPTCHA_SITEKEY || "6Lfn8vgsAAAAANOYL9Am9tLGE1dQteNn_3rKm8g5";
        // @ts-expect-error — type def thư viện chưa khớp runtime API này
        window.grecaptcha.ready(() => {
          // @ts-expect-error — type def thư viện chưa khớp runtime API này
          window.grecaptcha.execute(sitekey, { action }).then((token: string) => {
            resolve(token);
          }).catch((err: any) => {
            console.error("Lỗi lấy token reCAPTCHA v3:", err);
            resolve(null);
          });
        });
      } else {
        console.warn("reCAPTCHA v3 chưa tải xong");
        resolve(null);
      }
    });
  };

  // Xử lý upload ảnh lên Cloudinary
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setLocalPreview(URL.createObjectURL(file));
    setImageUrl(null);
    setImagePid(null);
    setMessage(null);

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
        throw new Error("Không thể lưu trữ tệp tin ảnh.");
      }

      const responseData = await response.json();
      setImageUrl(responseData.secure_url);
      setImagePid(responseData.public_id);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Lỗi tải ảnh lên Cloudinary." });
      setLocalPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  // Xử lý gửi biểu mẫu tác phẩm
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !imageUrl || !imagePid) {
      setMessage({ type: "error", text: "Vui lòng hoàn thành tải ảnh và điền tiêu đề tác phẩm." });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    const token = await executeRecaptcha("submit_artwork");
    if (!token) {
      setMessage({ type: "error", text: "Hệ thống bảo vệ (reCAPTCHA) gặp sự cố, vui lòng thử lại." });
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          image_url: imageUrl,
          image_pid: imagePid,
          tags: selectedTags,
          recaptcha_token: token
        })
      });

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.error || "Gặp sự cố khi gửi tác phẩm.");
      }

      setStep(3);
      setMessage({ type: "success", text: "GỬI TÁC PHẨM THÀNH CÔNG!" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setImageUrl(null);
    setImagePid(null);
    setLocalPreview(null);
    setTitle("");
    setDescription("");
    setSelectedTags(["vaporwave"]);
    setMessage(null);
  };

  if (!currentUser) {
    return (
      <div className="win95-window max-w-md mx-auto my-12 font-retro text-black">
        <div className="win95-header py-1 px-2 bg-gradient-to-r from-red-800 to-red-600 text-white">
          <div className="flex items-center gap-1.5 font-bold text-xs">
            <span>🔒</span>
            <span>AUTH_REQUIRED.SYS</span>
          </div>
          <button className="win95-btn py-0 px-1 text-[10px] font-bold">✕</button>
        </div>
        <div className="p-6 text-center bg-win-gray space-y-4">
          <span className="text-5xl block">🔑</span>
          <h3 className="font-extrabold uppercase text-sm text-black">YÊU CẦU ĐĂNG NHẬP HỆ THỐNG</h3>
          <p className="text-xs text-black/80 leading-relaxed">
            Bạn cần đăng nhập bằng tài khoản Google để được cấp quyền đăng tải tác phẩm lên phòng triển lãm cộng đồng.
          </p>
          <a href="/api/auth/signin" className="win95-btn no-underline inline-block px-6 py-2.5 font-bold uppercase text-xs bg-white border-2 border-black" style={{ minHeight: "44px" }}>
            🔑 ĐĂNG NHẬP GOOGLE
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="win95-window max-w-2xl mx-auto my-6 font-retro text-black flex flex-col shadow-2xl">
      {/* Wizard Header */}
      <div className="win95-header py-1.5 px-3 bg-gradient-to-r from-win-titlebar to-vapor-blue-dark">
        <div className="flex items-center gap-2">
          <span>🎨</span>
          <span className="font-bold text-xs tracking-wide">INSTALLSHIELD_SETUP_WIZARD.EXE - [ĐĂNG TÁC PHẨM MỚI]</span>
        </div>
        <span className="font-mono text-[10px] bg-black text-vapor-green px-2 py-0.5">
          BƯỚC {step}/3
        </span>
      </div>

      {/* Setup Wizard Progress Steps */}
      <div className="flex bg-win-dark text-white text-[10px] font-bold p-1 gap-1 border-b border-win-dark">
        <div className={`flex-1 text-center py-1.5 border border-white ${step === 1 ? 'win95-sunken bg-vapor-pink text-black font-extrabold' : 'bg-transparent text-gray-300'}`}>
          1. CHỌN TỆP TRANH
        </div>
        <div className={`flex-1 text-center py-1.5 border border-white ${step === 2 ? 'win95-sunken bg-vapor-blue text-black font-extrabold' : 'bg-transparent text-gray-300'}`}>
          2. THÔNG TIN & THẺ
        </div>
        <div className={`flex-1 text-center py-1.5 border border-white ${step === 3 ? 'win95-sunken bg-vapor-green text-black font-extrabold' : 'bg-transparent text-gray-300'}`}>
          3. HOÀN THÀNH
        </div>
      </div>

      <div className="p-4 sm:p-6 bg-win-gray flex-1 space-y-4">
        {message && step !== 3 && (
          <div className={`p-3 border-2 ${
            message.type === "success" 
              ? "bg-green-100 text-green-900 border-green-400" 
              : "bg-red-100 text-red-900 border-red-400"
          } text-xs font-bold`}>
            {message.type === "success" ? "💾" : "⚠️"} {message.text}
          </div>
        )}

        {/* STEP 1: Upload Image */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-xs leading-relaxed text-black">
              Hãy chọn tệp hình ảnh kỹ thuật số mang phong cách <strong>Vaporwave, Retro 90s, Synthwave hoặc Cyberpunk</strong> của bạn để đưa vào hàng đợi giám định nghệ thuật.
            </p>

            <div className="w-full min-h-64 border-2 border-win-darkest bg-black relative flex items-center justify-center overflow-hidden shadow-inner">
              {localPreview ? (
                <img 
                  src={localPreview} 
                  alt="Preview" 
                  className="max-h-60 max-w-full object-contain filter saturate-125 contrast-105" 
                />
              ) : (
                <div className="text-center text-vapor-pink p-6 animate-pulse select-none">
                  <span className="block text-6xl mb-3">🖼️</span>
                  <p className="text-xs font-mono tracking-widest text-vapor-blue font-bold">CHƯA CÓ TỆP ẢNH NÀO ĐƯỢC CHỌN</p>
                  <p className="text-[10px] text-win-dark mt-1 font-mono">Định dạng hỗ trợ: JPG, PNG, WEBP, GIF (Tối đa 10MB)</p>
                </div>
              )}

              {isUploading && (
                <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center">
                  <div className="text-vapor-green text-xs font-bold mb-2 tracking-widest font-mono animate-pulse">
                    ĐANG TRUYỀN TẢI TRANH LÊN CLOUD...
                  </div>
                  <div className="w-3/4 bg-win-dark border border-white h-4 p-0.5">
                    <div className="bg-gradient-to-r from-vapor-pink via-vapor-purple to-vapor-blue h-full w-4/5 animate-[pulse_1s_infinite]"></div>
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
              className="win95-btn w-full font-bold text-xs py-2.5 bg-white border-2 border-black"
              style={{ minHeight: "44px" }}
            >
              {isUploading ? "⏳ ĐANG XỬ LÝ TỆP..." : "📁 CHỌN FILE TRANH TỪ MÁY TÍNH"}
            </button>
            
            <p className="text-[10px] text-center text-win-darkest font-mono">
              🛡️ Được bảo vệ và phân phối an toàn bởi Cloudinary CDN & Google reCAPTCHA
            </p>
          </div>
        )}

        {/* STEP 2: Metadata & Tags */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="w-full sm:w-36 h-36 bg-black border-2 border-black overflow-hidden shrink-0 shadow-md">
                <img src={imageUrl!} alt="Thumbnail" className="w-full h-full object-cover filter saturate-125" />
              </div>

              <div className="flex-1 space-y-3 w-full">
                <div className="flex flex-col">
                  <label htmlFor="sw-title" className="text-xs font-bold mb-1 uppercase text-black">Tiêu đề tác phẩm (*):</label>
                  <input
                    id="sw-title"
                    type="text"
                    required
                    className="p-2 border-2 border-win-darkest bg-white outline-none text-xs font-mono shadow-inner text-black"
                    placeholder="VD: Neon Dreams in Neo-Tokyo"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="flex flex-col">
                  <label htmlFor="sw-desc" className="text-xs font-bold mb-1 uppercase text-black">Cảm hứng nghệ thuật (Mô tả):</label>
                  <textarea
                    id="sw-desc"
                    rows={3}
                    className="p-2 border-2 border-win-darkest bg-white outline-none text-xs font-mono shadow-inner text-black"
                    placeholder="Chia sẻ một vài câu về cảm hứng hoặc kỹ thuật tạo tác phẩm..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Tags Selection */}
            <div className="border-t border-win-dark pt-3">
              <span className="text-xs font-bold mb-1.5 block uppercase text-black">🏷️ Gắn thẻ thể loại:</span>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`win95-btn px-2.5 py-1 text-[10px] font-mono font-bold uppercase ${
                      selectedTags.includes(tag) ? "win95-sunken bg-vapor-pink/30 text-black border border-black font-extrabold" : "bg-white"
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          </form>
        )}

        {/* STEP 3: Completion */}
        {step === 3 && (
          <div className="text-center space-y-4 py-8">
            <span className="text-6xl block animate-bounce">💾</span>
            <h2 className="text-lg font-extrabold text-vapor-purple uppercase tracking-wider">
              TÁC PHẨM ĐÃ ĐƯỢC GỬI THÀNH CÔNG!
            </h2>
            <p className="text-xs text-black leading-relaxed max-w-md mx-auto">
              Tranh của bạn đã được lưu vào hệ thống cơ sở dữ liệu. Ban quản trị sẽ thẩm định và xuất bản tác phẩm lên phòng triển lãm công cộng trong thời gian sớm nhất.
            </p>
            <div className="p-3 bg-white border-2 border-black text-[11px] text-left max-w-md mx-auto font-mono">
              💎 <strong>ĐẶC QUYỀN NGHỆ SĨ:</strong> Khi tác phẩm được duyệt công khai, hồ sơ của bạn sẽ tự động xuất hiện trên danh bạ nghệ sĩ <code>COMMUNITY_ARTISTS</code>!
            </div>
          </div>
        )}
      </div>

      {/* Wizard Footer Navigation */}
      <div className="p-3 bg-win-gray border-t-2 border-win-light flex justify-between items-center">
        {step === 1 && (
          <>
            <a href="/" className="win95-btn no-underline text-black font-bold px-4 py-1.5" style={{ minHeight: "36px" }}>
              &lt;&lt; Hủy Bỏ
            </a>
            <button
              type="button"
              disabled={!imageUrl || isUploading}
              onClick={() => setStep(2)}
              className="win95-btn font-bold px-6 py-1.5 text-black disabled:opacity-50"
              style={{ minHeight: "36px" }}
            >
              Tiếp Tục &gt;
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="win95-btn font-bold px-4 py-1.5"
              style={{ minHeight: "36px" }}
            >
              &lt; Quay Lại
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !title.trim()}
              className="win95-btn font-bold px-6 py-1.5 text-black bg-vapor-green/30 border-2 border-black"
              style={{ minHeight: "36px" }}
            >
              {isSubmitting ? "⏳ Đang Gửi..." : "💾 Hoàn Tất & Gửi Duyệt"}
            </button>
          </>
        )}

        {step === 3 && (
          <div className="flex gap-2 w-full">
            <a href="/gallery" className="win95-btn flex-1 text-center py-2 font-bold no-underline text-black" style={{ minHeight: "40px" }}>
              🖼️ Đến Phòng Triển Lãm
            </a>
            <button
              type="button"
              onClick={handleReset}
              className="win95-btn flex-1 py-2 font-bold text-black bg-white"
              style={{ minHeight: "40px" }}
            >
              🎨 Gửi Thêm Tranh Mới
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
