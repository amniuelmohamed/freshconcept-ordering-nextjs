"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
};

const sizeClasses = {
  sm: "h-8 w-auto",
  md: "h-12 w-auto",
  lg: "h-16 w-auto",
  xl: "h-24 w-auto",
};

const sizeValues = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
};

export function Logo({ className, size = "md", showText = false }: LogoProps) {
  const [imgSrc, setImgSrc] = useState("/logo.svg");
  const [hasError, setHasError] = useState(false);
  const sizeClass = sizeClasses[size];
  const sizeValue = sizeValues[size];

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn("relative", sizeClass)}>
        {!hasError ? (
          <Image
            src={imgSrc}
            alt="Fresh Concept"
            width={sizeValue}
            height={sizeValue}
            className="h-full w-auto object-contain"
            onError={() => {
              // Try PNG if SVG doesn't exist
              if (imgSrc.endsWith(".svg")) {
                setImgSrc("/logo.png");
              } else {
                // Fallback to icon if both logo formats don't exist
                setHasError(true);
              }
            }}
          />
        ) : (
          <Image
            src="/icon.png"
            alt="Fresh Concept"
            width={sizeValue}
            height={sizeValue}
            className="h-full w-auto object-contain"
          />
        )}
      </div>
      {showText && (
        <span className="text-xl font-bold text-neutral-900">Fresh Concept</span>
      )}
    </div>
  );
}

