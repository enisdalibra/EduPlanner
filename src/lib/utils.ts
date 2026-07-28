import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines multiple class names using clsx and tailwind-merge
 * @param inputs - Array of class values to be combined
 * @returns A string of merged class names
 * 
 * @example
 * ```tsx
 * cn("base-class", condition && "conditional-class", "another-class")
 * // Returns: "base-class conditional-class another-class" (if condition is true)
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
