import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

interface Notification {
  id: string;
  type: "comment_reply" | "submission_approved" | "submission_rejected" | "badge_earned";
  payload: {
    message?: string;
    article_id?: string;
    comment_id?: string;
    sender_name?: string;
  };
  is_read: boolean;
  created_at: string;
}

interface NotificationBellProps {
  currentUser: {
    id: string;
  } | null;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ currentUser }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  
  const popoverRef = useRef<HTMLDivElement>(null);

  // Lấy các thông báo hiện có của người dùng
  const fetchNotifications = async () => {
    if (!currentUser) return;
    const { data, error } = await supabaseClient
      .from("notifications")
      .select("*")
      .eq("recipient", currentUser.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      setNotifications(data);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    fetchNotifications();

    // Kết nối Realtime lắng nghe thông báo mới được gửi riêng cho người dùng
    const channel = supabaseClient
      .channel(`notifications-realtime-${currentUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient=eq.${currentUser.id}`
        },
        (payload) => {
          // Thêm thông báo mới lên đầu danh sách
          setNotifications((prev) => [payload.new as Notification, ...prev]);
          
          // Phát âm thanh bip retro cổ điển (tuỳ chọn)
          try {
            const context = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = context.createOscillator();
            osc.type = "sine";
            osc.frequency.setValueAtTime(800, context.currentTime);
            osc.connect(context.destination);
            osc.start();
            osc.stop(context.currentTime + 0.1);
          } catch (e) {
            // Trình duyệt chặn audio-context cho đến khi tương tác, bỏ qua lỗi
          }
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [currentUser]);

  // Click ra ngoài để tự động đóng Popover thông báo
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  // Đánh dấu một thông báo đã đọc
  const markAsRead = async (id: string) => {
    const { error } = await supabaseClient
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    }
  };

  // Đánh dấu tất cả đã đọc
  const markAllAsRead = async () => {
    if (!currentUser) return;
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    const { error } = await supabaseClient
      .from("notifications")
      .update({ is_read: true })
      .eq("recipient", currentUser.id);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (!currentUser) return null;

  return (
    <div className="relative font-retro text-black" ref={popoverRef}>
      {/* Nút bấm Chuông */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="win95-btn flex items-center justify-center p-1.5 font-bold text-xs relative"
      >
        <span className="text-sm">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white font-mono text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Popover thông báo dạng Win95 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 win95-container bg-win-gray shadow-2xl z-[9999]">
          <div className="win95-header">
            <span>NOTIFICATION_CENTER.EXE</span>
            <button
              onClick={markAllAsRead}
              className="win95-btn text-[9px] font-bold py-0.2 px-1 text-black border border-white"
              title="Đánh dấu tất cả đã đọc"
            >
              Đọc tất cả
            </button>
          </div>

          <div className="p-1 bg-white border border-win-dark max-h-72 overflow-y-auto space-y-1">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-win-dark text-[10px]">
                <span className="text-2xl block mb-1">📼</span>
                HỘP THƯ RỖNG. CHƯA CÓ THÔNG BÁO.
              </div>
            ) : (
              notifications.map((notif) => {
                let messageText = "";
                let linkUrl = "";

                if (notif.type === "comment_reply") {
                  messageText = `✦ ${notif.payload.sender_name || "Thành viên"} đã phản hồi bình luận của bạn!`;
                  linkUrl = `/articles/${notif.payload.article_id}`;
                } else if (notif.type === "submission_approved") {
                  messageText = `🟢 ${notif.payload.message || "Tác phẩm nghệ thuật đã được phê duyệt!"}`;
                  linkUrl = `/submit`;
                } else if (notif.type === "submission_rejected") {
                  messageText = `🔴 ${notif.payload.message || "Tác phẩm chưa được phê duyệt."}`;
                  linkUrl = `/submit`;
                } else if (notif.type === "badge_earned") {
                  messageText = `👑 CHÚC MỪNG! Bạn vừa nhận được một Huy chương hoài cổ mới!`;
                  linkUrl = `/`;
                }

                return (
                  <div
                    key={notif.id}
                    className={`p-2 border border-dotted border-win-dark/30 hover:bg-vapor-pink/5 flex flex-col justify-between text-[10px] ${
                      !notif.is_read ? "bg-[#ff71ce]/10 font-bold border-l-2 border-l-vapor-pink" : "bg-white"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-1">
                      {linkUrl ? (
                        <a href={linkUrl} onClick={() => markAsRead(notif.id)} className="text-black no-underline hover:underline flex-1 leading-normal">
                          {messageText}
                        </a>
                      ) : (
                        <span className="text-black flex-1 leading-normal">{messageText}</span>
                      )}
                      {!notif.is_read && (
                        <button
                          onClick={() => markAsRead(notif.id)}
                          className="win95-btn text-[7px] py-0 px-1 font-bold shrink-0 self-start"
                          title="Đánh dấu đã đọc"
                        >
                          ✔
                        </button>
                      )}
                    </div>
                    <span className="text-[8px] text-win-dark mt-1 font-mono self-end">
                      {new Date(notif.created_at).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-1.5 bg-win-gray border-t border-white text-[8px] text-win-dark text-center font-retro">
            Hệ thống thông báo thời gian thực v1.0
          </div>
        </div>
      )}
    </div>
  );
};
