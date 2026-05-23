import React, { useEffect, useState, useRef } from "react";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";

const supabaseClient = getSupabaseBrowserClient();

interface Comment {
  id: string;
  article_id: string;
  content: string;
  created_at: string;
  parent_id?: string | null;
  depth?: number;
  profiles: {
    id?: string;
    full_name: string;
    avatar_url: string;
  };
}

interface RealtimeCommentsProps {
  articleId: string;
  initialComments: Comment[];
  currentUser: {
    id: string;
    full_name: string;
    avatar_url: string;
  } | null;
}

export const RealtimeComments: React.FC<RealtimeCommentsProps> = ({
  articleId,
  initialComments,
  currentUser
}) => {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [mainInputText, setMainInputText] = useState("");
  const [replyInputText, setReplyInputText] = useState("");
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Tải lại toàn bộ cây bình luận thông qua hàm đệ quy PostgreSQL RPC (đọc công khai, không cần xác thực)
  const fetchCommentTree = async () => {
    const { data, error } = await supabaseClient.rpc("get_comment_tree", {
      p_article_id: articleId
    });

    if (!error && data) {
      const formattedComments: Comment[] = data.map((c: any) => ({
        id: c.id,
        article_id: c.article_id,
        content: c.content,
        created_at: c.created_at,
        parent_id: c.parent_id,
        depth: c.depth,
        profiles: {
          id: c.profile_id,
          full_name: c.full_name,
          avatar_url: c.avatar_url
        }
      }));
      setComments(formattedComments);
    } else if (error) {
      console.error("Lỗi khi fetch comments từ RPC:", error.message);
    }
  };

  useEffect(() => {
    fetchCommentTree();

    // Lắng nghe realtime từ Supabase khi có bình luận mới (đọc công khai)
    const channel = supabaseClient
      .channel(`comments-realtime-${articleId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `article_id=eq.${articleId}`
        },
        () => {
          // Bất kỳ sự thay đổi (INSERT, DELETE) nào cũng đồng bộ lại toàn bộ cây
          fetchCommentTree();
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [articleId]);

  // Gửi bình luận qua API route phía server (xác thực bằng cookie httpOnly)
  const postComment = async (content: string, parentId: string | null, depth: number) => {
    setErrorMessage(null);
    setIsSending(true);

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          article_id: articleId,
          content: content.trim(),
          parent_id: parentId,
          depth: depth
        })
      });

      const result = await response.json();

      if (!response.ok) {
        const msg = result.error || `Lỗi HTTP ${response.status}`;
        setErrorMessage(`Không thể gửi bình luận: ${msg}`);
        return false;
      }

      return true;
    } catch (err: any) {
      console.error("Lỗi mạng gửi bình luận:", err);
      setErrorMessage(`Sự cố kết nối mạng: ${err.message || err}`);
      return false;
    } finally {
      setIsSending(false);
    }
  };

  // Gửi bình luận cấp gốc (cấp 0)
  const postMainComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!mainInputText.trim() || !currentUser || isSending) return;

    const success = await postComment(mainInputText, null, 0);
    if (success) {
      setMainInputText("");
      fetchCommentTree(); // Tải lại ngay lập tức
    }
  };

  // Gửi phản hồi bình luận lồng nhau
  const postReplyComment = async (parentComment: Comment) => {
    if (!replyInputText.trim() || !currentUser || isSending) return;

    const nextDepth = (parentComment.depth ?? 0) + 1;
    if (nextDepth > 3) {
      setErrorMessage("Hệ thống chỉ hỗ trợ lồng bình luận tối đa 3 cấp.");
      return;
    }

    const success = await postComment(replyInputText, parentComment.id, nextDepth);
    if (success) {
      setReplyInputText("");
      setActiveReplyId(null);
      fetchCommentTree(); // Tải lại ngay lập tức
    }
  };

  // Phân tách cây bình luận cấp 0 làm gốc
  const rootComments = comments.filter((c) => !c.parent_id);

  // Lấy danh sách con của bình luận đệ quy
  const getRepliesFor = (parentId: string) => {
    return comments.filter((c) => c.parent_id === parentId);
  };

  // Đệ quy render các bình luận lồng nhau
  const renderCommentNode = (comment: Comment) => {
    const replies = getRepliesFor(comment.id);
    let depthClass = "";
    if (comment.depth === 1) {
      depthClass = "ml-4 sm:ml-6 border-l border-dashed border-win-dark/50 pl-2 sm:pl-3";
    } else if (comment.depth === 2) {
      depthClass = "ml-8 sm:ml-12 border-l border-dashed border-win-dark/50 pl-2 sm:pl-3";
    } else if (comment.depth === 3) {
      depthClass = "ml-12 sm:ml-16 border-l border-dashed border-win-dark/50 pl-2 sm:pl-3";
    }

    const profile = comment.profiles || { id: undefined, full_name: "Ẩn danh", avatar_url: "/images/default-avatar.png" };

    return (
      <div key={comment.id} className={`space-y-2 mt-3 ${depthClass}`}>
        <div className="p-2.5 border border-win-dark bg-white shadow-sm flex gap-3 items-start">
          {profile.id ? (
            <a href={`/profile/${profile.id}`} className="block select-none cursor-pointer">
              <img
                src={profile.avatar_url || "/images/default-avatar.png"}
                alt={profile.full_name}
                className="w-7 h-7 border border-win-dark object-cover filter saturate-150 contrast-110 hover:brightness-110"
              />
            </a>
          ) : (
            <img
              src={profile.avatar_url || "/images/default-avatar.png"}
              alt={profile.full_name}
              className="w-7 h-7 border border-win-dark object-cover filter saturate-150 contrast-110"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-1 text-[9px] text-vapor-purple font-bold">
              <span className="truncate">
                {profile.id ? (
                  <a href={`/profile/${profile.id}`} className="hover:underline text-vapor-purple no-underline">
                    {profile.full_name}
                  </a>
                ) : (
                  profile.full_name
                )}
              </span>
              <span className="text-win-dark font-normal">
                {new Date(comment.created_at).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            
            <p className="text-black bg-[#f9f9f9] p-1.5 border border-win-dark/10 leading-relaxed break-words">
              {comment.content}
            </p>

            {/* Các nút Tác vụ */}
            <div className="mt-1.5 flex gap-3 text-[9px] font-bold">
              {currentUser && (comment.depth ?? 0) < 3 && (
                <button
                  onClick={() => {
                    setActiveReplyId(activeReplyId === comment.id ? null : comment.id);
                    setReplyInputText("");
                  }}
                  className="text-blue-800 hover:underline cursor-pointer"
                >
                  [ 💬 PHẢN HỒI ]
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Khung nhập phản hồi (Chỉ hiện khi nhấn Phản hồi) */}
        {activeReplyId === comment.id && currentUser && (
          <div className="p-2 bg-win-gray border border-win-dark flex gap-2 ml-4">
            <input
              type="text"
              className="flex-1 p-1.5 border border-win-dark bg-white outline-none text-[10px] text-black shadow-inner"
              placeholder={`Trả lời ${profile.full_name}...`}
              value={replyInputText}
              onChange={(e) => setReplyInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") postReplyComment(comment);
              }}
            />
            <button
              onClick={() => postReplyComment(comment)}
              disabled={isSending}
              className="win95-btn font-bold px-3 py-1 text-[10px]"
            >
              {isSending ? "..." : "GỬI"}
            </button>
          </div>
        )}

        {/* Đệ quy tiếp tục hiển thị replies */}
        {replies.length > 0 && (
          <div className="space-y-1">
            {replies.map((child) => renderCommentNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="win95-container w-full font-retro text-xs text-black">
      {/* Header */}
      <div className="win95-header">
        <span>AESTHETIC_CHAT.EXE</span>
        <span className="text-[10px] tracking-widest text-vapor-green animate-pulse">● NESTED THREAD</span>
      </div>

      {/* Alert Error Box Win95 */}
      {errorMessage && (
        <div className="bg-[#ffccd5] border-b border-win-dark p-2 text-red-900 text-[10px] font-bold flex items-center justify-between shadow-sm">
          <span className="flex items-center gap-1.5">
            <span>⚠️</span>
            <span>SYSTEM_ALERT.ERR: {errorMessage}</span>
          </span>
          <button 
            type="button" 
            onClick={() => setErrorMessage(null)} 
            className="win95-btn px-2 py-0.5 text-[8px] font-bold uppercase shrink-0 ml-2 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Danh sách bình luận */}
      <div className="p-3 bg-[#e6e6e6] space-y-3 h-80 overflow-y-auto border-b-2 border-win-dark shadow-inner">
        {rootComments.length === 0 ? (
          <div className="text-center text-win-dark py-12">
            <span className="text-2xl block mb-2">💾</span>
            <p>CHƯA CÓ DỮ LIỆU TRÒ CHUYỆN.</p>
          </div>
        ) : (
          rootComments.map((comment) => renderCommentNode(comment))
        )}
      </div>

      {/* Nhập bình luận cấp gốc */}
      {currentUser ? (
        <form onSubmit={postMainComment} className="p-3 bg-win-gray flex gap-2">
          <input
            type="text"
            className="flex-1 p-2 border border-win-dark bg-white outline-none font-retro text-xs text-black shadow-inner focus:border-vapor-pink"
            placeholder="Gõ suy nghĩ nghệ thuật của bạn tại đây..."
            value={mainInputText}
            onChange={(e) => setMainInputText(e.target.value)}
          />
          <button type="submit" disabled={isSending} className="win95-btn font-bold px-6">
            {isSending ? "..." : "GỬI"}
          </button>
        </form>
      ) : (
        <div className="p-3 bg-[#d4d4d4] text-center border-t border-white text-win-dark font-bold">
          🔒 VUI LÒNG ĐĂNG NHẬP QUA GOOGLE ĐỂ BÌNH LUẬN BÀI VIẾT.
        </div>
      )}
    </div>
  );
};
