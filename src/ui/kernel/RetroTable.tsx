// RetroTable.tsx — bảng dữ liệu Win95: bọc overflow cho mobile, thead bevel.
import React from "react";

export interface RetroTableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  /** Scroll ngang có bọc viền khi hẹp (mặc định bật). */
  scrollable?: boolean;
}

export const RetroTable: React.FC<RetroTableProps> = ({ scrollable = true, className = "", children, ...rest }) => (
  <div className={scrollable ? "overflow-x-auto win95-sunken p-1" : undefined}>
    <table className={["win-table w-full font-retro text-xs", className].join(" ")} {...rest}>
      {children}
    </table>
  </div>
);

export const RetroTh: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({ className = "", ...rest }) => (
  <th
    className={["bg-win-gray text-black border border-win-dark px-2 py-1 text-left font-bold whitespace-nowrap", className].join(" ")}
    {...rest}
  />
);

export const RetroTd: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({ className = "", ...rest }) => (
  <td className={["border border-win-dark/50 px-2 py-1 align-middle", className].join(" ")} {...rest}
  />
);
