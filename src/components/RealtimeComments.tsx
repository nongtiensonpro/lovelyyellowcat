import React, { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

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

  // Tải lại toàn bộ cây bình luận thông qua hàm đệ quy PostgreSQL RPC
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

    // Lắng nghe realtime từ Supabase khi có bình luận mới
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

  // Gửi bình luận cấp gốc (cấp 0)
  const postMainComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!mainInputText.trim() || !currentUser) return;

    const { error } = await supabaseClient.from("comments").insert({
      article_id: articleId,
      profile_id: currentUser.id,
      content: mainInputText.trim(),
      parent_id: null,
      depth: 0
    });

    if (error) {
      console.error("Lỗi gửi bình luận chính:", error.message);
    } else {
      setMainInputText("");
    }
  };

  // Gửi phản hồi bình luận lồng nhau
  const postReplyComment = async (parentComment: Comment) => {
    if (!replyInputText.trim() || !currentUser) return;

    const nextDepth = (parentComment.depth ?? 0) + 1;
    if (nextDepth > 3) {
      alert("Hệ thống chỉ hỗ trợ lồng bình luận tối đa 3 cấp.");
      return;
    }

    const { error } = await supabaseClient.from("comments").insert({
      article_id: articleId,
      profile_id: currentUser.id,
      content: replyInputText.trim(),
      parent_id: parentComment.id,
      depth: nextDepth
    });

    if (error) {
      console.error("Lỗi gửi bình luận phản hồi:", error.message);
    } else {
      setReplyInputText("");
      setActiveReplyId(null);
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

    return (
      <div key={comment.id} className={`space-y-2 mt-3 ${depthClass}`}>
        <div className="p-2.5 border border-win-dark bg-white shadow-sm flex gap-3 items-start">
          {comment.profiles.id ? (
            <a href={`/profile/${comment.profiles.id}`} className="block select-none cursor-pointer">
              <img
                src={comment.profiles.avatar_url || "/images/default-avatar.png"}
                alt={comment.profiles.full_name}
                className="w-7 h-7 border border-win-dark object-cover filter saturate-150 contrast-110 hover:brightness-110"
              />
            </a>
          ) : (
            <img
              src={comment.profiles.avatar_url || "/images/default-avatar.png"}
              alt={comment.profiles.full_name}
              className="w-7 h-7 border border-win-dark object-cover filter saturate-150 contrast-110"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-1 text-[9px] text-vapor-purple font-bold">
              <span className="truncate">
                {comment.profiles.id ? (
                  <a href={`/profile/${comment.profiles.id}`} className="hover:underline text-vapor-purple no-underline">
                    {comment.profiles.full_name}
                  </a>
                ) : (
                  comment.profiles.full_name
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
              placeholder={`Trả lời ${comment.profiles.full_name}...`}
              value={replyInputText}
              onChange={(e) => setReplyInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") postReplyComment(comment);
              }}
            />
            <button
              onClick={() => postReplyComment(comment)}
              className="win95-btn font-bold px-3 py-1 text-[10px]"
            >
              GỬI
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
          <button type="submit" className="win95-btn font-bold px-6">
            GỬI
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
