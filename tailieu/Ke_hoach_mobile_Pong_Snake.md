# Kế hoạch: Hỗ trợ Vapor Pong và Neon Snake trên Mobile

> **Trạng thái:** Kế hoạch chi tiết, chưa triển khai mã nguồn.
>
> **Mục tiêu:** Hai game `PONG.SYS` và `SNAKE.EXE` phải chơi được trên điện thoại/tablet chỉ với chạm màn hình, không bắt buộc có bàn phím hoặc chuột; người dùng vẫn có thể chơi bằng bàn phím/chuột trên desktop.

## 1. Mục tiêu và phạm vi

### Kết quả người dùng mong đợi

- Mở game từ hai thẻ `ARCADE.SYS` ở trang chủ như hiện tại.
- Trên mobile, người dùng thấy ngay cách chơi bằng các nút cảm ứng, không phải tự suy luận rằng phải dùng bàn phím.
- **Vapor Pong:** kéo ngón tay theo chiều dọc trong vùng chơi để di chuyển paddle; bổ sung hai nút `▲`/`▼` lớn để người dùng không muốn kéo cũng chơi được.
- **Neon Snake:** có D-pad 4 nút `▲ ▼ ◀ ▶` rõ ràng; không bắt buộc vuốt, không cần dùng bàn phím. Có nút `Chơi lại` khi game over.
- Cả hai game có nút `Tạm dừng/Tiếp tục` và nút `Đóng` bằng chạm.
- Không để thao tác chơi làm trang bị bị cuộn hoặc zoom ngoài ý muốn.
- Điểm cao nhất vẫn lưu bằng `localStorage` như hiện tại.

### Không nằm trong phạm vi

- Không thay đổi luật chơi, thuật toán CPU, tốc độ bóng, kích thước lưới Snake hoặc cơ chế lưu BEST.
- Không thêm thư viện gesture/UI mới; dùng Pointer Events, CSS và code hiện có.
- Không bắt buộc dùng Web Fullscreen API; overlay `position: fixed` hiện tại đủ để chơi và giảm rủi ro trên iOS.
- Không thêm chế độ chơi bằng cảm ứng khác biệt cho từng game; D-pad/kéo là hai lớp input cùng một logic game.

## 2. Hiện trạng đã kiểm tra

- `src/pages/index.astro` đã render `<GameDock />` ngay sau hero, nên không cần thay đổi trang chủ.
- Hai game và logic thuần nằm ở:
  - `src/lib/games/pongCore.ts`
  - `src/lib/games/snakeCore.ts`
- Markup, overlay, canvas, render và input hiện tại tập trung trong `src/components/games/GameDock.astro`.
- CSS arcade nằm ở khoảng dòng 1429–1532 trong `src/styles/global.css`; hiện có media query mobile nhưng mới chỉ thu gọn thẻ game, chưa có control cảm ứng.
- Pong hiện dùng:
  - `ArrowUp`/`ArrowDown` qua `document keydown/keyup`;
  - `mousemove` trên canvas, đưa tọa độ client vào `PongInput.mouseY`.
- Snake hiện dùng:
  - `Arrow` và `WASD` qua `document keydown`;
  - `Space` để chơi lại khi game over.
- Overlay hiện có nút `✕` và nút `ESC — THOÁT`, nhưng đây là điều khiển không thuận tiện hoặc không thấy được trên mobile.
- Vòng lặp hiện đã có `visibilitychange` để dừng `requestAnimationFrame` khi tab bị ẩn; phần pause/resume cần tách rõ khỏi trạng thái game.
- Canvas giữ tỷ lệ 16:9 (`960×540`), D-pad không được làm thay đổi tỷ lệ này để tránh phá layout và gameplay hiện tại.

### Điểm cần xử lý khi triển khai

`pongMouseY` hiện được khởi tạo bằng `240` ngay khi mở game. Vì input Pong ưu tiên `mouseY` khi khác `null`, điều này có thể khiến phím mũi tên không có tác dụng ngay cả trên desktop. Khi tách input pointer/touch nên đổi trạng thái ban đầu thành `null`; chỉ ghi tọa độ sau khi người dùng thực sự chạm/kéo trên canvas. Đây là sửa input lifecycle, không thay đổi physics.

## 3. Thiết kế trải nghiệm mobile đề xuất

### 3.1. Bố cục chung của overlay

Giữ nguyên kiến trúc overlay hiện tại, bổ sung các lớp sau theo thứ tự từ trên xuống:

1. Header Win95: tên file game và nút `✕` có vùng chạm tối thiểu 44×44 px.
2. Canvas 16:9, luôn nằm trong khung không bị tràn ngang.
3. Hướng dẫn ngắn, tương thích desktop/mobile, ví dụ:
   - Pong: `KÉO VÙNG CHƠI ĐỂ DI CHUYỂN PADDLE · HOẶC DÙNG ▲ ▼`
   - Snake: `CHẠM D-PAD ĐỂ ĐIỀU KHIỂN RẮN`
4. Control cảm ứng:
   - Pong: hai nút dọc `▲` và `▼`.
   - Snake: D-pad 3×3 với nút giữa trống hoặc có nhãn trạng thái.
5. HUD: `SCORE`, `BEST`, `TẠM DỪNG`, `CHƠI LẠI` (Snake), `ĐÓNG`.

Trên desktop có thể ẩn D-pad bằng media query `(pointer: fine)`; trên mobile/tablet có `pointer: coarse` thì luôn hiện control cảm ứng. Không dựa vào User-Agent.

### 3.2. Vapor Pong

**Điều khiển chính:**

- Chạm/giữ bất kỳ vị trí nào trong canvas: paddle trái bám theo trục Y của con trỏ.
- Kéo lên/xuống: paddle di chuyển tương ứng.
- Dùng nút `▲`/`▼` giữ để di chuyển liên tục; thả ngón tay dừng.
- Cho phép cả pointer đồng thời với bàn phím; input con trỏ chỉ có hiệu lực khi đang có pointer active, còn bàn phím dùng khi không có pointer active.

**Vùng cảm ứng:**

- `canvas` đặt `touch-action: none` chỉ trong vùng game.
- Dùng `pointerdown`, `pointermove`, `pointerup`, `pointercancel`, `lostpointercapture`.
- Chỉ theo dõi một `pointerId` tại một thời điểm để tránh hai ngón tay làm paddle nhảy.
- `setPointerCapture` giúp tiếp tục nhận `pointermove` khi ngón tay rời mép canvas.
- `preventDefault` trên thao tác chơi để không kích hoạt cuộn trang hoặc thao tác zoom của trình duyệt.
- Map `clientY` sang toạ độ game 540 px bằng `getBoundingClientRect()`, sau đó clamp trong khoảng hợp lệ trước khi đưa vào `PongInput`.

**Nút giữ:**

- `pointerdown` trên `▲` đặt trạng thái đi lên.
- `pointerdown` trên `▼` đặt trạng thái đi xuống.
- `pointerup`, `pointercancel`, `pointerleave` hoặc mất capture xoá trạng thái tương ứng.
- Có fallback `click` cho trình duyệt/kích hoạt bằng assistive technology; tránh xử lý trùng bằng cách chỉ dùng click cho một lần nhấn, còn pointer events dùng cho hold.

**Hiển thị:**

- Thêm nhãn trực quan `KÉO ĐỂ CHƠI` ở vùng hướng dẫn, không chỉ dựa vào màu sắc.
- Nút `Tạm dừng` phải có trạng thái `aria-pressed="true|false"` và text đổi giữa `TẠM DỪNG`/`TIẾP TỤC`.

### 3.3. Neon Snake

**D-pad là control bắt buộc ở MVP:**

```text
        [ ▲ ]
[ ◀ ]  [ · ]  [ ▶ ]
        [ ▼ ]
```

- Mỗi nút dùng `button type="button"`, có `data-snake-dir="up|down|left|right"` và `aria-label` tiếng Việt.
- Vùng chạm tối thiểu 56×56 px trên mobile, khoảng cách giữa các nút tối thiểu 8 px để tránh chạm nhầm.
- `pointerdown` ưu tiên để phản hồi ngay, đồng thời có fallback `click` cho keyboard/assistive technology.
- Khi nhấn nút, gọi `snakeQueueDir(...)`; không tự viết lại luật chặn quay đầu 180°.
- Không bắt buộc bắt đầu game bằng nút riêng; nên bổ sung nút `Chơi lại` ở HUD, và có thể hiện nút này luôn hoặc chỉ hiện khi `snake.over`.
- Khi game over, thay chữ trên canvas không còn phụ thuộc `SPACE` thành `GAME OVER — CHƠI LẠI`; nút `CHƠI LẠI` trong HUD là hành động chính.

**Vuốt trên canvas (không bắt buộc ở MVP):**

- Không đưa swipe vào tiêu chí nghiệm thu đầu tiên để tránh nhầm hướng, chạm nhầm khi vừa game over hoặc xung đột với D-pad.
- Có thể thêm ở giai đoạn sau nếu kiểm thử trên iOS/Android cho thấy người dùng thích swipe: chỉ nhận `pointerdown → pointerup`, xác định hướng theo delta lớn hơn ngưỡng, không ngăn D-pad hoạt động.

### 3.4. Pause, visibility và vòng đời

- Thêm state `paused` riêng cho từng lần mở game; không suy luận pause từ việc overlay bị ẩn.
- `visibilitychange` vẫn dừng rAF khi tab ẩn như hiện tại. Khi tab hiện lại:
  - nếu người dùng đang pause thì game vẫn pause;
  - nếu không pause thì tiếp tục từ state hiện tại, không nhân đôi vòng lặp.
- Đóng game phải hủy rAF, bỏ toàn bộ listener pointer/keyboard/visibility và giải phóng pointer capture.
- Mở lại game phải tạo state mới như hiện tại, không giữ pointer cũ, không giữ nút hold bị kẹt.
- Nút `Tạm dừng` không được làm mất focus hoàn toàn; sau khi bấm, focus vẫn ở nút hoặc chuyển sang nút `Tiếp tục` có nhãn rõ ràng.

## 4. Kiến trúc kỹ thuật đề xuất

### Thay đổi file

| File | Thay đổi dự kiến |
|---|---|
| `src/components/games/GameDock.astro` | Thêm markup control cảm ứng, nút pause/restart, hướng dẫn; nối Pointer Events; cập nhật cleanup và trạng thái pause. |
| `src/lib/games/pongCore.ts` | Làm rõ input pointer; nếu đổi `mouseY` thành `pointerY`, cập nhật mọi call site và test. Không thay đổi physics. |
| `src/lib/games/snakeCore.ts` | Giữ nguyên `queueDir` và luật game; chỉ dùng lại hàm này cho D-pad. Nếu cần chuẩn hoá tên hướng thì đổi cả hai cùng một commit. |
| `src/lib/games/mobileInput.ts` | Tạo module thuần để map client Y của canvas về toạ độ Pong và chuẩn hoá input D-pad; giúp test logic không phụ thuộc layout thực tế. |
| `src/styles/global.css` | Thêm layout responsive cho overlay, control cảm ứng, safe-area, `dvh`, touch-action và reduced-motion. |
| `tests/unit/gamesPong.test.ts` | Bổ sung test input pointer/keyboard và edge case khi map toạ độ. |
| `tests/unit/gamesSnake.test.ts` | Bổ sung regression test D-pad vẫn dùng đúng queue/chặn quay đầu nếu có helper mapping. |
| `tests/unit/gamesMobileControls.test.ts` | Tạo nếu có `mobileInput.ts`; test mapping, clamp, hướng hợp lệ và input không phụ thuộc DOM. |
| `src/pages/index.astro` | Không cần sửa logic; chỉ sửa nếu kiểm thử phát hiện component không nằm đúng vị trí mobile hoặc cần thêm metadata viewport ở layout chung. |

### Quyết định về input Pong

Ưu tiên đổi tên `PongInput.mouseY` thành `PongInput.pointerY` để phản ánh đúng việc dùng cho cả chuột, touch và pen. Nếu muốn giảm phạm vi migration, có thể giữ tên cũ trong giai đoạn đầu, nhưng kế hoạch chuẩn là đổi tên và cập nhật đồng bộ:

- `GameDock.astro`: tạo input với `pointerY: null` lúc mở.
- `pongCore.ts`: dùng `input.pointerY` thay cho `input.mouseY`.
- `tests/unit/gamesPong.test.ts`: đổi case hiện tại thành pointer test và thêm case không pointer thì phím vẫn di chuyển.

Không đưa DOM event listener vào `pongCore.ts`/`snakeCore.ts`; các core tiếp tục là pure logic để test nhanh và giữ nguyên nguyên tắc đã có.

### Vòng đời event cần audit

Mỗi listener thêm vào `GameDock.astro` phải có hàm remove tương ứng trong `cleanups[id]`:

- `keydown`, `keyup`, `visibilitychange`;
- `pointerdown`, `pointermove`, `pointerup`, `pointercancel`, `lostpointercapture`;
- listener của D-pad/nút pause/restart;
- `IntersectionObserver` chỉ thuộc attract mode và phải được tách khỏi cleanup của game đang mở.

Không dùng `onclick = ...` rời rạc nếu đã có `addEventListener`; cleanup phải xoá đúng function reference. Đây là điểm dễ gây memory leak hoặc nhiều handler sau khi mở/đóng game nhiều lần.

## 5. Kế hoạch triển khai theo TDD

### Task 1 — Chốt baseline và test input thuần

**Mục tiêu:** Không thay đổi gameplay, trước tiên làm rõ input pointer và tạo test cho mapping mobile.

**Files:**

- Modify: `src/lib/games/pongCore.ts`
- Create: `src/lib/games/mobileInput.ts`
- Modify: `tests/unit/gamesPong.test.ts`
- Create: `tests/unit/gamesMobileControls.test.ts`

**Các bước:**

1. Viết test fail cho `mapPointerYToPong(clientY, rect)`:
   - clientY trên rect trả về giá trị hợp lệ;
   - clientY dưới rect vẫn clamp về biên;
   - rect có chiều cao 0 không làm phép chia bằng 0/NaN.
2. Viết test fail cho `PongInput.pointerY = null` khiến `ArrowUp`/`ArrowDown` điều khiển paddle.
3. Chạy test targeted, xác nhận fail do symbol/behavior chưa tồn tại.
4. Thêm helper thuần và đổi tên input trong core + call site test.
5. Chạy lại test targeted, sau đó toàn bộ `tests/unit/gamesPong.test.ts` và `tests/unit/gamesSnake.test.ts`.

**Tiêu chí hoàn thành:** Physics cũ giữ nguyên; input pointer không ưu tiên khi người dùng chưa chạm; không có test phụ thuộc trình duyệt thật.

### Task 2 — Thêm markup control cảm ứng

**Mục tiêu:** Render đủ control mà chưa nối event.

**File:** Modify `src/components/games/GameDock.astro`.

Markup cần có:

- `.arcade-instructions` với nội dung riêng theo `id` game;
- `.arcade-touch-controls` cho từng game;
- Pong: hai button `data-pong-control="up|down"`;
- Snake: bốn button `data-snake-dir`;
- Nút pause dùng chung `data-arcade-pause`;
- Nút `Chơi lại` dùng riêng cho Snake `data-arcade-restart="snake"`;
- Nút đóng đã có nhưng phải dùng chung handler và có `aria-label`.

Mọi control phải là button thật, có `type="button"`, không dùng `div` giả button. Không đưa icon alone thành nhãn duy nhất; luôn có `aria-label` hoặc text ẩn kiểu `.sr-only` theo convention hiện có.

### Task 3 — Nối Pointer Events cho Pong

**Mục tiêu:** Chơi Pong bằng kéo canvas và nút hold.

**File:** Modify `src/components/games/GameDock.astro`.

Các bước:

1. Tạo state cục bộ: `pongPointerId`, `pongPointerY`, `pongUp`, `pongDown`.
2. Khi `pointerdown` trên canvas:
   - bỏ qua pointer thứ hai nếu đang có pointer active;
   - `setPointerCapture`;
   - cập nhật `pointerY` bằng helper thuần.
3. Khi `pointermove` có đúng `pointerId`, cập nhật `pointerY`.
4. Khi `pointerup/cancel/lostpointercapture`, giải phóng capture và đặt `pongPointerId = null`, `pongPointerY = null` nếu không còn input nào.
5. Với nút `▲/▼`, dùng pointer down/up/cancel để giữ trạng thái; thêm fallback click mà không làm phát sinh input trùng.
6. Không để pointer Y cũ làm mất keyboard input: khi không có pointer active, truyền `pointerY: null`.
7. Chạy lint/typecheck targeted sau mỗi patch nhỏ.

### Task 4 — Nối D-pad cho Snake và nút chơi lại

**Mục tiêu:** Chơi Snake hoàn toàn bằng chạm.

**File:** Modify `src/components/games/GameDock.astro`.

Các bước:

1. Nối `pointerdown`/`click` của từng nút vào `snakeQueueDir(snake, dir)`.
2. Không tạo queue direction mới trong DOM handler; để `snakeCore` giữ quy tắc chống quay 180°.
3. Nối nút `Chơi lại` với `snake = snakeInit()`, reset điểm hiển thị và các trạng thái liên quan.
4. Cập nhật text game-over trong `renderSnake` thành `GAME OVER — CHƠI LẠI` hoặc text không yêu cầu `SPACE`.
5. Đồng bộ visibility của nút restart bằng `snake.over`; không phụ thuộc vào việc người dùng nhìn thấy text trên canvas.

### Task 5 — Pause dùng được bằng touch

**Mục tiêu:** Người dùng mobile không cần phím Escape/Space để dừng hoặc tiếp tục.

**File:** Modify `src/components/games/GameDock.astro`.

Các bước:

1. Thêm `paused = false` trong closure của mỗi game.
2. Nút pause toggle state và text/`aria-pressed`.
3. Khi paused, vòng lặp không gọi `step`; vẫn được phép render state hiện tại hoặc dừng rAF hoàn toàn, nhưng phải chọn một nhánh và bảo đảm resume không tạo nhiều loop.
4. Khi `visibilitychange`, không ghi đè trạng thái pause của người dùng.
5. Đóng/mở lại game phải pause=false và cập nhật text nút về trạng thái ban đầu.

Khuyến nghị implementation: giữ một rAF duy nhất, trong loop bỏ qua bước mô phỏng khi paused; render có thể chạy để giữ hiệu ứng nhẹ, hoặc nếu tiết kiệm pin là dừng render và chỉ render lại khi toggle. Không được khởi tạo thêm loop trong nút pause.

### Task 6 — CSS layout mobile và safe-area

**Mục tiêu:** Control không bị chồng, nhỏ hoặc làm tràn màn hình.

**File:** Modify `src/styles/global.css`, quanh khối `ARCADE.SYS`.

Các yêu cầu:

```css
.arcade-overlay {
  padding-top: max(8px, env(safe-area-inset-top));
  padding-right: max(8px, env(safe-area-inset-right));
  padding-bottom: max(8px, env(safe-area-inset-bottom));
  padding-left: max(8px, env(safe-area-inset-left));
  overflow-y: auto;
  overscroll-behavior: contain;
}

.arcade-window {
  width: min(100%, 1280px);
  max-height: calc(100dvh - 16px);
  display: flex;
  flex-direction: column;
}

.arcade-canvas-wrap {
  min-height: 0;
  padding: clamp(4px, 1vw, 8px);
}

.arcade-canvas {
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.arcade-touch-controls {
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
}
```

- Dùng `@media (pointer: coarse), (width <= 640px)` để hiện control cảm ứng.
- Dùng kích thước nút tối thiểu 44 px theo khuyến nghị accessibility; D-pad nên 56–64 px.
- `flex-wrap` cho HUD để `SCORE`, `BEST`, `TẠM DỪNG`, `CHƠI LẠI`, `ĐÓNG` không đè lên nhau trên màn hàng hẹp.
- Dùng `dvh`/`svh` fallback hợp lý để tránh bị toolbar trình duyệt che; không dùng chiều cao cố định 540 px cho layout mobile.
- Giữ canvas ở tỷ lệ 16:9 và cho phép nó thu nhỏ; không ép chiều cao canvas bằng CSS rời khỏi tỷ lệ.
- `@media (prefers-reduced-motion: reduce)`: tắt transition/hover movement của card; các animation game chỉ chạy sau thao tác người dùng như hiện tại.
- Không thêm `height: 100vh` cứng cho overlay vì có thể bị cắt bởi thanh địa chỉ mobile.

### Task 7 — A11y và trạng thái HUD

**Mục tiêu:** Người dùng không nhìn thấy rõ hoặc dùng switch control vẫn thao tác được.

Các bước:

1. Giữ `role="dialog"`, `aria-modal="true"` và `aria-label` của overlay.
2. Header/close button phải là focus target rõ ràng.
3. Pause dùng `aria-pressed`; restart không dùng trạng thái pressed vì đây là action một lần.
4. Status score dùng text rõ ràng; có thể thêm `aria-live="polite"` cho score/best nhưng không phát âm thanh mỗi frame.
5. Kiểm tra focus khi mở/đóng và khi game over; không để focus rơi về body.
6. Kiểm tra các nút không nằm chồng lên nhau bằng bounding box thực tế ở viewport 320×568, 375×667, 390×844 và landscape.

### Task 8 — Tách attract mode khỏi input game

**Mục tiêu:** Không để control mobile hoặc pause làm attract canvas chạy sai.

**File:** Modify `src/components/games/GameDock.astro`.

- Attract canvas tiếp tục chạy bằng rAF riêng và chỉ render khi card vào viewport.
- Pointer/touch listener chỉ gắn cho canvas overlay `[data-arcade-canvas]`, không gắn cho `[data-attract]`.
- Khi overlay đang mở, có thể tạm dừng attract mode để tiết kiệm pin; khi đóng overlay, khôi phục attract mode nếu card còn trong viewport.
- Không dùng chung state `paused` của game với state visibility của attract mode.

### Task 9 — Kiểm thử tích hợp và hồi quy

**Mục tiểu:** Chứng minh mobile thật sự chơi được, không chỉ build xanh.

#### Test tự động

Chạy bằng Node 24 trên máy Windows theo convention của project:

```bash
"C:/Program Files/nodejs/node.exe" "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js" test
"C:/Program Files/nodejs/node.exe" "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js" run typecheck
"C:/Program Files/nodejs/node.exe" "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js" run lint
"C:/Program Files/nodejs/node.exe" "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js" run stylelint
"C:/Program Files/nodejs/node.exe" "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js" run build
```

- Tất cả test game cũ phải pass.
- Test mới phải chứng minh mapping touch và input fallback.
- Kiểm tra output build có đủ markup control và script xử lý event; Astro có thể inline page script nên không chỉ grep tên hàm trong client chunk.
- Kiểm tra không phát sinh lỗi console/runtime khi mở và đóng cả hai game nhiều lần.

#### Test mobile thực tế

Test tối thiểu trên viewport 360×800 và 390×844, sau đó một thiết bị thật hoặc DevTools mobile emulation:

1. Mở Pong từ card.
2. Kéo paddle lên rồi xuống; xác nhận canvas không cuộn trang.
3. Nhấn giữ `▲`, `▼`; thả nút và xác nhận paddle dừng.
4. Dùng bàn phím sau khi ngừng pointer; xác nhận phím vẫn hoạt động nếu hỗ trợ.
5. Pause bằng touch, đợi vài giây, resume; bóng không tự chạy trong lúc pause.
6. Đóng bằng `✕`, `ĐÓNG` và Escape nếu có bàn phím.
7. Mở Snake.
8. Chạm lần lượt D-pad, kiểm tra không quay đầu 180°.
9. Cho rắn chạm tường, xác nhận nút `Chơi lại` hoạt động bằng touch.
10. Xoay màn hình hoặc kiểm tra landscape; canvas/control vẫn nằm trong viewport và không che nút.
11. Mở/đóng game 10 lần; kiểm tra không tăng số listener/rAF rõ ràng và không còn input bị kẹt.
12. Bật `prefers-reduced-motion`; control và gameplay vẫn dùng được.

## 6. Ma trận nghiệm thu

| Hạng mục | Đạt khi |
|---|---|
| Pong touch | Kéo trong canvas và dùng `▲/▼` đều di chuyển paddle theo chiều dọc. |
| Snake touch | D-pad điều khiển đủ 4 hướng, không cần bàn phím. |
| Game over | Có nút chơi lại bằng touch; không còn phụ thuộc `Space`. |
| Pause | Nút touch dừng và tiếp tục game; visibility pause không làm mất trạng thái người dùng. |
| Layout | Không tràn ngang ở 320px; nút không quá nhỏ; portrait/landscape đều dùng được. |
| Scroll | Chạm/kéo trong game không làm trang cuộn hoặc zoom ngoài ý muốn. |
| Desktop | Chuột và bàn phím cũ vẫn hoạt động; không regression với localStorage BEST. |
| A11y | Button semantics, labels, focus, Escape và dialog attributes hợp lệ. |
| Hiệu năng | Không tạo thêm vòng lặp khi pause/mở lại; cleanup listener đầy đủ. |
| Quality gates | Test, typecheck, lint, stylelint, build đều pass. |

## 7. Rủi ro và phương án xử lý

### Pointer event đồng thời

Rủi ro: một ngón tay kéo canvas, ngón tay khác bấm nút làm input chồng lấn.

Phương án: chỉ nhận một `pointerId` cho drag; nút dùng state hold riêng nhưng khi pointer drag đang active thì ưu tiên drag theo quy tắc đã chọn, hoặc bỏ qua input thứ hai. Kiểm thử cả hai chiều trước khi chốt.

### iOS Safari và vùng safe-area

Rủi ro: `100vh` bị tính sai và nút cuối bị toolbar che.

Phương án: dùng padding `env(safe-area-inset-*)`, `100dvh` với fallback, overlay overflow và test viewport thật.

### Nút quá lớn làm game hẹp

Rủi ro: D-pad chiếm nhiều chiều cao, đặc biệt trên màn hình ngắn.

Phương án: ưu tiên kích thước tối thiểu 56px, giảm khoảng đệm/header ở `(max-height: 700px)`, cho phép overlay cuộn nếu thật sự cần; không cắt canvas hoặc nút chơi lại.

### Tương thích game desktop

Rủi ro: `pointerY` luôn khác null khiến phím mũi tên bị bỏ qua.

Phương án: triển khai regression test “chưa có pointer thì phím hoạt động” trước khi nối UI.

### Code hiện tại tập trung trong một file

Rủi ro: `GameDock.astro` đang chứa cả render lẫn attract mode; thêm event làm tăng nguy cơ lifecycle bug.

Phương án: giữ phạm vi MVP trong file hiện tại nhưng chỉ đưa phép tính mapping thuần ra `mobileInput.ts`. Không refactor toàn bộ render/attract trong cùng feature; nếu file vượt quá ngân sách bảo trì, tách controller/input thành module riêng ở task sau, có test riêng.

## 8. Thứ tự commit đề xuất

Mỗi commit phải build/test được, không để feature sống trên working tree chưa commit:

```text
feat(games): add pure mobile input mapping and regression tests
feat(games): add touch control markup and pointer wiring
feat(games): add mobile pause restart and game-over actions
feat(games): make arcade overlay safe-area responsive
feat(games): verify mobile touch gameplay and cleanup
```

Trước khi commit, chạy toàn bộ quality gate và cập nhật `CHANGELOG.md` nếu thay đổi hành vi người dùng được chào mừng. Không sửa luật chơi hoặc số liệu BEST trong feature mobile này.
