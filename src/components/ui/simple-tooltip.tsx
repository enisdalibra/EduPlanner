import React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

interface SimpleTooltipProps {
  content: string;
  side?: "top" | "bottom" | "left" | "right";
  children: React.ReactElement;
}

export function SimpleTooltip({ content, side = "top", children }: SimpleTooltipProps) {
  if (!content) return children;
  
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side={side}>
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
