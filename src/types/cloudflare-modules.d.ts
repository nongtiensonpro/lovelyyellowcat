// Ambient types tối thiểu cho cloudflare:* runtime modules (không dùng @cloudflare/workers-types
// vì nó siết Request.json() → unknown gây 50+ lỗi strictness không cần thiết).
declare module "cloudflare:sockets" {
  export function connect(
    address: { hostname: string; port: number },
    options?: { secureTransport?: "on" | "off" | "starttls"; allowHalfOpen?: boolean }
  ): {
    readable: ReadableStream<Uint8Array>;
    writable: WritableStream<Uint8Array>;
    close(): Promise<void>;
    [key: string]: unknown;
  };
}

declare module "cloudflare:workers" {
  export const env: unknown;
}
