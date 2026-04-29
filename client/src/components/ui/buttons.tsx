import type { ReactNode } from "react";
import { Icon } from "./icon";

interface BaseButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

interface PrimaryButtonProps extends BaseButtonProps {
  icon?: string | null;
  iconRight?: string | null;
  type?: "button" | "submit" | "reset";
  size?: "md" | "lg";
}

export function PrimaryButton({
  children,
  onClick,
  icon = null,
  iconRight = null,
  className = "",
  type = "button",
  disabled = false,
  size = "md",
}: PrimaryButtonProps) {
  const sz = size === "lg" ? "h-12 px-6 text-[15px]" : "h-10 px-5 text-sm";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 ${sz} rounded-md font-medium text-porcelain bg-forest hover:bg-forest-light transition focus-forest disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {icon && <Icon name={icon} size={15} />}
      {children}
      {iconRight && <Icon name={iconRight} size={15} />}
    </button>
  );
}

interface SecondaryButtonProps extends BaseButtonProps {
  icon?: string | null;
}

export function SecondaryButton({ children, onClick, icon = null, className = "", disabled = false }: SecondaryButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md text-sm font-medium border text-ink bg-transparent hover:bg-porcelain-dark transition focus-forest disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      style={{ borderColor: "rgba(26,26,26,0.20)" }}
    >
      {icon && <Icon name={icon} size={15} />}
      {children}
    </button>
  );
}

interface GhostButtonProps extends BaseButtonProps {
  icon?: string | null;
}

export function GhostButton({ children, onClick, icon = null, className = "", disabled = false }: GhostButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink transition ${className}`}
    >
      {icon && <Icon name={icon} size={14} />}
      {children}
    </button>
  );
}
