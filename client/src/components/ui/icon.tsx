import { icons as lucideIcons } from "lucide-react";

/**
 * Icon — wrapper lucide-react.
 * Le bundle design utilise window.lucide (UMD) avec des noms en kebab-case ;
 * en prod on passe par `lucide-react` qui expose les composants en
 * PascalCase. On mappe le nom kebab vers le composant React.
 */

interface IconProps {
  name: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

function kebabToPascal(name: string): string {
  return name
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

export function Icon({ name, size = 18, strokeWidth = 1.5, className = "" }: IconProps) {
  const key = kebabToPascal(name);
  const Component = (lucideIcons as Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>>)[key];

  if (!Component) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[Icon] unknown lucide icon "${name}" (resolved to "${key}")`);
    }
    return <span className={className} style={{ display: "inline-block", width: size, height: size }} />;
  }

  return <Component size={size} strokeWidth={strokeWidth} className={className} />;
}
