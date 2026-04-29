import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  tone?: "porcelain" | "porcelain-dark";
}

export function Card({ children, className = "", tone = "porcelain-dark" }: CardProps) {
  const bg = tone === "porcelain" ? "bg-porcelain" : "bg-porcelain-dark";
  return <div className={`${bg} border hairline rounded-lg ${className}`}>{children}</div>;
}
