import React from "react";

interface Win95WindowProps {
  title: string;
  onClose?: () => void;
  children: React.ReactNode;
  widthClass?: string;
}

export const Win95Window: React.FC<Win95WindowProps> = ({
  title,
  onClose,
  children,
  widthClass = "max-w-md w-full"
}) => {
  return (
    <div className={`win95-container ${widthClass} font-retro text-black`}>
      <div className="win95-header">
        <span>{title}</span>
        {onClose && (
          <button className="win95-btn py-0 px-1 font-bold" onClick={onClose}>
            X
          </button>
        )}
      </div>
      <div className="p-4 bg-win-gray">
        {children}
      </div>
    </div>
  );
};
