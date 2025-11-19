import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");

  if (!path) {
    return NextResponse.json({ error: "Path parameter is required" }, { status: 400 });
  }

  const supabase = await createClient();

  // Extract the path from the full URL if it's already a full URL
  let imagePath = path;
  if (path.includes("/storage/v1/object/public/product-images/")) {
    imagePath = path.split("/storage/v1/object/public/product-images/")[1] || path;
  } else if (path.includes("/storage/v1/object/sign/product-images/")) {
    // Already a signed URL, extract the path
    const match = path.match(/\/storage\/v1\/object\/sign\/product-images\/(.+)/);
    imagePath = match ? match[1] : path;
  }

  // Try to get a signed URL (works for private buckets)
  // Expires in 1 hour (3600 seconds)
  const { data: signedUrlData, error: signedError } = await supabase.storage
    .from("product-images")
    .createSignedUrl(imagePath, 3600);

  if (!signedError && signedUrlData?.signedUrl) {
    // Redirect to the signed URL
    return NextResponse.redirect(signedUrlData.signedUrl);
  }

  // Fallback to public URL (works for public buckets)
  const { data: publicUrlData } = supabase.storage
    .from("product-images")
    .getPublicUrl(imagePath);

  return NextResponse.redirect(publicUrlData.publicUrl);
}

