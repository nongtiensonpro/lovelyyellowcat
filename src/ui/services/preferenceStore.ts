// preferenceStore.ts —单一 nguồn chân lý cho preference người dùng (ADR-0003, kế hoạch §3.5).
// SSR-safe: mọi truy cập browser đều qua hàm, không đọc window ở module scope.
// Đồng bộ giữa tab qua BroadcastChannel; schema versioned để migrate.

export type UiMode = "catalog" | "crt" | "access";
export type MotionPref = "system" | "on" | "off";
export type Density = "compact" | "cozy" | "touch";

export interface Preferences {
  /** catalog | crt | access — gắn data-ui-mode lên <html>, đổi semantic roles (ADR-0001). */
  uiMode: UiMode;
  /** Legacy flag tương thích vapor_crt_mode cũ — derive từ uiMode. */
  motion: MotionPref;
  sound: boolean;
  density: Density;
  /** 1.0 = mặc định; ACCESS mode gợi ý 1.15. */
  fontScale: number;
  /** Tôn trọng Save-Data: giảm ảnh/video/FX khi bật. */
  reducedData: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  uiMode: "catalog",
  motion: "system",
  sound: false,
  density: "compact",
  fontScale: 1.0,
  reducedData: false,
};

const STORAGE_KEY = "lyc_prefs_v1";
const CHANNEL_NAME = "lyc-prefs";
const SCHEMA = 1;

type Listener = (prefs: Preferences) => void;

let state: Preferences = { ...DEFAULT_PREFERENCES };
let hydrated = false;
const listeners = new Set<Listener>();
let channel: BroadcastChannel | null = null;

function safeParse(raw: string | null): Partial<Preferences> | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as { schema?: number; prefs?: Partial<Preferences> };
    if (data.schema !== SCHEMA || !data.prefs) return null;
    // Chỉ nhận key hợp lệ, bỏ key lạ
    const out: Partial<Preferences> = {};
    const P = DEFAULT_PREFERENCES as unknown as Record<string, unknown>;
    const incoming = data.prefs as unknown as Record<string, unknown>;
    for (const k of Object.keys(P)) {
      if (incoming[k] !== undefined && typeof incoming[k] === typeof P[k]) {
        (out as Record<string, unknown>)[k] = incoming[k];
      }
    }
    return out;
  } catch {
    return null;
  }
}

function migrateLegacy(rawLegacy: string | null): Partial<Preferences> | null {
  // vapor_crt_mode = "disabled" (legacy BaseLayout/AdminLayout) => uiMode catalog
  if (rawLegacy === null) return null;
  return { uiMode: rawLegacy === "disabled" ? "catalog" : "crt" };
}

/** Đọc từ localStorage (1 lần) + mở BroadcastChannel. Gọi ở client đầu tiên. */
export function hydratePreferences(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = safeParse(raw);
    if (parsed) {
      state = { ...DEFAULT_PREFERENCES, ...parsed };
      rebuildSnapshot();
    } else {
      // Thử migrate legacy key của shell cũ
      const legacy = migrateLegacy(window.localStorage.getItem("vapor_crt_mode"));
      if (legacy) {
        state = { ...DEFAULT_PREFERENCES, ...legacy };
        rebuildSnapshot();
        persist();
      }
    }
  } catch {
    // localStorage bị chặn (private mode) — dùng default
  }
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (ev: MessageEvent) => {
      const incoming = ev.data as Preferences | null;
      if (incoming && typeof incoming === "object" && "uiMode" in incoming) {
        state = { ...state, ...incoming };
        rebuildSnapshot();
        emit();
      }
    };
  } catch {
    channel = null; // BroadcastChannel không có (cũ Safari) — vẫn hoạt động 1 tab
  }
}

function persist(): void {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ schema: SCHEMA, prefs: state })
    );
  } catch {
    // ignore — private mode
  }
}

function emit(): void {
  for (const l of listeners) l({ ...state });
}

// Snapshot cache: useSyncExternalStore so sánh bằng Object.is — nếu getSnapshot
// tạo object mới mỗi lần gọi thì component re-render vô hạn (React error #185).
// Chỉ tạo snapshot mới khi state THẬT SỰ đổi (trong setPreferences/migrate).
let snapshotCache: Preferences = { ...DEFAULT_PREFERENCES };

function rebuildSnapshot(): void {
  snapshotCache = { ...state };
}

export function getPreferences(): Preferences {
  if (!hydrated) hydratePreferences();
  return snapshotCache;
}

export function setPreferences(patch: Partial<Preferences>): Preferences {
  state = { ...state, ...patch };
  rebuildSnapshot();
  persist();
  emit();
  try {
    channel?.postMessage({ ...state });
  } catch {
    // ignore
  }
  return { ...state };
}

export function subscribePreferences(listener: Listener): () => void {
  listeners.add(listener);
  listener(getPreferences());
  return () => {
    listeners.delete(listener);
  };
}

/** Helper chọn mode — CRT là "identity", ACCESS là a11y escape hatch. */
export function setUiMode(mode: UiMode): Preferences {
  const patch: Partial<Preferences> = { uiMode: mode };
  if (mode === "access") {
    patch.motion = "off";
    patch.sound = false;
    patch.fontScale = Math.max(state.fontScale, 1.15);
  }
  return setPreferences(patch);
}

export const PREF_STORAGE_KEY = STORAGE_KEY;
