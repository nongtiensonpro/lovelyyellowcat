import { useState } from "react";

interface UserManagementActionsProps {
  userId: string;
  currentRole: "reader" | "editor" | "admin";
  isBanned: boolean;
  userName: string;
  currentAdminId: string;
}

export function UserManagementActions({
  userId,
  currentRole,
  isBanned,
  userName,
  currentAdminId,
}: UserManagementActionsProps) {
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(currentRole);
  const [banReason, setBanReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const isSelf = userId === currentAdminId;

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Đổi vai trò ──
  const handleRoleChange = async () => {
    if (selectedRole === currentRole) {
      showToast("Vai trò không thay đổi.", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin-users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, newRole: selectedRole }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message, "success");
        setTimeout(() => window.location.reload(), 1500);
      } else {
        showToast(data.error || "Có lỗi xảy ra.", "error");
      }
    } catch {
      showToast("Không thể kết nối server.", "error");
    }
    setLoading(false);
    setShowRoleModal(false);
  };

  // ── Ban / Unban ──
  const handleBanToggle = async () => {
    const action = isBanned ? "unban" : "ban";
    setLoading(true);
    try {
      const res = await fetch("/api/admin-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, reason: banReason }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message, "success");
        setTimeout(() => window.location.reload(), 1500);
      } else {
        showToast(data.error || "Có lỗi xảy ra.", "error");
      }
    } catch {
      showToast("Không thể kết nối server.", "error");
    }
    setLoading(false);
    setShowBanModal(false);
    setBanReason("");
  };

  return (
    <div style={{ position: "relative", display: "inline-flex", gap: "4px" }}>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            zIndex: 9999,
            padding: "12px 20px",
            background: toast.type === "success" ? "#0f5132" : "#842029",
            color: "#fff",
            fontFamily: "'VT323', 'Courier New', monospace",
            fontSize: "14px",
            fontWeight: "bold",
            border: `2px solid ${toast.type === "success" ? "#05ffa1" : "#f5c2c7"}`,
            boxShadow: `0 0 15px ${toast.type === "success" ? "rgba(5,255,161,0.4)" : "rgba(220,53,69,0.4)"}`,
            maxWidth: "400px",
            animation: "toast-slide-in 0.3s ease-out",
          }}
        >
          {toast.type === "success" ? "✅ " : "❌ "}{toast.message}
        </div>
      )}

      {/* Nút Đổi Vai Trò */}
      {!isSelf && (
        <button
          onClick={() => { setSelectedRole(currentRole); setShowRoleModal(true); }}
          disabled={loading}
          style={{
            background: "#c0c0c0",
            border: "2px outset #fff",
            borderColor: "#fff #808080 #808080 #fff",
            padding: "2px 8px",
            fontSize: "10px",
            fontWeight: "bold",
            fontFamily: "'VT323', 'Courier New', monospace",
            cursor: "pointer",
            color: "#000",
            whiteSpace: "nowrap",
          }}
          title="Đổi vai trò người dùng"
        >
          👑 Vai trò
        </button>
      )}

      {/* Nút Ban/Unban */}
      {!isSelf && currentRole !== "admin" && (
        <button
          onClick={() => setShowBanModal(true)}
          disabled={loading}
          style={{
            background: isBanned ? "#d4edda" : "#f8d7da",
            border: "2px outset #fff",
            borderColor: "#fff #808080 #808080 #fff",
            padding: "2px 8px",
            fontSize: "10px",
            fontWeight: "bold",
            fontFamily: "'VT323', 'Courier New', monospace",
            cursor: "pointer",
            color: isBanned ? "#0f5132" : "#842029",
            whiteSpace: "nowrap",
          }}
          title={isBanned ? "Gỡ cấm tài khoản" : "Cấm tài khoản"}
        >
          {isBanned ? "🔓 Gỡ cấm" : "🚫 Cấm"}
        </button>
      )}

      {/* Nút Xem Profile */}
      <a
        href={`/profile/${userId}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          background: "#c0c0c0",
          border: "2px outset #fff",
          borderColor: "#fff #808080 #808080 #fff",
          padding: "2px 8px",
          fontSize: "10px",
          fontWeight: "bold",
          fontFamily: "'VT323', 'Courier New', monospace",
          cursor: "pointer",
          color: "#000",
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
          whiteSpace: "nowrap",
        }}
        title="Xem hồ sơ"
      >
        📁 Hồ sơ
      </a>

      {/* ═══════════ MODAL: Đổi Vai Trò ═══════════ */}
      {showRoleModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 9990,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "modal-fade-in 0.2s ease-out",
          }}
          onClick={() => setShowRoleModal(false)}
        >
          <div
            style={{
              background: "#c0c0c0",
              border: "2px outset #fff",
              borderColor: "#fff #808080 #808080 #fff",
              width: "380px",
              maxWidth: "90vw",
              fontFamily: "'VT323', 'Courier New', monospace",
              boxShadow: "4px 4px 0 #000",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                background: "linear-gradient(90deg, #ff71ce, #b967ff)",
                padding: "4px 8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                color: "#fff",
                fontWeight: "bold",
                fontSize: "12px",
              }}
            >
              <span>👑 ROLE_EDITOR.EXE</span>
              <button
                onClick={() => setShowRoleModal(false)}
                style={{
                  background: "#c0c0c0",
                  border: "2px outset #fff",
                  borderColor: "#fff #808080 #808080 #fff",
                  padding: "0 6px",
                  fontWeight: "bold",
                  fontSize: "10px",
                  cursor: "pointer",
                  color: "#000",
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "16px" }}>
              <p style={{ fontSize: "12px", marginBottom: "12px", color: "#000", fontWeight: "bold" }}>
                Đổi vai trò cho: <span style={{ color: "#b967ff" }}>{userName}</span>
              </p>
              <p style={{ fontSize: "11px", marginBottom: "8px", color: "#555" }}>
                Vai trò hiện tại: <span style={{ fontWeight: "bold", textTransform: "uppercase" }}>{currentRole}</span>
              </p>

              <label style={{ fontSize: "11px", fontWeight: "bold", display: "block", marginBottom: "4px", color: "#000" }}>
                Chọn vai trò mới:
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as any)}
                style={{
                  width: "100%",
                  padding: "6px",
                  border: "2px inset #fff",
                  borderColor: "#808080 #fff #fff #808080",
                  background: "#fff",
                  fontFamily: "'VT323', 'Courier New', monospace",
                  fontSize: "13px",
                  marginBottom: "16px",
                }}
              >
                <option value="reader">👤 Reader — Người đọc thông thường</option>
                <option value="editor">✏️ Editor — Biên tập viên</option>
                <option value="admin">👑 Admin — Quản trị viên</option>
              </select>

              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setShowRoleModal(false)}
                  style={{
                    background: "#c0c0c0",
                    border: "2px outset #fff",
                    borderColor: "#fff #808080 #808080 #fff",
                    padding: "4px 16px",
                    fontSize: "11px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    fontFamily: "'VT323', 'Courier New', monospace",
                    color: "#000",
                  }}
                >
                  Hủy
                </button>
                <button
                  onClick={handleRoleChange}
                  disabled={loading || selectedRole === currentRole}
                  style={{
                    background: selectedRole === currentRole ? "#aaa" : "linear-gradient(135deg, #ff71ce, #b967ff)",
                    border: "2px outset #fff",
                    borderColor: "#fff #808080 #808080 #fff",
                    padding: "4px 16px",
                    fontSize: "11px",
                    fontWeight: "bold",
                    cursor: selectedRole === currentRole ? "not-allowed" : "pointer",
                    fontFamily: "'VT323', 'Courier New', monospace",
                    color: selectedRole === currentRole ? "#666" : "#fff",
                  }}
                >
                  {loading ? "Đang xử lý..." : "✅ Xác nhận"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ MODAL: Ban / Unban ═══════════ */}
      {showBanModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 9990,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "modal-fade-in 0.2s ease-out",
          }}
          onClick={() => setShowBanModal(false)}
        >
          <div
            style={{
              background: "#c0c0c0",
              border: "2px outset #fff",
              borderColor: "#fff #808080 #808080 #fff",
              width: "420px",
              maxWidth: "90vw",
              fontFamily: "'VT323', 'Courier New', monospace",
              boxShadow: "4px 4px 0 #000",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                background: isBanned
                  ? "linear-gradient(90deg, #198754, #20c997)"
                  : "linear-gradient(90deg, #dc3545, #e74c3c)",
                padding: "4px 8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                color: "#fff",
                fontWeight: "bold",
                fontSize: "12px",
              }}
            >
              <span>{isBanned ? "🔓 UNBAN_USER.EXE" : "🚫 BAN_USER.EXE"}</span>
              <button
                onClick={() => setShowBanModal(false)}
                style={{
                  background: "#c0c0c0",
                  border: "2px outset #fff",
                  borderColor: "#fff #808080 #808080 #fff",
                  padding: "0 6px",
                  fontWeight: "bold",
                  fontSize: "10px",
                  cursor: "pointer",
                  color: "#000",
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "16px" }}>
              {isBanned ? (
                <>
                  <p style={{ fontSize: "12px", marginBottom: "12px", color: "#000", fontWeight: "bold" }}>
                    Gỡ cấm tài khoản: <span style={{ color: "#198754" }}>{userName}</span>
                  </p>
                  <p style={{ fontSize: "11px", marginBottom: "16px", color: "#555" }}>
                    Người dùng này sẽ có thể đăng nhập và sử dụng website trở lại.
                  </p>
                </>
              ) : (
                <>
                  <p style={{ fontSize: "12px", marginBottom: "8px", color: "#000", fontWeight: "bold" }}>
                    ⚠️ Cấm tài khoản: <span style={{ color: "#dc3545" }}>{userName}</span>
                  </p>
                  <p style={{ fontSize: "11px", marginBottom: "12px", color: "#555" }}>
                    Người dùng bị cấm sẽ không thể đăng nhập hay sử dụng bất kỳ tính năng nào trên website.
                    Họ sẽ được thông báo liên hệ <strong>nongtiensonpro@gmail.com</strong> để khiếu nại.
                  </p>

                  <label style={{ fontSize: "11px", fontWeight: "bold", display: "block", marginBottom: "4px", color: "#000" }}>
                    Lý do cấm (tùy chọn):
                  </label>
                  <textarea
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder="VD: Vi phạm quy tắc cộng đồng, spam, nội dung không phù hợp..."
                    rows={3}
                    style={{
                      width: "100%",
                      padding: "6px",
                      border: "2px inset #fff",
                      borderColor: "#808080 #fff #fff #808080",
                      background: "#fff",
                      fontFamily: "'VT323', 'Courier New', monospace",
                      fontSize: "12px",
                      marginBottom: "16px",
                      resize: "vertical",
                    }}
                  />
                </>
              )}

              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => { setShowBanModal(false); setBanReason(""); }}
                  style={{
                    background: "#c0c0c0",
                    border: "2px outset #fff",
                    borderColor: "#fff #808080 #808080 #fff",
                    padding: "4px 16px",
                    fontSize: "11px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    fontFamily: "'VT323', 'Courier New', monospace",
                    color: "#000",
                  }}
                >
                  Hủy
                </button>
                <button
                  onClick={handleBanToggle}
                  disabled={loading}
                  style={{
                    background: isBanned
                      ? "linear-gradient(135deg, #198754, #20c997)"
                      : "linear-gradient(135deg, #dc3545, #e74c3c)",
                    border: "2px outset #fff",
                    borderColor: "#fff #808080 #808080 #fff",
                    padding: "4px 16px",
                    fontSize: "11px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    fontFamily: "'VT323', 'Courier New', monospace",
                    color: "#fff",
                  }}
                >
                  {loading ? "Đang xử lý..." : isBanned ? "✅ Gỡ cấm" : "🚫 Xác nhận cấm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Animation CSS - inject once */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes toast-slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes modal-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}} />
    </div>
  );
}
