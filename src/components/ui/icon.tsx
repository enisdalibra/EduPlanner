import React from "react";
import { cn } from "@/lib/utils";

interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string;
}

export function Icon({ name, className, style, ...props }: IconProps) {
  // Map Tailwind width/height/size classes to font-size. 
  // Material Symbols visually appear smaller than SVGs, so we scale them up
  let fontSize = undefined;
  if (className) {
    const match = className.match(/\b(?:w-|size-|h-)([\d.]+)\b/);
    if (match) {
      const val = parseFloat(match[1]);
      if (!isNaN(val)) {
        // Tailwind scale: 1 = 0.25rem = 4px. 
        // We want to map it back to px for Material Symbols
        fontSize = `${val * 4}px`;
      }
    }
  }

  return (
    <span
      className={cn("material-symbols-rounded", className)}
      style={{
        fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
        fontSize: fontSize || style?.fontSize,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        verticalAlign: "middle",
        ...style
      }}
      {...props}
    >
      {name}
    </span>
  );
}
