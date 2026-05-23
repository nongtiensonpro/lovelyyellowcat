import React, { useState, useEffect, useRef } from "react";

interface SubmissionWizardProps {
  currentUser: {
    id: string;
    full_name: string;
    avatar_url: string;
  } | null;
}

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
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<HTMLDivElement>(null);

  // Quản lý hiển thị Google reCAPTCHA v2 (Dark Theme)
  useEffect(() => {
    if (step !== 1 || !recaptchaRef.current) return;

    let widgetId: any = null;

    const renderRecaptcha = () => {
      // @ts-ignore
      if (window.grecaptcha && window.grecaptcha.render) {
        try {
          // @ts-ignore
          widgetId = window.grecaptcha.render(recaptchaRef.current, {
            sitekey: import.meta.env.PUBLIC_RECAPTCHA_SITEKEY,
            theme: "dark",
            callback: (token: string) => {
              setRecaptchaToken(token);
            },
            "expired-callback": () => {
              setRecaptchaToken(null);
            },
            "error-callback": () => {
              setRecaptchaToken(null);
            }
          });
        } catch (err) {
          console.error("Lỗi khởi tạo reCAPTCHA:", err);
        }
      } else {
        setTimeout(renderRecaptcha, 250);
      }
    };

    const timeout = setTimeout(renderRecaptcha, 150);

    return () => {
      clearTimeout(timeout);
      // @ts-ignore
      if (widgetId !== null && window.grecaptcha && window.grecaptcha.reset) {
        try {
          // @ts-ignore
          window.grecaptcha.reset(widgetId);
        } catch (e) {}
      }
    };
  }, [step]);

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

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          image_url: imageUrl,
          image_pid: imagePid,
          recaptcha_token: recaptchaToken
        })
      });

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.error || "Gặp sự cố khi gửi tác phẩm.");
      }

      setStep(3); // Bước hoàn thành
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
    setMessage(null);
    setRecaptchaToken(null);
  };

  if (!currentUser) {
    return (
      <div className="win95-container font-retro text-black max-w-md mx-auto my-12 bg-win-gray">
        <div className="win95-header">
          <span>ACCESS_DENIED.SYS</span>
          <button className="win95-btn py-0 px-1">X</button>
        </div>
        <div className="p-6 text-center bg-[#c0c0c0]">
          <span className="text-4xl block mb-3">🔒</span>
          <p className="font-bold uppercase text-xs mb-2">HỆ THỐNG YÊU CẦU ĐĂNG NHẬP</p>
          <p className="text-[10px] text-black/75 mb-6 leading-normal">
            Bạn cần đăng nhập bằng tài khoản Google để có thể mở khóa tính năng tải lên tác phẩm nghệ thuật Vaporwave của riêng bạn.
          </p>
          <a href="/api/auth/signin" className="win95-btn no-underline inline-block px-6 py-2 font-bold uppercase text-xs">
            🔑 ĐĂNG NHẬP BẰNG GOOGLE
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="win95-container font-retro text-black max-w-xl mx-auto my-12 bg-win-gray flex flex-col">
      {/* Wizard Header */}
      <div className="win95-header">
        <span>VAPORWAVE_ART_WIZARD.EXE</span>
        <span className="text-[10px] text-vapor-pink">BƯỚC {step}/3</span>
      </div>

      {/* Progress Graphic */}
      <div className="flex bg-[#808080] text-white text-[10px] font-bold p-1 gap-1 border-b border-win-dark">
        <div className={`flex-1 text-center py-1.5 border border-white ${step === 1 ? 'bg-vapor-pink text-black' : 'bg-transparent text-gray-300'}`}>
          1. CHỌN TRANH NGHỆ THUẬT
        </div>
        <div className={`flex-1 text-center py-1.5 border border-white ${step === 2 ? 'bg-vapor-blue text-black' : 'bg-transparent text-gray-300'}`}>
          2. THÔNG TIN & MÔ TẢ
        </div>
        <div className={`flex-1 text-center py-1.5 border border-white ${step === 3 ? 'bg-vapor-green text-black' : 'bg-transparent text-gray-300'}`}>
          3. DUYỆT LƯU TRỮ
        </div>
      </div>

      <div className="p-5 bg-win-gray flex-1 space-y-4">
        {message && step !== 3 && (
          <div className={`p-3 border-2 ${
            message.type === "success" 
              ? "bg-green-100 text-green-900 border-green-400" 
              : "bg-red-100 text-red-900 border-red-400"
          } text-xs`}>
            <strong>{message.type === "success" ? "💾" : "⚠️"} {message.text}</strong>
          </div>
        )}

        {/* BƯỚC 1: Chọn và upload ảnh */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-xs leading-normal">
              Chào mừng bạn đến với <strong>Cổng thông tin tranh cộng đồng</strong>! Hãy tải lên tranh vẽ, ảnh động 3D, hay thiết kế hoài cổ Vaporwave của bạn để hiển thị trên Phòng trưng bày công cộng sau khi được phê duyệt.
            </p>

            <div className="w-full min-h-60 border-2 border-win-dark bg-black relative flex items-center justify-center overflow-hidden">
              {localPreview ? (
                <img 
                  src={localPreview} 
                  alt="Preview" 
                  className="max-h-56 max-w-full object-contain filter saturate-150 contrast-125" 
                />
              ) : (
                <div className="text-center text-vapor-pink p-4 animate-pulse">
                  <span className="block text-5xl mb-2">🖼️</span>
                  <p className="text-xs tracking-widest text-vapor-blue">VUI LÒNG CHỌN TRANH CỦA BẠN</p>
                  <p className="text-[9px] text-win-dark mt-1">Hỗ trợ định dạng JPG, PNG, GIF</p>
                </div>
              )}

              {isUploading && (
                <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center">
                  <div className="text-vapor-green text-xs font-bold mb-2 tracking-widest animate-pulse">ĐANG TRUYỀN TẢI TRANH...</div>
                  <div className="w-2/3 bg-win-dark border border-white h-4 p-0.5">
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
              disabled={isUploading || !recaptchaToken}
            />

            {/* Widget Google reCAPTCHA v2 (Dark Theme) */}
            <div className="flex flex-col items-center justify-center p-3.5 bg-[#d4d4d4] border border-win-dark mb-4">
              <span className="text-[9px] text-win-dark font-bold uppercase mb-2">🔒 XÁC MINH DANH TÍNH BẢO MẬT:</span>
              <div ref={recaptchaRef}></div>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || !recaptchaToken}
              className="win95-btn w-full font-bold text-xs py-2"
            >
              {isUploading ? "ĐANG XỬ LÝ..." : "📁 TÌM FILE TÁC PHẨM"}
            </button>
          </div>
        )}

        {/* BƯỚC 2: Nhập thông tin */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-4 items-start">
              <img src={imageUrl!} className="w-28 h-28 object-cover border border-win-dark" />
              <div className="flex-1 space-y-3">
                <div className="flex flex-col">
                  <label className="text-xs font-bold mb-1 uppercase">Tiêu đề tác phẩm (*)</label>
                  <input
                    type="text"
                    required
                    className="p-2 border border-win-dark bg-white outline-none text-xs shadow-inner"
                    placeholder="VD: Cát-xét Trong Rừng Mưa Axít"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-xs font-bold mb-1 uppercase">Cảm hứng nghệ thuật (Mô tả)</label>
                  <textarea
                    rows={3}
                    className="p-2 border border-win-dark bg-white outline-none text-xs shadow-inner"
                    placeholder="Viết một đoạn ngắn giới thiệu cảm hứng đằng sau tác phẩm..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </form>
        )}

        {/* BƯỚC 3: Hoàn thành */}
        {step === 3 && (
          <div className="text-center space-y-4 py-6">
            <span className="text-5xl block animate-bounce">🌈</span>
            <h2 className="text-lg font-bold text-vapor-pink uppercase tracking-widest">
              GỬI TÁC PHẨM THÀNH CÔNG!
            </h2>
            <p className="text-xs text-black/85 leading-normal max-w-sm mx-auto">
              Tranh của bạn đã được đưa vào hàng đợi lưu trữ. Ban biên tập sẽ phê duyệt và đưa lên tạp chí nghệ thuật sớm nhất có thể.
            </p>
            <div className="p-3 bg-[#d4d4d4] border border-win-dark text-[10px] text-left max-w-sm mx-auto">
              💡 <strong>Phần thưởng:</strong> Khi tác phẩm được duyệt công khai, bạn sẽ lập tức nhận được <strong>+50 XP</strong> đóng góp để thăng cấp và nhận Huy hiệu hoài cổ!
            </div>
          </div>
        )}
      </div>

      {/* Wizard Footer Navigation */}
      <div className="p-3 bg-win-gray border-t border-white flex justify-between">
        {step === 1 && (
          <>
            <a href="/" className="win95-btn no-underline text-black font-bold px-4 py-1.5 flex items-center">
              &lt;&lt; Trang Chủ
            </a>
            <button
              type="button"
              disabled={!imageUrl || isUploading}
              onClick={() => setStep(2)}
              className="win95-btn font-bold px-6 py-1.5 flex items-center disabled:opacity-50"
            >
              Tiếp tục &gt;
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="win95-btn font-bold px-4 py-1.5 flex items-center"
            >
              &lt; Quay Lại
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !title.trim()}
              className="win95-btn font-bold px-6 py-1.5 flex items-center text-vapor-purple"
            >
              {isSubmitting ? "Đang gửi..." : "💾 Gửi Duyệt"}
            </button>
          </>
        )}

        {step === 3 && (
          <button
            type="button"
            onClick={handleReset}
            className="win95-btn font-bold w-full py-2"
          >
            ĐÓNG / GỬI THÊM BÀI KHÁC
          </button>
        )}
      </div>
    </div>
  );
};
