// ErrorBoundary.tsx — kernel error boundary (Phase 8, kế hoạch §8, ADR-0002 fallback).
// Island crash (network/render/runtime) không được làm trắng cả vùng nội dung:
// fallback Win95 "BSOD-mini" + nút thử lại. Không log PII, không gửi đâu cả.
import React from "react";

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Tên module hiển thị trong fallback (vd "GALLERY_GRID.EXE"). */
  moduleName?: string;
  /** Render khác khi lỗi (mặc định: khung Win95 + retry). */
  fallback?: (info: { message: string; reset: () => void }) => React.ReactNode;
  /** Ghi nhận lỗi bên ngoài (telemetry) — nhận Error, không PII. */
  onError?: (error: Error) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error): void {
    // Hook ngoài (telemetry) — nhận Error, tự quyết định log gì
    try {
      this.props.onError?.(error);
    } catch {
      // telemetry lỗi không được lan ra
    }
  }

  reset(): void {
    this.setState({ error: null });
  }

  render(): React.ReactNode {
    if (!this.state.error) return this.props.children;
    const name = this.props.moduleName || "MODULE";
    if (this.props.fallback) {
      return this.props.fallback({ message: this.state.error.message, reset: this.reset });
    }
    return (
      <div role="alert" className="win95-container p-3 max-w-md mx-auto my-6 font-retro">
        <div className="win95-header">
          <span className="text-xs font-bold truncate">\u26A0 {name} — L\u1ED6I KH\u00D4NG KH\u1EA2 D\u1EF0</span>
        </div>
        <div className="p-3 bg-win-gray space-y-2">
          <p className="text-[11px] leading-snug text-black">
            Module này gặp lỗi khi chạy. Nội dung khác của trang vẫn hoạt động bình thường.
          </p>
          <p className="text-[10px] font-mono text-win-dark break-all bg-white border border-win-dark p-1.5 max-h-16 overflow-auto">
            {this.state.error.message || "Unknown error"}
          </p>
          <button
            type="button"
            className="win95-btn px-3 py-1.5 text-[11px] font-bold"
            onClick={this.reset}
          >
            \u21BB TH\u1EED L\u1EA0I
          </button>
        </div>
      </div>
    );
  }
}
