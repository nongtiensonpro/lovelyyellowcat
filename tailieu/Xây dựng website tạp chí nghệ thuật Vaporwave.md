# **Tài Liệu Đặc Tả Kỹ Thuật Và Thiết Kế Hệ Thống Website Tạp Chí Nghệ Thuật Vaporwave**

Tài liệu này đóng vai trò là bản đặc tả kỹ thuật chuẩn hóa dành cho các công cụ lập trình tự động (vibecoding). Bản đặc tả cung cấp cấu trúc thư mục, kiến trúc dữ liệu, các đoạn mã cấu hình hệ thống và các khối giao diện mẫu chuẩn công nghiệp. Dựa vào tài liệu này, công cụ lập trình tự động có thể trực tiếp kế thừa, phân tích và phát triển toàn diện mã nguồn cho dự án website tạp chí nghệ thuật phong cách Vaporwave cổ điển.

## **Kiến trúc hệ thống và tối ưu hóa hạ tầng biên**

Sự kết hợp giữa mô hình Jamstack hiện đại và hạ tầng máy chủ biên (edge computing) cho phép hệ thống vận hành với hiệu năng tối ưu, đồng thời tối thiểu hóa chi phí hạ tầng xuống mức không đồng thông qua việc tận dụng triệt để các hạn mức miễn phí từ những nhà cung cấp dịch vụ đám mây hàng đầu.

                      \+-----------------------------------+  
                      |        Cloudflare Pages           |  
                      |  (Astro SSR Edge Runtime / CDN)   |  
                      \+-----+-----------------+-----------+  
                            |                 |  
             Yêu cầu trang  |                 | Xác thực Google OAuth  
                            v                 v  
                      \+-----+---+         \+---+-------+  
                      |  Astro  |         | Supabase  |  
                      | Islands | \<-----\> |   Auth    |  
                      \+----+----+         \+-----------+  
                           |  
         Hydration (React) |  
                           v  
             \+-------------+-------------+  
             |                           |  
             v                           v  
      \+------+------+             \+------+------+  
      | Cloudinary  |             |  Supabase   |  
      | Image Store |             |  Database   |  
      \+-------------+             \+-------------+

Kiến trúc này phân tách rõ ràng trách nhiệm của từng thành phần trong hệ thống để đạt hiệu quả vận hành tối đa:

* **Astro (SSR & Hybrid Rendering):** Đóng vai trò là hạt nhân điều hướng và kết xuất trang. Các trang bài viết tĩnh được tiền biên dịch (prerendered) tại biên địa lý của Cloudflare, trong khi các phân hệ quản trị hoặc tương tác động được xử lý qua cơ chế Server-Side Rendering (SSR).1 Cơ chế Astro Islands cho phép chỉ tải Javascript cho các component React cần thiết (như form bình luận thời gian thực, upload ảnh), giữ cho chỉ số TTI (Time to Interactive) ở mức tối thiểu.  
* **React:** Xử lý các UI component phức tạp, yêu cầu tương tác cao và quản lý trạng thái cục bộ, đặc biệt là các hiệu ứng mô phỏng hệ điều hành Windows 95 và hệ thống bình luận thời gian thực.3  
* **Tailwind CSS (v4):** Cung cấp hệ thống tiện ích CSS hiệu năng cao để dựng giao diện. Toàn bộ các định nghĩa về màu sắc neon, hiệu ứng quét dòng (scanline), nhiễu sóng (glitch) được tích hợp trực tiếp vào cấu hình CSS động.5  
* **Supabase (PostgreSQL & Realtime Auth):** Đóng vai trò là trung tâm quản trị dữ liệu và xác thực. Việc ủy quyền xác thực bên thứ ba cho Google được quản lý an toàn thông qua Supabase Auth SSR.7 Hệ thống lưu trữ cơ sở dữ liệu quan hệ PostgreSQL quản lý bài viết, danh mục và bình luận động qua kênh Realtime.9  
* **Cloudflare Pages:** Hạ tầng triển khai serverless tối ưu. Việc sử dụng @astrojs/cloudflare biến toàn bộ ứng dụng thành một Cloudflare Worker siêu nhẹ chạy tại vùng biên edge toàn cầu, loại bỏ hoàn toàn độ trễ máy chủ truyền thống.1  
* **Cloudinary:** Lưu trữ toàn bộ tài nguyên đa phương tiện nghệ thuật mà không làm nặng băng thông của Cloudflare Pages. Việc sử dụng giao thức tải lên không cần chữ ký (unsigned uploads) trực tiếp từ client giúp giảm thiểu tải xử lý cho server biên.11

Bảng so sánh chi tiết dưới đây làm rõ vai trò và giới hạn vận hành của các công nghệ được lựa chọn trong dự án:

| Thành phần công nghệ | Vai trò trong hệ thống | Lý do lựa chọn và tối ưu hóa chi phí | Hạn mức miễn phí áp dụng |
| :---- | :---- | :---- | :---- |
| **Astro Framework** | Kết xuất cấu trúc trang tĩnh và động (Hybrid SSR) 1 | Tối ưu hóa SEO vượt trội cho tạp chí nghệ thuật, chỉ tải JavaScript khi thực sự cần thiết thông qua cơ chế "Astro Islands". | Mã nguồn mở, miễn phí hoàn toàn. |
| **React** | Quản lý giao diện tương tác động | Đảm bảo tính linh hoạt cao khi xây dựng các mô phỏng giao diện hệ điều hành Windows 95, xử lý các biểu mẫu động phức tạp.3 | Mã nguồn mở, miễn phí hoàn toàn. |
| **Tailwind CSS v4** | Định hình thẩm mỹ trực quan | Tích hợp sâu vào công cụ biên dịch (compiler) giúp giảm kích thước tệp CSS cuối cùng, hỗ trợ viết trực tiếp biến CSS tùy chỉnh.5 | Mã nguồn mở, miễn phí hoàn toàn. |
| **Supabase** | Cơ sở dữ liệu và Xác thực người dùng 7 | Cung cấp hệ quản trị cơ sở dữ liệu PostgreSQL mạnh mẽ, tích hợp sẵn cơ chế bảo mật cấp dòng (RLS), xác thực bên thứ ba và kênh đồng bộ thời gian thực.9 | Miễn phí 500MB cơ sở dữ liệu, hỗ trợ tới 50.000 người dùng hoạt động hàng tháng (MAU). |
| **Cloudflare Pages** | Biên dịch và phân phối mã nguồn ứng dụng 1 | Phân phối mã nguồn thông qua mạng lưới CDN biên toàn cầu, hỗ trợ chạy các đoạn mã server-side trực tiếp trên hạ tầng Edge Workers.1 | Miễn phí không giới hạn băng thông, miễn phí 100.000 lượt yêu cầu xử lý động (Worker requests) mỗi ngày. |
| **Cloudinary** | Lưu trữ và tối ưu hóa tài nguyên hình ảnh 11 | Tự động nén, chuyển đổi định dạng ảnh thông minh (WebP/AVIF) phù hợp với từng trình duyệt để giảm thiểu dung lượng tải trang. | Miễn phí 25 Credits hàng tháng (tương đương khoảng 25.000 lượt chuyển đổi hoặc 25GB dung lượng). |

## **Thiết kế giao diện và cấu hình thẩm mỹ Vaporwave**

Phong cách nghệ thuật Vaporwave tái hiện không gian hoài cổ thông qua sự kết hợp độc đáo giữa các mảng màu pastel neon rực rỡ, giao diện đồ họa máy tính thời kỳ đầu của Windows 95, các tác phẩm điêu khắc cổ điển Hy Lạp, biểu tượng MS Paint, hoạt ảnh lỗi kỹ thuật (glitch) và các đường quét ngang màn hình CRT cũ.3

### **Hệ thống bảng màu chuẩn Vaporwave**

Hệ màu của dự án được xây dựng dựa trên sự tương phản mạnh mẽ giữa các gam màu tối vũ trụ và các điểm nhấn neon phản quang để tạo ra cảm giác không gian mạng ảo ảnh 3:

| Vai trò thiết kế | Tên biến CSS | Mã màu HEX | Mô tả hiệu ứng trực quan |
| :---- | :---- | :---- | :---- |
| **Primary Pink** | \--color-vapor-pink | \#ff71ce | Sắc hồng neon rực rỡ đại diện cho năng lượng hoài cổ, dùng cho các nút kêu gọi hành động (CTA) và hiệu ứng phát sáng (glow).3 |
| **Electric Cyan** | \--color-vapor-blue | \#01cdfe | Xanh cyan điện tử mô phỏng giao diện màn hình CRT cổ và các dải neon.3 |
| **Acid Green** | \--color-vapor-green | \#05ffa1 | Xanh lục neon phản quang biểu thị cho các trạng thái hoạt động hoặc thành công. |
| **Bright Yellow** | \--color-vapor-yellow | \#fffb96 | Vàng pastel nhạt mô phỏng màu thư mục cổ điển và cảnh báo lỗi của hệ thống.3 |
| **Deep Purple** | \--color-vapor-purple | \#b967ff | Tím đậm dùng làm màu nền phụ, đường viền trang trí hoặc hiệu ứng bóng đổ chuyển động.3 |
| **Windows 95 Gray** | \--color-win-gray | \#c0c0c0 | Màu xám xi măng đặc trưng của hệ điều hành Windows 95/98 dùng làm khung nền cửa sổ.3 |
| **Win Border Dark** | \--color-win-dark | \#808080 | Xám đậm cho phần bóng đổ viền dưới và bên phải để tạo chiều sâu 3D cho giao diện Windows 95\. |
| **Cosmic Black** | \--color-cosmic-black | \#0b001a | Tông màu đen không gian pha sắc tím sâu thẳm làm nền chủ đạo cho toàn trang. |

### **Cấu hình Tailwind CSS v4**

Trong phiên bản Tailwind CSS mới nhất, việc định nghĩa cấu hình giao diện được tích hợp trực tiếp vào tệp CSS chính của ứng dụng thông qua chỉ thị @theme.5 Cách tiếp cận này giúp lược bỏ tệp cấu hình JavaScript truyền thống, tối ưu hóa quá trình biên dịch tĩnh của Astro.5  
Nhà phát triển cần thiết lập nội dung tệp src/styles/global.css theo cấu trúc sau:

CSS  
@import "tailwindcss";

@theme {  
  /\* Khai báo hệ màu nghệ thuật Vaporwave \*/  
  \--color\-vapor-pink: \#ff71ce;  
  \--color\-vapor-blue: \#01cdfe;  
  \--color\-vapor-green: \#05ffa1;  
  \--color\-vapor-yellow: \#fffb96;  
  \--color\-vapor-purple: \#b967ff;  
  \--color\-win-gray: \#c0c0c0;  
  \--color\-win-dark: \#808080;  
  \--color\-cosmic-black: \#0b001a;

  /\* Hệ thống font chữ hoài cổ \*/  
  \--font\-retro: "MS Sans Serif", "Courier New", monospace;  
  \--font\-cyber: "Satoshi", "Orbitron", sans-serif;

  /\* Cấu hình các hiệu ứng chuyển động Vaporwave đặc trưng \*/  
  \--animate-scanline: scanline 8s linear infinite;  
  \--animate-text-glitch: text-glitch 1.5s ease-in-out infinite alternate;  
  \--animate-crt-flicker: crt-flicker 0.15s infinite;

  @keyframes scanline {  
    0% {  
      transform: translateY(-100%);  
    }  
    100% {  
      transform: translateY(100%);  
    }  
  }

  @keyframes text-glitch {  
    0% {  
      text-shadow: 1px 0 0 var(--color-vapor-pink), \-1px 0 0 var(--color-vapor-blue);  
    }  
    50% {  
      text-shadow: \-2px 0 0 var(--color-vapor-pink), 2px 0 0 var(--color-vapor-blue);  
    }  
    100% {  
      text-shadow: 1px 1px 0 var(--color-vapor-pink), \-1px \-1px 0 var(--color-vapor-blue);  
    }  
  }

  @keyframes crt-flicker {  
    0% { opacity: 0.985; }  
    50% { opacity: 0.995; }  
    100% { opacity: 0.985; }  
  }  
}

### **Các lớp CSS bổ trợ giao diện hoài cổ (CRT và Windows 95 Components)**

Để hoàn thiện giao diện mang tính nghệ thuật cao, hệ thống cần được áp dụng hiệu ứng màn hình lồi CRT và các lớp phủ giả lập nhiễu sóng kỹ thuật số.15 Các lớp CSS này được định nghĩa trực tiếp để có thể áp dụng linh hoạt trên toàn bộ trang web:

CSS  
/\* Giao diện phủ hiệu ứng dòng quét CRT trên toàn màn hình \*/  
.crt-overlay {  
  position: relative;  
  overflow: hidden;  
  background-color: var(--color-cosmic-black);  
}

.crt-overlay::before {  
  content: " ";  
  display: block;  
  position: fixed;  
  top: 0;  
  left: 0;  
  bottom: 0;  
  right: 0;  
  background: linear-gradient(  
    rgba(18, 16, 16, 0) 50%,   
    rgba(0, 0, 0, 0.3) 50%  
  ), linear-gradient(  
    90deg,   
    rgba(255, 0, 0, 0.05),   
    rgba(0, 255, 0, 0.02),   
    rgba(0, 0, 255, 0.05)  
  );  
  background-size: 100% 4px, 3px 100%;  
  z-index: 9999;  
  pointer-events: none;  
}

/\* Đường quét neon di chuyển chậm từ trên xuống dưới \*/  
.crt-scanline {  
  position: fixed;  
  top: 0;  
  left: 0;  
  width: 100%;  
  height: 120px;  
  background: linear-gradient(  
    to bottom,  
    rgba(255, 113, 206, 0),  
    rgba(255, 113, 206, 0.06) 50%,  
    rgba(255, 113, 206, 0)  
  );  
  z-index: 9998;  
  pointer-events: none;  
  animation: var(--animate-scanline);  
}

/\* Khung cửa sổ giao diện mô phỏng hệ điều hành Windows 95 \*/  
.win95-container {  
  background-color: var(--color-win-gray);  
  border-top: 2px solid \#ffffff;  
  border-left: 2px solid \#ffffff;  
  border-right: 2px solid var(--color-win-dark);  
  border-bottom: 2px solid var(--color-win-dark);  
  box-shadow: 1px 1px 0px 0px \#000000;  
  padding: 4px;  
}

.win95-header {  
  background: linear-gradient(90deg, \#000080, \#1084d0);  
  color: \#ffffff;  
  font-family: var(--font-retro);  
  font-weight: bold;  
  font-size: 12px;  
  padding: 4px 8px;  
  display: flex;  
  justify-content: space-between;  
  align-items: center;  
}

.win95-btn {  
  background-color: var(--color-win-gray);  
  border-top: 1.5px solid \#ffffff;  
  border-left: 1.5px solid \#ffffff;  
  border-right: 1.5px solid var(--color-win-dark);  
  border-bottom: 1.5px solid var(--color-win-dark);  
  padding: 2px 6px;  
  font-size: 11px;  
  font-family: var(--font-retro);  
  color: \#000000;  
  cursor: pointer;  
  box-shadow: inset 0.5px 0.5px 0px 0px \#ffffff;  
}

.win95-btn:active {  
  border-top: 1.5px solid var(--color-win-dark);  
  border-left: 1.5px solid var(--color-win-dark);  
  border-right: 1.5px solid \#ffffff;  
  border-bottom: 1.5px solid \#ffffff;  
  padding: 3px 5px 1px 7px;  
}

## **Cấu hình hạ tầng Cloudflare Pages và Astro SSR**

Để ứng dụng chạy mượt mà ở chế độ Server-Side Rendering (SSR) trên nền tảng Cloudflare Pages, cần cấu hình adapter tương thích để chuyển đổi mã nguồn Astro thành các hàm Worker chạy tại vùng biên (Edge Workers).1

### **Quy trình khởi tạo và cài đặt các gói phụ thuộc**

Nhà phát triển tiến hành cài đặt adapter Cloudflare và các thư viện hỗ trợ bằng lệnh sau 1:

Bash  
npm install @astrojs/cloudflare @astrojs/react @astrojs/tailwind tailwindcss @supabase/supabase-js @supabase/ssr

### **Thiết lập tệp astro.config.mjs cho môi trường biên Cloudflare**

Tệp cấu hình này chỉ định cho Astro chuyển đổi chế độ kết xuất thành Server-Side Rendering (output: "server") và tích hợp adapter xử lý tối ưu hóa hình ảnh tương thích với môi trường workerd của Cloudflare 2:

JavaScript  
import { defineConfig } from "astro/config";  
import cloudflare from "@astrojs/cloudflare";  
import react from "@astrojs/react";  
import tailwind from "@astrojs/tailwind";

export default defineConfig({  
  output: "server",  
  adapter: cloudflare({  
    imageService: {  
      build: "compile",  
      runtime: "cloudflare-binding"  
    },  
    // Vô hiệu hóa binding SESSION mặc định nếu không sử dụng để tránh xung đột môi trường preview  
    sessionKVBindingName: undefined  
  }),  
  integrations:,  
  devToolbar: {  
    enabled: false  
  }  
});

### **Cấu hình tệp wrangler.jsonc cho Cloudflare Pages**

Để chỉ định các thiết lập đặc thù khi triển khai trên Cloudflare Pages, nhà phát triển tạo tệp wrangler.jsonc tại thư mục gốc của dự án 1:

Đoạn mã  
{  
  "name": "vaporwave-art-magazine",  
  "compatibility\_date": "2026-05-20",  
  "compatibility\_flags": \[  
    "nodejs\_compat"  
  \],  
  "pages\_build\_output\_dir": "dist"  
}

## **Xác thực người dùng bên thứ ba qua Google OAuth và Supabase SSR**

Hệ thống xác thực người dùng được thiết lập thông qua giao thức Google OAuth 2.0, tích hợp trực tiếp vào dịch vụ xác thực của Supabase.7 Khi người dùng đăng nhập bằng tài khoản Google, thông tin phiên hoạt động (session) được mã hóa và lưu trữ trực tiếp dưới dạng Cookie phía máy chủ, đảm bảo khả năng bảo mật tối ưu chống lại các cuộc tấn công chiếm đoạt mã độc (XSS/CSRF).8

### **Quy trình thiết lập Google OAuth trên Supabase Console**

Để kết nối dịch vụ xác thực của Google với Supabase, nhà phát triển thực hiện các bước sau 8:

1. Truy cập vào **Google Cloud Console**, tạo một dự án mới và khởi tạo màn hình đồng ý OAuth (OAuth Consent Screen).  
2. Tạo thông tin xác thực mới loại **OAuth Client ID** với loại ứng dụng là *Web Application*.  
3. Lấy mã **Client ID** và **Client Secret** do Google cung cấp.  
4. Trong phần cài đặt **Authorized redirect URIs** của Google Cloud, thêm URL callback của Supabase theo cấu trúc: https://\<mã-dự-án-supabase\>.supabase.co/auth/v1/callback.8  
5. Mở **Supabase Dashboard**, tìm đến mục **Authentication** \-\> **Providers** \-\> **Google**.  
6. Bật kích hoạt (Enable) nhà cung cấp Google, dán mã **Client ID** và **Client Secret** thu được từ Google Cloud vào và lưu cấu hình lại.8

### **Mã nguồn khởi tạo Supabase Server Client quản lý Cookie**

Đoạn mã dưới đây thực hiện chức năng khởi tạo kết nối Supabase, tự động phân tích và đồng bộ các yêu cầu lưu trữ hay thu hồi Cookie từ trình duyệt của người dùng 8:

TypeScript  
// src/lib/supabase.ts  
import { createServerClient, parseCookieHeader, type CookieOptionsWithName } from "@supabase/ssr";  
import type { AstroCookies } from "astro";

export const cookieOptions: CookieOptionsWithName \= {  
  path: "/",  
  secure: true,  
  httpOnly: true,  
  sameSite: "lax",  
};

export function createSupabaseServerClient(context: { request: Request; cookies: AstroCookies }) {  
  const supabaseUrl \= import.meta.env.PUBLIC\_SUPABASE\_URL;  
  const supabaseAnonKey \= import.meta.env.PUBLIC\_SUPABASE\_ANON\_KEY;

  if (\!supabaseUrl ||\!supabaseAnonKey) {  
    throw new Error("Biến môi trường của Supabase chưa được thiết lập đầy đủ.");  
  }

  return createServerClient(  
    supabaseUrl,  
    supabaseAnonKey,  
    {  
      cookieOptions,  
      cookies: {  
        getAll() {  
          return parseCookieHeader(context.request.headers.get("Cookie")?? "");  
        },  
        setAll(cookiesToSet) {  
          cookiesToSet.forEach(({ name, value, options }) \=\> {  
            context.cookies.set(name, value, {...cookieOptions,...options });  
          });  
        },  
      },  
    }  
  );  
}

### **Điểm cuối xử lý yêu cầu đăng nhập bằng Google (Google Sign-In API Route)**

Điểm cuối (endpoint) này điều hướng trực tiếp người dùng từ trang web sang giao diện xác nhận tài khoản bảo mật của Google thông qua máy chủ Supabase 7:

TypeScript  
// src/pages/api/auth/signin.ts  
import type { APIRoute } from "astro";  
import { createSupabaseServerClient } from "../../../lib/supabase";

export const GET: APIRoute \= async ({ request, cookies, url }) \=\> {  
  const supabase \= createSupabaseServerClient({ request, cookies });  
  const redirectUrl \= \`${url.origin}/auth/callback\`;

  // Thực hiện yêu cầu sinh URL đăng nhập OAuth từ Supabase  
  const { data, error } \= await supabase.auth.signInWithOAuth({  
    provider: "google",  
    options: {  
      redirectTo: redirectUrl,  
    },  
  });

  if (error) {  
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });  
  }

  // Chuyển hướng trình duyệt của người dùng đến trang xác thực Google  
  return Response.redirect(data.url, 307);  
};

### **Điểm cuối xử lý đăng xuất người dùng (Sign-Out API Route)**

Đoạn mã xử lý quy trình hủy bỏ trạng thái phiên hoạt động hiện tại, xóa bỏ toàn bộ cookie lưu trữ trên thiết bị người dùng 7:

TypeScript  
// src/pages/api/auth/signout.ts  
import type { APIRoute } from "astro";  
import { createSupabaseServerClient } from "../../../lib/supabase";

export const POST: APIRoute \= async ({ request, cookies }) \=\> {  
  const supabase \= createSupabaseServerClient({ request, cookies });  
    
  const { error } \= await supabase.auth.signOut();  
    
  if (error) {  
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });  
  }

  return Response.redirect(new URL(request.url).origin, 303);  
};

### **Xử lý luồng phản hồi thông tin ủy quyền (Astro Callback Page)**

Sau khi người dùng hoàn tất đăng nhập tại máy chủ của Google, kết quả sẽ gửi kèm mã code xác thực trở lại trang callback này nhằm thiết lập phiên đăng nhập chính thức trên hệ thống 7:

Đoạn mã  
\---  
// src/pages/auth/callback.astro  
import { createSupabaseServerClient } from "../../lib/supabase";

const requestUrl \= new URL(Astro.request.url);  
const code \= requestUrl.searchParams.get("code");  
const next \= requestUrl.searchParams.get("next") || "/";

if (code) {  
  const supabase \= createSupabaseServerClient({  
    request: Astro.request,  
    cookies: Astro.cookies,  
  });

  // Tiến hành trao đổi mã code lấy token phiên đăng nhập (session token) từ Supabase Auth  
  const { error } \= await supabase.auth.exchangeCodeForSession(code);  
    
  if (\!error) {  
    return Astro.redirect(next);  
  }  
    
  console.error("Lỗi trao đổi mã code xác thực:", error.message);  
}

// Chuyển hướng về trang chủ kèm cờ thông báo lỗi xác thực  
return Astro.redirect("/?error=auth-failed");  
\---

### **Thiết lập bảng Hồ sơ người dùng và Cơ chế Trigger tự động**

Để tự động đồng bộ tài khoản đăng nhập Google thành một bản ghi thông tin người dùng công khai trong cơ sở dữ liệu, nhà phát triển thực thi đoạn mã SQL sau tại Supabase SQL Editor 13:

SQL  
\-- Tạo bảng lưu trữ thông tin hồ sơ người dùng trong schema public  
create table public.profiles (  
  id uuid not null references auth.users on delete cascade,  
  email text not null,  
  full\_name text,  
  avatar\_url text,  
  created\_at timestamp with time zone default timezone('utc'::text, now()) not null,  
  primary key (id)  
);

\-- Kích hoạt chính sách bảo mật cấp dòng (Row Level Security \- RLS)  
alter table public.profiles enable row level security;

\-- Cho phép tất cả mọi người được quyền xem hồ sơ công khai của người dùng khác  
create policy "Cho phép tất cả mọi người đọc hồ sơ" on public.profiles  
  for select using (true);

\-- Cho phép chính chủ sửa đổi hồ sơ cá nhân của mình  
create policy "Cho phép người dùng tự chỉnh sửa hồ sơ bản thân" on public.profiles  
  for update to authenticated using (auth.uid() \= id);

\-- Định nghĩa hàm trigger để sao chép thông tin tài khoản tự động từ auth.users sang public.profiles \[13, 19\]  
create or replace function public.handle\_new\_google\_user()  
returns trigger  
language plpgsql  
security definer set search\_path \= ''  
as $$  
begin  
  insert into public.profiles (id, email, full\_name, avatar\_url)  
  values (  
    new.id,  
    new.email,  
    coalesce(new.raw\_user\_meta\_data \-\>\> 'full\_name', new.raw\_user\_meta\_data \-\>\> 'name'),  
    new.raw\_user\_meta\_data \-\>\> 'avatar\_url'  
  );  
  return new;  
end;  
$$;

\-- Tạo trigger chạy tự động sau khi bản ghi mới được thêm thành công vào bảng auth.users \[19, 20\]  
create or replace trigger on\_auth\_user\_created\_google  
  after insert on auth.users  
  for each row execute procedure public.handle\_new\_google\_user();

## **Lưu trữ hình ảnh đa phương tiện với Cloudinary Unsigned Uploads**

Việc tải hình ảnh trực tiếp từ trình duyệt của người dùng lên kho chứa Cloudinary thông qua chế độ tải lên không cần chữ ký (Unsigned Upload Preset) giúp tối ưu hóa hiệu năng, giảm tải xử lý cho máy chủ biên Cloudflare Pages và tránh rò rỉ khóa bảo mật (API Secrets) của dự án.11

### **Mã nguồn React Component tải ảnh nghệ thuật lên Cloudinary**

Đoạn mã React dưới đây triển khai giao diện tải lên hình ảnh nghệ thuật, hiển thị trạng thái xử lý trực quan theo phong cách thiết kế Windows 95 3:

TypeScript  
// src/components/CloudinaryUpload.tsx  
import React, { useState, useRef } from "react";

interface CloudinaryUploadProps {  
  onUploadSuccess: (secureUrl: string) \=\> void;  
}

export const CloudinaryUpload: React.FC\<CloudinaryUploadProps\> \= ({ onUploadSuccess }) \=\> {  
  const \[isUploading, setIsUploading\] \= useState(false);  
  const \[imageUrl, setImageUrl\] \= useState\<string | null\>(null);  
  const fileInputRef \= useRef\<HTMLInputElement\>(null);

  const handleUpload \= async (event: React.ChangeEvent\<HTMLInputElement\>) \=\> {  
    const file \= event.target.files?.;  
    if (\!file) return;

    setIsUploading(true);  
      
    // Tạo đường dẫn tạm thời cục bộ phục vụ việc hiển thị trước hình ảnh  
    setImageUrl(URL.createObjectURL(file));

    const cloudName \= import.meta.env.PUBLIC\_CLOUDINARY\_CLOUD\_NAME;  
    const uploadPreset \= import.meta.env.PUBLIC\_CLOUDINARY\_UPLOAD\_PRESET;

    const formData \= new FormData();  
    formData.append("file", file);  
    formData.append("upload\_preset", uploadPreset);

    try {  
      const response \= await fetch(  
        \`https://api.cloudinary.com/v1\_1/${cloudName}/image/upload\`,  
        {  
          method: "POST",  
          body: formData,  
        }  
      );

      if (\!response.ok) {  
        throw new Error("Tải lên hình ảnh thất bại.");  
      }

      const responseData \= await response.json();  
        
      // Gọi hàm callback báo cáo liên kết ảnh bảo mật đã upload thành công  
      onUploadSuccess(responseData.secure\_url);  
    } catch (err) {  
      console.error("Lỗi xảy ra trong quá trình upload ảnh:", err);  
      alert("Đã xảy ra sự cố trong quá trình truyền tải tệp tin.");  
    } finally {  
      setIsUploading(false);  
    }  
  };

  return (  
    \<div className="win95-container max-w-sm w-full font-retro"\>  
      \<div className="win95-header"\>  
        \<span\>ART\_ARCHIVE.EXE\</span\>  
        \<button className="win95-btn py-0 px-1" onClick={() \=\> setImageUrl(null)}\>X\</button\>  
      \</div\>  
        
      \<div className="p-4 bg-win-gray flex flex-col items-center"\>  
        \<div className="w-full min-h-40 border-2 border-win-dark bg-black mb-4 flex items-center justify-center relative overflow-hidden"\>  
          {imageUrl? (  
            \<img   
              src={imageUrl}   
              alt="Preview artwork"   
              className="w-full h-full object-contain max-h-40 filter hue-rotate-15 contrast-125 brightness-110"  
            /\>  
          ) : (  
            \<div className="text-center text-vapor-pink p-2 animate-pulse"\>  
              \<span className="block text-4xl mb-1"\>🖼️\</span\>  
              \<p className="text-\[10px\] tracking-widest text-vapor-blue"\>WAITING FOR DATA...\</p\>  
            \</div\>  
          )}  
            
          {isUploading && (  
            \<div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center"\>  
              \<div className="text-vapor-green text-xs mb-2 tracking-widest animate-pulse"\>UPLOADING...\</div\>  
              \<div className="w-3/4 bg-win-dark border border-white h-4 p-0.5"\>  
                \<div className="bg-gradient-to-r from-vapor-pink via-vapor-purple to-vapor-blue h-full w-2/3 animate-\[pulse\_1s\_infinite\]"\>\</div\>  
              \</div\>  
            \</div\>  
          )}  
        \</div\>

        \<input   
          type="file"   
          ref={fileInputRef}  
          onChange={handleUpload}  
          accept="image/\*"  
          className="hidden"  
          disabled={isUploading}  
        /\>

        \<button   
          type="button"  
          onClick={() \=\> fileInputRef.current?.click()}  
          disabled={isUploading}  
          className="win95-btn w-full text-xs py-2 tracking-wide font-bold"  
        \>  
          {isUploading? "ĐANG XỬ LÝ..." : "CHỌN TỆP TIN ẢNH"}  
        \</button\>  
      \</div\>  
    \</div\>  
  );  
};

## **Hệ thống tương tác và bình luận thời gian thực**

Hệ thống bình luận cho phép độc giả tương tác tức thời dưới mỗi bài viết nghệ thuật. Giải pháp kỹ thuật này sử dụng hạ tầng kết nối thời gian thực thông qua giao thức WebSocket của Supabase Realtime Engine.10  
Để ngăn chặn các lỗi mất kết nối đột ngột hoặc rớt mạng của thiết bị di động, hệ thống kết nối trong React được thiết kế theo cơ chế tự phục hồi liên kết có giãn cách luỹ tiến theo hàm số mũ (Exponential Backoff).22  
Công thức toán học tính toán thời gian trễ ![][image1] để thực hiện một lượt kết nối lại thứ ![][image2] liên tiếp như sau 22:  
![][image3]  
Trong đó:

* ![][image4] đại diện cho khoảng thời gian chờ cơ sở ban đầu (được thiết lập là ![][image5] mili-giây).  
* ![][image6] đại diện cho hệ số nhân khoảng cách thử nghiệm lại (được thiết lập là ![][image7]).  
* ![][image8] đại diện cho mức trễ tối đa cho phép để tránh gây quá tải tài nguyên máy chủ (được thiết lập là ![][image9] mili-giây tức 5 phút).  
* ![][image2] là số lần kết nối lại thất bại liên tiếp trước đó.

### **Định nghĩa cấu trúc bảng dữ liệu bình luận**

Đoạn mã SQL dưới đây thiết lập cấu trúc lưu trữ dữ liệu bình luận bài viết kèm theo các chính sách bảo mật cấp dòng nghiêm ngặt để bảo vệ dữ liệu 10:

SQL  
\-- Tạo bảng lưu trữ bình luận bài viết  
create table public.comments (  
  id uuid default gen\_random\_uuid() primary key,  
  article\_id text not null,  
  profile\_id uuid references public.profiles(id) on delete cascade not null,  
  content text not null,  
  created\_at timestamp with time zone default timezone('utc'::text, now()) not null  
);

\-- Kích hoạt tính năng bảo mật dòng (RLS)  
alter table public.comments enable row level security;

\-- Cho phép tất cả mọi người được quyền đọc bình luận  
create policy "Cho phép tất cả mọi người đọc bình luận" on public.comments  
  for select using (true);

\-- Chỉ cho phép người dùng đã đăng nhập thành công được viết bình luận dưới danh nghĩa chính mình  
create policy "Cho phép người dùng xác thực ghi nhận bình luận" on public.comments  
  for insert to authenticated with check (auth.uid() \= profile\_id);

### **Mã nguồn React Component xử lý Bình luận Thời gian thực**

Đoạn mã hoàn chỉnh dưới đây quản lý vòng đời kết nối thời gian thực, tự động gỡ bỏ các kênh kết nối thừa (Memory Leak) và xử lý ngoại lệ mất mạng hiệu quả 9:

TypeScript  
// src/components/RealtimeComments.tsx  
import React, { useEffect, useState, useRef } from "react";  
import { createClient, type RealtimeChannel } from "@supabase/supabase-js";

const supabaseUrl \= import.meta.env.PUBLIC\_SUPABASE\_URL;  
const supabaseAnonKey \= import.meta.env.PUBLIC\_SUPABASE\_ANON\_KEY;  
const supabaseClient \= createClient(supabaseUrl, supabaseAnonKey);

interface Comment {  
  id: string;  
  article\_id: string;  
  content: string;  
  created\_at: string;  
  profiles: {  
    full\_name: string;  
    avatar\_url: string;  
  };  
}

interface RealtimeCommentsProps {  
  articleId: string;  
  initialComments: Comment;  
  currentUser: {  
    id: string;  
    full\_name: string;  
    avatar\_url: string;  
  } | null;  
}

export const RealtimeComments: React.FC\<RealtimeCommentsProps\> \= ({  
  articleId,  
  initialComments,  
  currentUser  
}) \=\> {  
  const \[comments, setComments\] \= useState\<Comment\>(initialComments);  
  const \= useState("");  
  const activeChannelRef \= useRef\<RealtimeChannel | null\>(null);  
    
  const retryCount \= useRef(0);  
  const maxRetries \= 10;  
  const baseDelay \= 1500;   
  const maxDelay \= 300000; 

  const establishRealtimeConnection \= () \=\> {  
    // Thu dọn các luồng lắng nghe cũ đang hoạt động để ngăn chặn rò rỉ bộ nhớ   
    if (activeChannelRef.current) {  
      supabaseClient.removeChannel(activeChannelRef.current);  
    }

    // Tạo kênh định danh độc nhất cho bài viết dựa trên mốc thời gian   
    const channelName \= \`comments-realtime-${articleId}-${Date.now()}\`;

    const channel \= supabaseClient  
     .channel(channelName)  
     .on(  
        "postgres\_changes",  
        {  
          event: "INSERT",  
          schema: "public",  
          table: "comments",  
          filter: \`article\_id=eq.${articleId}\`  
        },  
        async (payload) \=\> {  
          // Thực hiện tải thông tin hồ sơ của người vừa bình luận  
          const { data: profile } \= await supabaseClient  
           .from("profiles")  
           .select("full\_name, avatar\_url")  
           .eq("id", payload.new.profile\_id)  
           .single();

          const receivedComment: Comment \= {  
            id: payload.new.id,  
            article\_id: payload.new.article\_id,  
            content: payload.new.content,  
            created\_at: payload.new.created\_at,  
            profiles: {  
              full\_name: profile?.full\_name || "Anonymous Developer",  
              avatar\_url: profile?.avatar\_url || "/images/default-avatar.png"  
            }  
          };

          setComments((prevComments) \=\> \[...prevComments, receivedComment\]);  
        }  
      )  
     .subscribe((status) \=\> {  
        if (status \=== "SUBSCRIBED") {  
          console.log("Kênh kết nối bình luận thời gian thực đã hoạt động.");  
          retryCount.current \= 0;   
        }

        if (status \=== "CHANNEL\_ERROR" || status \=== "TIMED\_OUT" || status \=== "CLOSED") {  
          console.warn(\`Cảnh báo ngắt kết nối: ${status}. Đang kích hoạt tiến trình phục hồi...\`);  
          handleReconnection();  
        }  
      });

    activeChannelRef.current \= channel;  
  };

  const handleReconnection \= () \=\> {  
    if (retryCount.current \>= maxRetries) {  
      console.error("Hệ thống đã mất kết nối hoàn toàn với máy chủ thời gian thực.");  
      return;  
    }

    // Áp dụng công thức Exponential Backoff để tính toán khoảng thời gian thử lại   
    const nextDelay \= Math.min(  
      maxDelay,  
      baseDelay \* Math.pow(1.5, retryCount.current)  
    );

    retryCount.current \+= 1;

    setTimeout(() \=\> {  
      establishRealtimeConnection();  
    }, nextDelay);  
  };

  useEffect(() \=\> {  
    establishRealtimeConnection();

    return () \=\> {  
      if (activeChannelRef.current) {  
        supabaseClient.removeChannel(activeChannelRef.current);  
      }  
    };  
  }, \[articleId\]);

  const postComment \= async (event: React.FormEvent) \=\> {  
    event.preventDefault();  
    if (\!inputText.trim() ||\!currentUser) return;

    const { error } \= await supabaseClient  
     .from("comments")  
     .insert({  
        article\_id: articleId,  
        profile\_id: currentUser.id,  
        content: inputText.trim()  
      });

    if (error) {  
      console.error("Không thể hoàn tất gửi bình luận:", error.message);  
    } else {  
      setInputText("");  
    }  
  };

  return (  
    \<div className="win95-container w-full font-retro text-xs text-black"\>  
      \<div className="win95-header"\>  
        \<span\>AESTHETIC\_CHAT.EXE\</span\>  
        \<span className="text-\[10px\] tracking-widest text-vapor-green animate-pulse"\>● REALTIME\</span\>  
      \</div\>  
        
      \<div className="p-3 bg-\[\#e6e6e6\] space-y-3 h-72 overflow-y-auto border-b-2 border-win-dark shadow-inner"\>  
        {comments.length \=== 0? (  
          \<div className="text-center text-win-dark py-12"\>  
            \<span className="text-2xl block mb-2"\>💾\</span\>  
            \<p\>CHƯA CÓ DỮ LIỆU BÌNH LUẬN.\</p\>  
          \</div\>  
        ) : (  
          comments.map((comment) \=\> (  
            \<div key={comment.id} className="p-2 border border-win-dark bg-white shadow-sm flex gap-3 items-start"\>  
              \<img   
                src={comment.profiles.avatar\_url}   
                alt={comment.profiles.full\_name}   
                className="w-8 h-8 border border-win-dark object-cover filter saturate-150 contrast-110"  
              /\>  
              \<div className="flex-1"\>  
                \<div className="flex justify-between items-center mb-1 text-vapor-purple font-bold"\>  
                  \<span\>{comment.profiles.full\_name}\</span\>  
                  \<span className="text-\[9px\] text-win-dark font-normal"\>  
                    {new Date(comment.created\_at).toLocaleTimeString()}  
                  \</span\>  
                \</div\>  
                \<p className="text-black bg-\[\#f0f0f0\] p-1.5 border border-dashed border-win-dark/50"\>{comment.content}\</p\>  
              \</div\>  
            \</div\>  
          ))  
        )}  
      \</div\>

      {currentUser? (  
        \<form onSubmit={postComment} className="p-3 bg-win-gray flex gap-2"\>  
          \<input  
            type="text"  
            className="flex-1 p-2 border border-win-dark bg-white outline-none font-retro text-xs text-black shadow-inner focus:border-vapor-pink"  
            placeholder="Gõ suy nghĩ nghệ thuật của bạn tại đây..."  
            value={inputText}  
            onChange={(e) \=\> setInputText(e.target.value)}  
          /\>  
          \<button type="submit" className="win95-btn font-bold px-6"\>  
            GỬI  
          \</button\>  
        \</form\>  
      ) : (  
        \<div className="p-3 bg-\[\#d4d4d4\] text-center border-t border-white text-win-dark"\>  
          VUI LÒNG ĐĂNG NHẬP QUA GOOGLE ĐỂ GỬI BÌNH LUẬN.  
        \</div\>  
      )}  
    \</div\>  
  );  
};

## **Cấu trúc dự án và chỉ dẫn nạp dữ liệu cho công cụ Vibecoding**

Để công cụ lập trình tự động (vibecoding) có thể xử lý, phân tích dự án một cách tuần tự và chính xác nhất, mã nguồn cần được phân rã theo một cây cấu trúc thư mục rõ ràng và chuẩn hóa.

### **Cây cấu trúc thư mục dự án (File Tree Setup)**

├──.github/  
│   └── workflows/  
│       └── deploy.yml          \# Tự động hóa CI/CD Cloudflare Pages  
├── src/  
│   ├── components/             \# Các khối React UI Components tương tác  
│   │   ├── CloudinaryUpload.tsx  
│   │   ├── RealtimeComments.tsx  
│   │   └── Win95Window.tsx  
│   ├── layouts/                \# Khung sườn bố cục trang của Astro  
│   │   └── BaseLayout.astro  
│   ├── lib/                    \# Các tệp cấu hình và kết nối thư viện  
│   │   └── supabase.ts  
│   ├── pages/                  \# Hệ thống điều hướng trang tự động (Astro Routes)  
│   │   ├── api/  
│   │   │   └── auth/  
│   │   │       ├── signin.ts  
│   │   │       └── signout.ts  
│   │   ├── auth/  
│   │   │   └── callback.astro  
│   │   ├── articles/  
│   │   │   └── \[slug\].astro    \# Chi tiết bài báo tạp chí nghệ thuật  
│   │   └── index.astro         \# Trang chủ hiển thị danh sách tạp chí  
│   ├── styles/                 \# Tệp quản lý cấu hình phong cách  
│   │   └── global.css          \# Tích hợp cấu hình Tailwind v4 và CRT CSS  
│   └── env.d.ts                \# Định nghĩa kiểu dữ liệu cho biến môi trường  
├── astro.config.mjs            \# Cấu hình chính của hệ thống Astro  
├── package.json  
├── tsconfig.json               \# Cấu hình TypeScript cho dự án  
└── wrangler.jsonc              \# Cấu hình Cloudflare Pages Deployment

### **Chỉ dẫn nạp dữ liệu chuẩn hóa cho công cụ Vibecoding**

Khi lập trình viên đưa tài liệu này vào các nền tảng lập trình tự động bằng ngôn ngữ tự nhiên (Vibecoding Tools), cần áp dụng khung chỉ lệnh chuẩn hóa sau để đảm bảo công cụ triển khai nhất quán:

1. **Thiết lập Môi trường và Biến số:** Yêu cầu hệ thống đọc kỹ cấu trúc của astro.config.mjs 2 và khởi tạo tệp .env cục bộ với các biến bắt buộc: PUBLIC\_SUPABASE\_URL, PUBLIC\_SUPABASE\_ANON\_KEY, PUBLIC\_CLOUDINARY\_CLOUD\_NAME, và PUBLIC\_CLOUDINARY\_UPLOAD\_PRESET.7  
2. **Khởi tạo Hệ thống Phong cách (Vaporwave Aesthetic Engine):** Bắt buộc công cụ nạp tệp src/styles/global.css làm nền tảng CSS gốc. Nghiêm cấm tự sinh các màu sắc ngẫu nhiên ngoài danh mục bảng màu Vaporwave đã định nghĩa để duy trì tính đồng nhất thẩm mỹ.3  
3. **Tích hợp Supabase SSR Auth:** Khi phát triển bất kỳ phân hệ chức năng nào liên quan đến tài khoản người dùng, công cụ phải sử dụng bộ kiểm soát trạng thái phiên thông qua createSupabaseServerClient tại tệp src/lib/supabase.ts để tối ưu bảo mật đầu cuối dựa trên Cookie.8  
4. **Cấu trúc Bài viết và Tương tác:** Triển khai luồng đọc thông tin bài viết tạp chí tĩnh qua Astro Static Generation kết hợp động bộ tương tác bình luận bằng component React RealtimeComments thông qua cơ chế kích hoạt Island (client:load).10  
5. **Biên dịch sản phẩm:** Cấu hình quy trình dịch mã tối ưu hóa của Cloudflare Pages, hướng dẫn công cụ lập trình luôn kiểm tra tính tương thích của mã nguồn với môi trường Edge Runtime không chứa các thư viện Node.js thuần trước khi tự động tạo bản build.1

#### **Nguồn trích dẫn**

1. astrojs/cloudflare \- Astro Docs, truy cập vào tháng 5 20, 2026, [https://docs.astro.build/ar/guides/integrations-guide/cloudflare/](https://docs.astro.build/ar/guides/integrations-guide/cloudflare/)  
2. astrojs/cloudflare \- Astro Docs, truy cập vào tháng 5 20, 2026, [https://docs.astro.build/en/guides/integrations-guide/cloudflare/](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)  
3. Vaporwave Windows 95 \- Etsy, truy cập vào tháng 5 20, 2026, [https://www.etsy.com/market/vaporwave\_windows\_95](https://www.etsy.com/market/vaporwave_windows_95)  
4. Building Realtime Applications with Supabase and React \- YouTube, truy cập vào tháng 5 20, 2026, [https://www.youtube.com/watch?v=rvrDuyCiu4U](https://www.youtube.com/watch?v=rvrDuyCiu4U)  
5. Adding custom styles \- Core concepts \- Tailwind CSS, truy cập vào tháng 5 20, 2026, [https://tailwindcss.com/docs/adding-custom-styles](https://tailwindcss.com/docs/adding-custom-styles)  
6. Theme variables \- Core concepts \- Tailwind CSS, truy cập vào tháng 5 20, 2026, [https://tailwindcss.com/docs/theme](https://tailwindcss.com/docs/theme)  
7. Use Supabase Auth with Astro | Supabase Docs, truy cập vào tháng 5 20, 2026, [https://supabase.com/docs/guides/auth/quickstarts/astrojs](https://supabase.com/docs/guides/auth/quickstarts/astrojs)  
8. How to add Supabase Auth to Astro | Mihai Andrei, truy cập vào tháng 5 20, 2026, [https://mihai-andrei.com/blog/how-to-add-supabase-auth-to-astro/](https://mihai-andrei.com/blog/how-to-add-supabase-auth-to-astro/)  
9. All the ways to react to changes in Supabase \- Sequin Blog, truy cập vào tháng 5 20, 2026, [https://blog.sequinstream.com/all-the-ways-to-react-to-changes-in-supabase/](https://blog.sequinstream.com/all-the-ways-to-react-to-changes-in-supabase/)  
10. Subscribe to Database Changes with Supabase Realtime | egghead.io, truy cập vào tháng 5 20, 2026, [https://egghead.io/lessons/supabase-subscribe-to-database-changes-with-supabase-realtime](https://egghead.io/lessons/supabase-subscribe-to-database-changes-with-supabase-realtime)  
11. Reusable React component to upload images on cloudinary \- GitHub, truy cập vào tháng 5 20, 2026, [https://github.com/Akkisdiary/cloudinary-image-upload](https://github.com/Akkisdiary/cloudinary-image-upload)  
12. How to Build Secure SSR Authentication with Supabase, Astro, and Cloudflare Turnstile, truy cập vào tháng 5 20, 2026, [https://www.freecodecamp.org/news/build-secure-ssr-authentication-with-supabase-astro-and-cloudflare-turnstile/](https://www.freecodecamp.org/news/build-secure-ssr-authentication-with-supabase-astro-and-cloudflare-turnstile/)  
13. Creating a Password Signup With Profiles table (Triggers and Functions) \- Medium, truy cập vào tháng 5 20, 2026, [https://medium.com/@Medalilandolsi/supabase-creating-a-password-signup-with-profiles-table-triggers-and-functions-42a8c40b6b27](https://medium.com/@Medalilandolsi/supabase-creating-a-password-signup-with-profiles-table-triggers-and-functions-42a8c40b6b27)  
14. r/vaporwave CSS and Aesthetic \- Reddit, truy cập vào tháng 5 20, 2026, [https://www.reddit.com/r/Vaporwave/comments/3ovq58/rvaporwave\_css\_and\_aesthetic/](https://www.reddit.com/r/Vaporwave/comments/3ovq58/rvaporwave_css_and_aesthetic/)  
15. CSS Hover Effects: Inspiring Examples You Can Use \- WPDean, truy cập vào tháng 5 20, 2026, [https://wpdean.com/css-hover-effects/](https://wpdean.com/css-hover-effects/)  
16. All Tailwind CSS Components — Page 2 of 2 | GoSnippets, truy cập vào tháng 5 20, 2026, [https://www.gosnippets.com/tailwind/components?page=2](https://www.gosnippets.com/tailwind/components?page=2)  
17. @astrojs/tailwind | Docs \- Netlify, truy cập vào tháng 5 20, 2026, [https://5-0-0-beta--astro-docs-2.netlify.app/en/guides/integrations-guide/tailwind/](https://5-0-0-beta--astro-docs-2.netlify.app/en/guides/integrations-guide/tailwind/)  
18. server-islands/astro.config.mjs at main \- GitHub, truy cập vào tháng 5 20, 2026, [https://github.com/withastro/server-islands/blob/main/astro.config.mjs](https://github.com/withastro/server-islands/blob/main/astro.config.mjs)  
19. Automatically Creating New Users in Supabase with SQL Triggers | Anh Thang Bui, truy cập vào tháng 5 20, 2026, [https://anhthang.org/posts/2024-05-30-automatically-creating-new-users-in-supabase-with-sql-triggers](https://anhthang.org/posts/2024-05-30-automatically-creating-new-users-in-supabase-with-sql-triggers)  
20. Sign-up database trigger to insert into public users table · supabase · Discussion \#306, truy cập vào tháng 5 20, 2026, [https://github.com/orgs/supabase/discussions/306](https://github.com/orgs/supabase/discussions/306)  
21. Realtime | Supabase Docs, truy cập vào tháng 5 20, 2026, [https://supabase.com/docs/guides/realtime](https://supabase.com/docs/guides/realtime)  
22. Production-ready listener for Supabase realtime Postgres changes in Node.js \- Medium, truy cập vào tháng 5 20, 2026, [https://medium.com/@dipiash/supabase-realtime-postgres-changes-in-node-js-2666009230b0](https://medium.com/@dipiash/supabase-realtime-postgres-changes-in-node-js-2666009230b0)  
23. Subscribing to Database Changes | Supabase Docs, truy cập vào tháng 5 20, 2026, [https://supabase.com/docs/guides/realtime/subscribing-to-database-changes](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes)

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABsAAAAaCAYAAABGiCfwAAABc0lEQVR4Xu2UTStEURjHH6G8JqUoNhSllCQkLyWyI8nOB7CShYVPYE2ykpKNKJspJCy8fAbZWCClFFYU8vI7PXO7dx7DOGY2an71qzvnf+aee+/znCOS5b/Thzf4EfEeb+PXL7iFDcEfMsEyvmK3Ga/BGD5gu8n+RCme4ClWmMxRiWe4i4Um86YR73AT80wWsCo6x81Ni2HR+kzYIIJb7AnbbODLgiSvV0AxHuAjtprMixI8lO/r5ajGC9GurUuM/PhNvQbwHbexwGRepKpXDi6KLjZqMm9S1atFdI8tYb7JvEi1v6rwWLQ5yiLjtbiGY9iFGzhv5nyhSfSpbb3cG4yINsW6JN7EfdZJHMRz7IyPu60xFEyK0oOXEp6Fb3iNV6Jn4rPoedghevMo7qHqRWu8Ipq7jt4TbaSM4xZwC43Hf7svdCTJS5E25bgv4QafwVnsx95gUqZoxh0JazmNczglaXZsMnKxyIy5I83WN0uWn/kEyKpHn+MvWoYAAAAASUVORK5CYII=>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAbCAYAAABIpm7EAAAA10lEQVR4Xu3RrQ9BURjH8bNhY/MS2EwQaDKaYmMjKJIiois2CknX/AMUTVA0RRU0xaYKApspvufec66zO0Ui+G2f3Z3nuffc8yLEP7+UMKpIqrEPOdQQ1y/pBDHFCCc0sUQbA1xQct4mFXSQxRVrRFQvgSN6amylhQzqeKBo9GT9jK5RczLBHjGj1sAdBaPm5KMPQthgAa+qyeccW/Hak5N3a00J+9SGCGCMqG7qDZu/lndwQx5l9I2eNctOGDOQNA5YYSZcy/IL+wLdkTcuD8Hjbvzz3TwBLFQieXz1O1wAAAAASUVORK5CYII=>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAmwAAAAxCAYAAABnGvUlAAAFYklEQVR4Xu3cW6htVRkH8BEaKGpi3jLKS2gieIuslzR6KFHUEBUV8gL6IIo+qKCYKIeih7Qkunl58FKIoCGKiiI+bFLoofDykA9SdApR6MEoSrpANf7MMc6ZZ5x907PXcQu/H3ysOcaac6115tpw/nxjzlUKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAbIiPjhMs3AG1PjJOAgAs56wisC3SwbWuq3VirYdn8zfWun42BgA20D61Xqj1mdncK7XemI0/SA/V+t84uYK9a108TlZn1vrObJz9/lN2T0fopFp/q7VnG+9R6x+17tu2x+ZwXK1/1frmMH9RrddqndrGx9R6vta+tR7oOzXH1/r0MAcAbICv1vrvMJf/jJdqHTTMb2YJX2OA6J4pOwbSOKfWVcPcIvywTOFw7vNlCm2LcOg4UX2yTEFxNVvK9J2nuoTML9Xa2rb73Nfb9qO1Lmzb3a+HMQCwAW4uKwe2Tw3zGynB4otlWr48t0whJg6s9ZW2HfkMp7ft+TFHlu3HRMLlb2fjua219hrmEtjGbtIiLJWdP1cPbIvo8CVEnTIb5z1+VNZeJv55mZY4fz+bS5gfA32+g6Pa9s9q7T97Lv44jAGADbC1TB2ouR4ociH5evym1p9WqeUkSCQgnNHGCU/fbvNZfkugigS2N9v2csdkKS+y/9ttezQG0kg37hvj5AJkOXfs5CUkr3eZ9/3IOUuw7WFtPW6pdUOtd9s4x36uTH8b8xC3lqVxAgDYdQkz8+u7IgFjkYGiy/Vpfdk1IeYLbTuBsQe2w8qOXZvxmN5ly/7LdXfSWVsuyKXr1cPeImU5tF//1SUE5bx/uUz/nkV4rtaPy9qdtS6dtJzD/r0nrCW0ba31iza3HkvjBACwa3qYGa/vSsi4aZhbzSFlClYr1UoSVrL8GvPwtVZgW+6YlQJbgsgYSHP87ripIoEwYadf/xXZ/kuZOmCxiMDWO2uHl+3vs5p8//lbyGP+Hq4o03mL5QLnapbGCQBg12RpcR5mcsfoX8v2rky6LGfXurtMweiJNr8R+vLmfm08Bra+jDgPbKsdk3D0VtvucjdoOk09kOb4dLd+t22P6bW2tOf+3B77z1Xc0x6/3x7PL9MF/D9t4y5dqUeGubxOOlzzsJM7QxPW5n5ZpuvAri3TeX627LiUmdeI/DvzfRzYKndkLueaWj+YjT9RVg9tOUcPtu1+7eKRbZzzNgbOtbyX5VMAYA2Xlilo/LtM15m9U+vvtY6d7ZPO2WfLFBZyZ+BTs+d2Vf5jz/vnPX/VtvNZ7mqPGT/Wnu/b82MuGY7pYaNLqOmvkyCW6+AyvqxMIaXLcb2b93R7nHe9csNDHyfIJmDNL+qPf5Ydg0q6Vf1z57zm/OYnM9K1/Nhsv+ivnXP8etvO5+mhcUute8sU4hKuL2jVP/PoW2XnZdA7an18mIt8znzGVL6DeKA9njB7LudvvcYbLACA3SAX5icsvFimrs54t+VmcnRZufO0knlg6x3EhKh09l6djXMejijTz1y81Oa7o2p9b5hbrwSznN90O/P7Zv09E87ynre2cbqJ2afflZlAtdkkJJ82TgIAi5dlvHi81u3zJzapdNvWK+HztjIFpfPK1BXL0uQfyhTiskR5Za2Xa323TJ2mY8p0IX7mu4S1r83G78X9ZQpj+fHik2s9WevqWne2x5+U6ceAE9DyW2rpNF5edv45jc0gXc+xuwcAsJNchzfeRMHipSO4yN/tAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD6s/g/QJt9qyqDVygAAAABJRU5ErkJggg==>

[image4]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAC0AAAAaCAYAAAAjZdWPAAACMElEQVR4Xu2WTahNURiGX6HIv0sIAwaKRDcXKQaKooRQMpAiTNQtkzu4GciVSCnJQJSflAEhlFBOlMJYyggppZABhfw8b9/aOXd1j2Pg2iftt546+/vWWftba7/rR6pU6f/WUngNP+p4B2/S7y9wHWYUf2glnYSvsDiLT4Gr8B4WZLlSNQLuwxMYl+WsCfAUbsLQLFeaZsJbuAiDslyhM4o2btsSWq3w7848UScX/Qnm54mydFR9+7nQMLgDH2FelitFw6Gmxn62JsNzxS4zvXeqHP2Jn5fBd7gBY+EsfFCJs97MzwPgmKLodSnm3cZ7d2lFN/Nzu2KPPgGDU8yWuqKSim62P0+Ee4pFOKou7qKvwW7FoXQOZqXceOiBQylXnKQe8FbYD6dgT4r7HUfgNOxTLPrfarZiFnM/+wVrFYvvgnoXbLnoW7AxPfvw8eD8VVbAsxRz/x5wm+KrHFfYbYxiwO7nMixJcRe9Sw3kRi/0667xDV7BS8Wd47PCswsVneXqyx7exz2LlgfdAdvhMUyCaYpJqEEnjFRY0u91uw1wUNFPv6hR0baDi30IyxX3lpqiaH/JqYoFb0v6PrNGMRDn+12Fp4vT0fcRP3t3cfFdKe49/QGsV1hpc4p7LZ2HOfAIFqW4+1mZfv91uWjvJodhU/p9QGELF+6Z3gLdcBsuwSrFwLYp/OycZ98F34UdsBfm6h9oNAzJYi7eh1D9ehiYnj3gvH2xON2mUqVKraqfORZvO1FOJnwAAAAASUVORK5CYII=>

[image5]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACkAAAAZCAYAAACsGgdbAAACSklEQVR4Xu2VT0hVQRjFj1igUIgoipCQEoaLoAgNw1pFGFKEGUkGIUKE20CxrbhpE6QYhBAuJMi2rgQzWhQELiJrJZIEkVCrAhG0znnfHZ079933IAVd3AM/3rtzZ+535s83H5Ap08HXcdITNka6Sc6TI6SE1JA75LTfiSont8kz8oicjL/OSePPkSdkgnSS0liPQM1kgMyTTTIVf53TIfKS/A2YIRVeP/2fIyOwyWgCn8kNr48MDpI3pIFUkWnYpA57/WKSyeuwVfqG/CalSfKJrJJXyD/7IfKBVHptveQLqY2ez5IfpH27B9BIvpIOry2v6mAd00yOwQKkScZkMBzfQn6Ta9HzKCyO4jkdJW/Jc9hKp2q3JrUjP5EcrzF/YObKyCySJnU0FpDchYSKmRwnj8ki7Fi8I2e8985MON5vd2bSTIbtCRUzqa0Yxs45VGb/Iq3R81VYMoXjfZMuRmhmz0zq3PiJcgy2oi9g2X8FxU0qeZaRNLNnJkO5/gqq4Pu+3X1ki9z32sKt0zXyHcnxzuRD2Irr+grNOJPKcO1YqgqZ1P2nrfRNuu1egAVxgZS9ymKnS2Qj+pX0Ld0Cug2cqskSrAIVlDOp278keNcGy26/Itwi64hXEyWTLvuG6FnfUfV5j53KdAI2Ob/8XiBrsDh5pRlqkEqiK3e6fD+SU1EfBXtAXpN+2Iy1Giqn/oQ0iadRP1UxGdQKhfW9i6yQe+QurHSG3/pv1cOCX0a8ZvtSoCbSTS4ivR6rZuvaEvqfKVOmTAdN/wCwpY+Q1EuhAgAAAABJRU5ErkJggg==>

[image6]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAaCAYAAACzdqxAAAABTUlEQVR4Xu2ULUsEURSGj2BQ0KKCQcNiM4pY/ACDRo3rD7CYLWrbYhBEMBtFLEYFEYN/wigYXDaJIGpQ/HjeOfeye/cDdwymeeBhhz2HM2feubtmBf/NLNbwO3iLI0lHyjJ+mvfq8xqHk44m9rGKDzjeVItowCk+4xn2puVWBvAYD/EVp9NyRg9u4A5+4WZabs8EHmHZ/BFX0nLGlPngbfzA+bTcnlXzTWbwzVq36ccKjuEF3uFoY0MnKriEk/iIu0nVbM28rsH3ljNfvTBtoW1OzDMVJdwyH6ThufPtM7/JTVDXGqahJW/NrnPnK7Slto0ZakPFIHTjP+UbUb7KeRH3zF+cUFQ6413nqwOvOCLKTydDA3TEIrnyncNzHGz4TmdYZ1nxxBco9CS/5ruAT1b/f3jH9VDTr+7K6r//A3wJfbH3EodCvaCgoBt+AHZzRnAvsxTcAAAAAElFTkSuQmCC>

[image7]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAZCAYAAAAv3j5gAAABNklEQVR4Xu2UsStGURiHX0kRUZRicZWUQSkWyvalDMqilNliYKP8KTaDsiuZzCbFqOQj/gMGg3h+zjk597h9X/dmQPepp777nvd+v9s5p9es5i+S4XpabME0ruEwdmAfLuJG3BSYwi08xzc8zC+3RB/1nviAM3FTQEGruICPVi5oBW+9F7iD/bmOAkbw3soH7aXFdvz6IPWfmdu+O9zEzrgppWqQLtGgf54wd8675m5hIVWCur0B/fmRubDxqJ6jSlARel/XfDldCJQNmsQnPMGeqB6CtK2FtAsawFH72vtZfLF8UNg61bVeSAhSY3qQQ3iFrzjvawpWb+afhX7r9h1gV1T/pGHu8DR+whh5xmtzs0xohp3iDY75mpjDS9zHbWzisbmP+HF6ccncGMvs+27U1PxnPgCbPkHDJSL7vwAAAABJRU5ErkJggg==>

[image8]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAC0AAAAaCAYAAAAjZdWPAAACCklEQVR4Xu2WT0gVURTGP6FAqdBFWJIouhBDF4ZlILoQJHChhOhKcCPRxp2UqyBoY5CLRKhEEReCCxVDhZIWpQs3Im7EpRZBEKQbE1L8832eO7zx8uy5UOYV84Mfb+aeO/PuPXPunQFiYv5v6ugPehhyk/50x7t0hpYEF6QTg3SP1njt+fQ93aJVXixSrtEFukqvezFxg67RDzTLi0XGbfqLjtNLXixgBNZHfdOCJlj9PvYDITToHXrPD0RFH5LXc8AV+on+ppVeLBKu0s84vZ7FLboB22WKT4ai4Sz1XE8P6CzN9GKRkKqeM2g/bNDNXiwyUtXzHdgePUAve7FISLU/36TzsEWY7dpUHk/oJG2hr+lHWksbYS+iV6H+92GJUb/nsEWdQ3tgidC9Sl1c5xXHV/2FclgW/XpWRh/CFt8YEgMI0GS/wAah8mmAvfbvuvNRJMrtLextKzpprztWv6d0iBbQdzTXxZKirHxF4ltjn36n32B//gf2vaEs6eY+wY6jzAptg+qvyQjt6d3uWGjSD+hLFwu3a3FP08JQ+4WQbNBTrl0Eg9aEu+gELYL1Dw9atMO20jKv/dw566Dz6IqLizYX069qW+X0iLbCMu6X4bmhhfgM9nacg22DyuS2a1fdrtMl2KTe0GHaQV/QZVhdq9Z1jdqrYSW5CFsfaYGeQPAUYmJi/lWOAPRHbackjaNtAAAAAElFTkSuQmCC>

[image9]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEMAAAAZCAYAAABq35PiAAACeUlEQVR4Xu2Xz6uPQRTGn2+6RVwSZXMtSH6UQtje7kJkQYqFsLNgoSRFWZEsKJu7uWXlJuUfsKLcshErCyyQkshCIjZKPI8z4zvva8b3pLGbTz31znnPeWbufGfmnQs0Go3Gv7GYOkldoy5Qa6lBJ8NYR12B5R2iFnRf/0IxvVOOclXjpaa/x+sPNlFz1BS1lDpGfaNOozsh+6mn1GZqEXWRukMtSXL0rJjeKUe5qlHtKGr6e7yyTFPfqb2hrQl5RH2gNoTYSuo5dTi0Rcw7kcTOhpjeRVTzjFqRxPrU9Pd6ZblK/aCOhvY4dZ/6DFs1QsZfqa2hLbRqbsJWlWY/djib5Ijt1BcMJztHTX+PV5Exajk1L7Q3Uh/RLdTq6XcgNLB31GrYKtJq6g9WNaq91Iun1PT3eLnQQaoZfA3bbxEZlTqI8Tio0mD78ZSa/h6vv7KQugWbhJfULgxXilbHHPJGaQd7YNtt1GD71PT3erlZT72lbsAmSbqLvFHawW6MHmyOmv5eLzcD2FZRx8dDrGSUxkt/dCmeUtPf45VFh+epID1H9AlLfwUdTjkjvX9DTcAOJh1QpcGe68VTavp7vLJEo36xCjUZOpmFPlu6i+z4nQHMp24H6Tnu19iOqEaXuLRWd4JlSbumv8crS7ygXMfwdqZBPoR9Xrf0YudDW6yBzfTBJHYEdgivCu0B7Pb3AEN/XZPfw2pjXk1/r1cWHUwvqMuwZM3epxBP2Ua9os5QB2AXINWk20vPM9Q9ah9soE/Q/UxrmT6GHXTp9biWv/B4FdHSmYIVTqJcpNN6J2wgWlU59GvpH71RXjlq+nu8Go1Go9Fo/B9+AhpZ92hCuc82AAAAAElFTkSuQmCC>