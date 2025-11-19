"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/permissions";
import type { Locale } from "@/i18n/routing";

export type UploadImageResult =
  | { status: "success"; imageUrl: string }
  | { status: "error"; code: "unauthorized" | "no-file" | "invalid-file" | "upload-error" | "file-too-large" };

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export async function uploadProductImageAction(
  locale: Locale,
  formData: FormData,
): Promise<UploadImageResult> {
  // Check if user is an employee with manage_products permission
  await requirePermission(locale, "manage_products");

  const file = formData.get("image") as File | null;

  if (!file || !(file instanceof File)) {
    return { status: "error", code: "no-file" };
  }

  // Validate file type
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return { status: "error", code: "invalid-file" };
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return { status: "error", code: "file-too-large" };
  }

  const supabase = await createClient();

  // Generate unique filename
  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `products/${fileName}`;

  // Convert File to ArrayBuffer for upload
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from("product-images")
    .upload(filePath, uint8Array, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    console.error("Error uploading image:", error);
    return { status: "error", code: "upload-error" };
  }

  // Return only the storage path, not the full URL
  // This path will be used with getProductImageUrl() to generate signed URLs
  // Format: "products/xxx.webp"
  return { status: "success", imageUrl: data.path };
}

