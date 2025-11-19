"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

type ProductImageProps = {
  imageUrl: string | null | undefined;
  alt: string;
  className?: string;
  fill?: boolean;
  sizes?: string;
  width?: number;
  height?: number;
};

/**
 * Client component that handles product images with signed URLs for private buckets.
 * Falls back to public URL if signed URL generation fails.
 */
export function ProductImage({
  imageUrl,
  alt,
  className,
  fill,
  sizes,
  width,
  height,
}: ProductImageProps) {
  const [finalImageUrl, setFinalImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadImage = async () => {
      if (!imageUrl) {
        if (!isMounted) return;
        setFinalImageUrl(null);
        setIsLoading(false);
        return;
      }

      // Extract the path from the full URL if it's already a full URL
      let imagePath = imageUrl;
      if (imageUrl.includes("/storage/v1/object/public/product-images/")) {
        imagePath = imageUrl.split("/storage/v1/object/public/product-images/")[1] || imageUrl;
      } else if (imageUrl.includes("/storage/v1/object/sign/product-images/")) {
        // Already a signed URL, use as is
        if (!isMounted) return;
        setFinalImageUrl(imageUrl);
        setIsLoading(false);
        return;
      }

      // Try to get a signed URL (works for private buckets)
      const supabase = createClient();
      try {
        const { data: signedUrlData, error: signedError } = await supabase.storage
          .from("product-images")
          .createSignedUrl(imagePath, 3600);

        if (!isMounted) return;

        if (!signedError && signedUrlData?.signedUrl) {
          setFinalImageUrl(signedUrlData.signedUrl);
        } else {
          // Fallback to public URL (works for public buckets)
          const { data: publicUrlData } = supabase.storage
            .from("product-images")
            .getPublicUrl(imagePath);
          setFinalImageUrl(publicUrlData.publicUrl);
        }
      } catch {
        if (!isMounted) return;
        // Fallback to original URL
        setFinalImageUrl(imageUrl);
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    };

    loadImage();

    return () => {
      isMounted = false;
    };
  }, [imageUrl]);

  if (!finalImageUrl || isLoading) {
    return (
      <div
        className={className}
        style={fill ? undefined : { width, height }}
      >
        <div className="h-full w-full bg-muted animate-pulse" />
      </div>
    );
  }

  if (fill) {
    return (
      <Image
        src={finalImageUrl}
        alt={alt}
        fill
        className={className}
        sizes={sizes}
      />
    );
  }

  return (
    <Image
      src={finalImageUrl}
      alt={alt}
      width={width}
      height={height}
      className={className}
      sizes={sizes}
    />
  );
}

