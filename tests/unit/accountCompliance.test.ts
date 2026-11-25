// tests/unit/accountCompliance.test.ts — Unit tests cho Sprint 2-5 compliance endpoints
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUser, mockCreateClient, mockDeleteCloudinary, mockSendDeletedEmail } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockCreateClient: vi.fn(),
  mockDeleteCloudinary: vi.fn(),
  mockSendDeletedEmail: vi.fn(),
}));

vi.mock("cloudflare:workers", () => ({
  env: {
    RECAPTCHA_SECRET_KEY: "test-secret",
  },
}));

vi.mock("../../src/lib/supabase", () => ({
  createSupabaseServerClient: mockCreateClient,
}));

vi.mock("../../src/lib/cloudinary", () => ({
  deleteCloudinaryImages: mockDeleteCloudinary,
}));

vi.mock("../../src/lib/emailNotification", () => ({
  sendAccountDeletedEmail: mockSendDeletedEmail,
}));

import { GET as exportAccount } from "../../src/pages/api/account/export";
import { POST as deleteAccount } from "../../src/pages/api/account/delete";
import { POST as submitArtwork } from "../../src/pages/api/submissions";
import { GET as listAiSessions } from "../../src/pages/api/ai/sessions";

function createQueryChain(resolved: { data?: unknown; error?: unknown; count?: number | null }) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "eq", "in", "gte", "lt", "order", "range", "delete", "insert", "update"];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  chain.single = vi.fn(async () => resolved);
  chain.maybeSingle = vi.fn(async () => resolved);
  chain.then = (resolve: (v: unknown) => void) => Promise.resolve(resolved).then(resolve);
  return chain;
}

describe("Account Compliance APIs (Luật 91/2025 & NĐ 142/2026)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteCloudinary.mockResolvedValue({ attempted: 1, deleted: 1, skipped: 0, errors: [] });
    mockSendDeletedEmail.mockResolvedValue({ success: true, message: "sent" });
  });

  it("GET /api/account/export trả về 401 khi chưa đăng nhập", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockCreateClient.mockReturnValue({ auth: { getUser: mockGetUser } });

    const res = await exportAccount({
      request: new Request("https://x.test/api/account/export"),
      cookies: {} as never,
    } as never);
    expect(res.status).toBe(401);
  });

  it("GET /api/account/export xuất JSON đầy đủ với header attachment", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-12345678", email: "cat@example.com", created_at: "2026-01-01" } },
      error: null,
    });
    mockCreateClient.mockReturnValue({
      auth: { getUser: mockGetUser },
      from: vi.fn((table: string) => {
        if (table === "ai_sessions") {
          return createQueryChain({ data: [{ id: "sess-1", title: "enc", created_at: "2026-06-01", updated_at: "2026-06-01" }], error: null });
        }
        if (table === "profiles") {
          return createQueryChain({ data: { id: "user-12345678", full_name: "Mèo Vàng" }, error: null });
        }
        return createQueryChain({ data: [], error: null });
      }),
    });

    const res = await exportAccount({
      request: new Request("https://x.test/api/account/export"),
      cookies: {} as never,
    } as never);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toContain("lyc-data-export-user-123");
    const json = await res.json();
    expect(json._export_metadata.legal_basis).toContain("91/2025/QH15");
    expect(json.profile.full_name).toBe("Mèo Vàng");
    expect(json.ai_encrypted_workspace.sessions).toHaveLength(1);
  });

  it("POST /api/account/delete từ chối nếu thiếu chuỗi xác nhận 'XOA TAI KHOAN'", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1", email: "a@b.c" } }, error: null });
    mockCreateClient.mockReturnValue({ auth: { getUser: mockGetUser } });

    const res = await deleteAccount({
      request: new Request("https://x.test/api/account/delete", {
        method: "POST",
        body: JSON.stringify({ confirmation: "wrong" }),
      }),
      cookies: {} as never,
    } as never);

    expect(res.status).toBe(400);
  });

  it("POST /api/account/delete xóa Cloudinary, gọi RPC delete_own_account, gửi email và signOut", async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });
    const rpc = vi.fn().mockResolvedValue({ error: null });
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "cat@example.com" } },
      error: null,
    });
    mockCreateClient.mockReturnValue({
      auth: { getUser: mockGetUser, signOut },
      rpc,
      from: vi.fn((table: string) => {
        if (table === "submissions") {
          return createQueryChain({ data: [{ image_pid: "art/pid_1" }], error: null });
        }
        if (table === "profiles") {
          return createQueryChain({
            data: { full_name: "Mèo Vàng", banner_url: "https://res.cloudinary.com/demo/image/upload/v123/banners/b1.png" },
            error: null,
          });
        }
        return createQueryChain({ data: null, error: null });
      }),
    });

    const res = await deleteAccount({
      request: new Request("https://x.test/api/account/delete", {
        method: "POST",
        body: JSON.stringify({ confirmation: "XOA TAI KHOAN" }),
      }),
      cookies: {} as never,
    } as never);

    expect(res.status).toBe(200);
    expect(mockDeleteCloudinary).toHaveBeenCalledWith(
      ["art/pid_1", "banners/b1"],
      expect.anything()
    );
    expect(rpc).toHaveBeenCalledWith("delete_own_account");
    expect(mockSendDeletedEmail).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("POST /api/submissions bắt buộc cam kết bản quyền & hỗ trợ fallback khi từ chối reCAPTCHA + gắn nhãn AI", async () => {
    const insertedPayloads: unknown[] = [];
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockCreateClient.mockReturnValue({
      auth: { getUser: mockGetUser },
      from: vi.fn((table: string) => {
        if (table === "profiles") return createQueryChain({ data: { role: "reader" }, error: null });
        if (table === "site_settings") return createQueryChain({ data: { value: { enabled: true } }, error: null });
        if (table === "submissions") {
          const chain = createQueryChain({ data: { id: "sub-1" }, error: null, count: 0 });
          chain.insert = vi.fn((payload: unknown) => {
            insertedPayloads.push(payload);
            return chain;
          });
          return chain;
        }
        return createQueryChain({ data: null, error: null });
      }),
    });

    // 1. Thiếu cam kết bản quyền -> 400
    const missingRightsRes = await submitArtwork({
      request: new Request("https://x.test/api/submissions", {
        method: "POST",
        body: JSON.stringify({
          title: "Neon Cat",
          image_url: "https://res.cloudinary.com/demo/image/upload/a.png",
          image_pid: "a",
          recaptcha_declined: true,
        }),
      }),
      cookies: {} as never,
    } as never);
    expect(missingRightsRes.status).toBe(400);

    // 2. Bị dính honeypot -> 400
    const honeypotRes = await submitArtwork({
      request: new Request("https://x.test/api/submissions", {
        method: "POST",
        body: JSON.stringify({
          title: "Bot Spam",
          image_url: "https://res.cloudinary.com/demo/image/upload/a.png",
          image_pid: "a",
          rights_confirmed: true,
          website_hp: "http://spam.example",
          recaptcha_declined: true,
        }),
      }),
      cookies: {} as never,
    } as never);
    expect(honeypotRes.status).toBe(400);

    // 3. Hợp lệ với fallback recaptcha_declined + is_ai_generated -> 200 và tự động thêm tag ai_generated
    const okRes = await submitArtwork({
      request: new Request("https://x.test/api/submissions", {
        method: "POST",
        body: JSON.stringify({
          title: "Neon Cat",
          description: "Vaporwave art",
          image_url: "https://res.cloudinary.com/demo/image/upload/a.png",
          image_pid: "a",
          tags: ["vaporwave"],
          rights_confirmed: true,
          is_ai_generated: true,
          recaptcha_declined: true,
          website_hp: "",
        }),
      }),
      cookies: {} as never,
    } as never);
    expect(okRes.status).toBe(200);
    expect(insertedPayloads[0]).toMatchObject({
      title: "Neon Cat",
      tags: ["vaporwave", "ai_generated"],
    });
  });

  it("GET /api/ai/sessions tự động dọn phiên AI quá hạn 6 tháng", async () => {
    const ltSpy = vi.fn();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockCreateClient.mockReturnValue({
      auth: { getUser: mockGetUser },
      from: vi.fn((table: string) => {
        if (table === "profiles") return createQueryChain({ data: { is_banned: false }, error: null });
        if (table === "ai_sessions") {
          const chain = createQueryChain({ data: [], error: null });
          chain.lt = vi.fn((col: string, cutoff: string) => {
            ltSpy(col, cutoff);
            return chain;
          });
          return chain;
        }
        return createQueryChain({ data: [], error: null });
      }),
    });

    const res = await listAiSessions({
      request: new Request("https://x.test/api/ai/sessions"),
      cookies: {} as never,
    } as never);

    expect(res.status).toBe(200);
    expect(ltSpy).toHaveBeenCalledWith("updated_at", expect.any(String));
  });
});
