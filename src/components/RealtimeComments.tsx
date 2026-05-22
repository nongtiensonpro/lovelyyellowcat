import React, { useEffect, useState, useRef } from "react";  
import { createClient, type RealtimeChannel } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;  
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;  
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

interface Comment {  
  id: string;  
  article_id: string;  
  content: string;  
  created_at: string;  
  profiles: {  
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
  const [inputText, setInputText] = useState("");  
  const activeChannelRef = useRef<RealtimeChannel | null>(null);  
    
  const retryCount = useRef(0);  
  const maxRetries = 10;  
  const baseDelay = 1500;   
  const maxDelay = 300000; 

  const establishRealtimeConnection = () => {  
    // Thu dọn các luồng lắng nghe cũ đang hoạt động để ngăn chặn rò rỉ bộ nhớ   
    if (activeChannelRef.current) {  
      supabaseClient.removeChannel(activeChannelRef.current);  
    }

    // Tạo kênh định danh độc nhất cho bài viết dựa trên mốc thời gian   
    const channelName = `comments-realtime-${articleId}-${Date.now()}`;

    const channel = supabaseClient  
      .channel(channelName)  
      .on(  
        "postgres_changes",  
        {  
          event: "INSERT",  
          schema: "public",  
          table: "comments",  
          filter: `article_id=eq.${articleId}`  
        },  
        async (payload) => {  
          // Thực hiện tải thông tin hồ sơ của người vừa bình luận  
          const { data: profile } = await supabaseClient  
            .from("profiles")  
            .select("full_name, avatar_url")  
            .eq("id", payload.new.profile_id)  
            .single();

          const receivedComment: Comment = {  
            id: payload.new.id,  
            article_id: payload.new.article_id,  
            content: payload.new.content,  
            created_at: payload.new.created_at,  
            profiles: {  
              full_name: profile?.full_name || "Anonymous Developer",  
              avatar_url: profile?.avatar_url || "/images/default-avatar.png"  
            }  
          };

          setComments((prevComments) => [...prevComments, receivedComment]);  
        }  
      )  
      .subscribe((status) => {  
        if (status === "SUBSCRIBED") {  
          console.log("Kênh kết nối bình luận thời gian thực đã hoạt động.");  
          retryCount.current = 0;   
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {  
          console.warn(`Cảnh báo ngắt kết nối: ${status}. Đang kích hoạt tiến trình phục hồi...`);  
          handleReconnection();  
        }  
      });

    activeChannelRef.current = channel;  
  };

  const handleReconnection = () => {  
    if (retryCount.current >= maxRetries) {  
      console.error("Hệ thống đã mất kết nối hoàn toàn với máy chủ thời gian thực.");  
      return;  
    }

    // Áp dụng công thức Exponential Backoff để tính toán khoảng thời gian thử lại   
    const nextDelay = Math.min(  
      maxDelay,  
      baseDelay * Math.pow(1.5, retryCount.current)  
    );

    retryCount.current += 1;

    setTimeout(() => {  
      establishRealtimeConnection();  
    }, nextDelay);  
  };

  useEffect(() => {  
    establishRealtimeConnection();

    return () => {  
      if (activeChannelRef.current) {  
        supabaseClient.removeChannel(activeChannelRef.current);  
      }  
    };  
  }, [articleId]);

  const postComment = async (event: React.FormEvent) => {  
    event.preventDefault();  
    if (!inputText.trim() || !currentUser) return;

    const { error } = await supabaseClient  
      .from("comments")  
      .insert({  
        article_id: articleId,  
        profile_id: currentUser.id,  
        content: inputText.trim()  
      });

    if (error) {  
      console.error("Không thể hoàn tất gửi bình luận:", error.message);  
    } else {  
      setInputText("");  
    }  
  };

  return (  
    <div className="win95-container w-full font-retro text-xs text-black">  
      <div className="win95-header">  
        <span>AESTHETIC_CHAT.EXE</span>  
        <span className="text-[10px] tracking-widest text-vapor-green animate-pulse">● REALTIME</span>  
      </div>  
        
      <div className="p-3 bg-[#e6e6e6] space-y-3 h-72 overflow-y-auto border-b-2 border-win-dark shadow-inner">  
        {comments.length === 0 ? (  
          <div className="text-center text-win-dark py-12">  
            <span className="text-2xl block mb-2">💾</span>  
            <p>CHƯA CÓ DỮ LIỆU BÌNH LUẬN.</p>  
          </div>  
        ) : (  
          comments.map((comment) => (  
            <div key={comment.id} className="p-2 border border-win-dark bg-white shadow-sm flex gap-3 items-start">  
              <img   
                src={comment.profiles.avatar_url}   
                alt={comment.profiles.full_name}   
                className="w-8 h-8 border border-win-dark object-cover filter saturate-150 contrast-110"  
              />  
              <div className="flex-1">  
                <div className="flex justify-between items-center mb-1 text-vapor-purple font-bold">  
                  <span>{comment.profiles.full_name}</span>  
                  <span className="text-[9px] text-win-dark font-normal">  
                    {new Date(comment.created_at).toLocaleTimeString()}  
                  </span>  
                </div>  
                <p className="text-black bg-[#f0f0f0] p-1.5 border border-dashed border-win-dark/50">{comment.content}</p>  
              </div>  
            </div>  
          ))  
        )}  
      </div>

      {currentUser ? (  
        <form onSubmit={postComment} className="p-3 bg-win-gray flex gap-2">  
          <input  
            type="text"  
            className="flex-1 p-2 border border-win-dark bg-white outline-none font-retro text-xs text-black shadow-inner focus:border-vapor-pink"  
            placeholder="Gõ suy nghĩ nghệ thuật của bạn tại đây..."  
            value={inputText}  
            onChange={(e) => setInputText(e.target.value)}  
          />  
          <button type="submit" className="win95-btn font-bold px-6">  
            GỬI  
          </button>  
        </form>  
      ) : (  
        <div className="p-3 bg-[#d4d4d4] text-center border-t border-white text-win-dark">  
          VUI LÒNG ĐĂNG NHẬP QUA GOOGLE ĐỂ GỬI BÌNH LUẬN.  
        </div>  
      )}  
    </div>  
  );  
};
