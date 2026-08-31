// confirmDelegate.ts — event delegation cho data-confirm (ADR-0002).
// Thay onclick="return confirm(...)" inline: gắn data-confirm="msg" lên button/form,
// tùy chọn data-confirm-set='{ "tenInput": "giaTri" }' để set hidden input trước khi submit.
// Lắng nghe 1 lần ở document (capture) — không cần init từng form.
import { uiConfirm } from "./dialogService";

async function handleClick(e: MouseEvent) {
  const target = e.target;
  if (!(target instanceof Element)) return;
  const holder = target.closest<HTMLElement>("[data-confirm]");
  if (!holder) return;
  const form = holder instanceof HTMLFormElement ? holder : holder.closest("form");
  if (!form) return;

  e.preventDefault();
  e.stopPropagation();

  const ok = await uiConfirm(holder.getAttribute("data-confirm") || "Bạn có chắc chắn?");
  if (!ok) return;

  const setter = holder.getAttribute("data-confirm-set");
  if (setter) {
    try {
      const map = JSON.parse(setter) as Record<string, string>;
      for (const [name, value] of Object.entries(map)) {
        let input = form.querySelector<HTMLInputElement>('input[name="' + name + '"]');
        if (!input) {
          input = document.createElement("input");
          input.type = "hidden";
          input.name = name;
          form.appendChild(input);
        }
        input.value = value;
      }
    } catch {
      // JSON hỏng: bỏ qua setter, vẫn submit
    }
  }

  // requestSubmit giữ đúng submitter (name/value của nút bấm) — không bị mất action=
  if (typeof form.requestSubmit === "function") {
    const submitter =
      holder instanceof HTMLButtonElement && (holder.type === "submit" || holder.getAttribute("type") === null)
        ? holder
        : undefined;
    form.requestSubmit(submitter);
  } else {
    form.submit();
  }
}

if (typeof document !== "undefined") {
  document.addEventListener("click", handleClick, true);
}
