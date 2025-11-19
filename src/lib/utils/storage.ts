import { createClient } from "@/lib/supabase/server";

/**
 * Gets a signed URL for a product image.
 * For private buckets, this generates a temporary signed URL.
 * For public buckets, this returns the public URL.
 * 
 * @param imagePath - The path to the image in storage (e.g., "products/123.jpg")
 * @returns The URL to access the image
 */
export async function getProductImageUrl(imagePath: string | null): Promise<string | null> {
  if (!imagePath) {
    return null;
  }

  // Extract the path from the full URL if it's already a full URL
  // e.g., "https://...supabase.co/storage/v1/object/public/product-images/products/123.jpg"
  // should become "products/123.jpg"
  let path = imagePath;
  if (imagePath.includes("/storage/v1/object/public/product-images/")) {
    path = imagePath.split("/storage/v1/object/public/product-images/")[1] || imagePath;
  } else if (imagePath.includes("/storage/v1/object/sign/product-images/")) {
    // Already a signed URL, return as is
    return imagePath;
  }

  const supabase = await createClient();

  // Try to get a signed URL (works for private buckets)
  // Expires in 1 hour (3600 seconds)
  const { data: signedUrlData, error: signedError } = await supabase.storage
    .from("product-images")
    .createSignedUrl(path, 3600);

  if (!signedError && signedUrlData?.signedUrl) {
    return signedUrlData.signedUrl;
  }

  // Fallback to public URL (works for public buckets)
  const { data: publicUrlData } = supabase.storage
    .from("product-images")
    .getPublicUrl(path);

  return publicUrlData.publicUrl;
}

