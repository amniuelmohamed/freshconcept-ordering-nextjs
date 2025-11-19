"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import Image from "next/image";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

import {
  createProductAction,
  updateProductAction,
  type CreateProductResult,
  type UpdateProductResult,
} from "@/app/[locale]/(employee)/employee/products/actions";
import { uploadProductImageAction } from "@/app/[locale]/(employee)/employee/products/upload-image";
import type { Locale } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TranslatedName = {
  fr?: string;
  nl?: string;
  en?: string;
};

type Category = {
  id: string;
  name: TranslatedName | null;
};

type ClientRole = {
  id: string;
  name: TranslatedName | null;
  slug: string;
};

type ProductFormProps = {
  locale: Locale;
  categories: Category[];
  clientRoles: ClientRole[];
  availableUnits: string[];
  product?: {
    id: string;
    sku: string | null;
    name: TranslatedName | null;
    description: TranslatedName | null;
    category_id: string | null;
    base_price: number;
    unit: string | null;
    approximate_weight: number | null;
    image_url: string | null;
    visible_to: string[] | null;
    active: boolean | null;
  };
};

const productSchema = z.object({
  sku: z.string().optional(),
  nameFr: z.string().min(1, "Required"),
  nameNl: z.string().min(1, "Required"),
  nameEn: z.string().min(1, "Required"),
  descriptionFr: z.string().optional(),
  descriptionNl: z.string().optional(),
  descriptionEn: z.string().optional(),
  categoryId: z.string().uuid().optional().nullable(),
  basePrice: z.number().min(0.01, "Price must be greater than 0"),
  unit: z.string().min(1, "Unit is required"),
  approximateWeight: z.number().min(0).optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  visibleTo: z.array(z.string()).optional(),
  active: z.boolean().optional(),
});

// Note: imageFile is not in the schema as it's handled separately

type ProductFormValues = z.infer<typeof productSchema>;

function getCategoryName(name: TranslatedName | null, locale: string): string {
  if (!name || typeof name !== "object") return "-";
  return (name[locale as keyof TranslatedName] as string) ?? name.fr ?? name.nl ?? name.en ?? "-";
}

function getRoleName(name: TranslatedName | null, locale: string): string {
  if (!name || typeof name !== "object") return "-";
  return (name[locale as keyof TranslatedName] as string) ?? name.fr ?? name.nl ?? name.en ?? "-";
}

export function ProductForm({ locale, categories, clientRoles, availableUnits, product }: ProductFormProps) {
  const t = useTranslations("employeeProducts.form");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<CreateProductResult | UpdateProductResult | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!product;

  // Generate signed URL for existing product image (if it's a storage path)
  useEffect(() => {
    if (!product?.image_url) {
      setImagePreview(null);
      return;
    }

    const imagePath = product.image_url;
    
    // If it's already a full URL (legacy data), use it directly
    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
      // Extract path from full URL if it's a public URL
      if (imagePath.includes("/storage/v1/object/public/product-images/")) {
        const path = imagePath.split("/storage/v1/object/public/product-images/")[1];
        if (path) {
          // Generate signed URL from path
          const supabase = createClient();
          supabase.storage
            .from("product-images")
            .createSignedUrl(path, 3600)
            .then(({ data, error }) => {
              if (!error && data?.signedUrl) {
                setImagePreview(data.signedUrl);
              } else {
                setImagePreview(null);
              }
            });
        } else {
          setImagePreview(null);
        }
      } else {
        // Already a signed URL or other full URL
        setImagePreview(imagePath);
      }
    } else {
      // It's a storage path (e.g., "products/xxx.webp"), generate signed URL
      const supabase = createClient();
      supabase.storage
        .from("product-images")
        .createSignedUrl(imagePath, 3600)
        .then(({ data, error }) => {
          if (!error && data?.signedUrl) {
            setImagePreview(data.signedUrl);
          } else {
            setImagePreview(null);
          }
        });
    }
  }, [product?.image_url]);

  // Normalize visible_to from database (null = visible to all, array = specific roles)
  const normalizeVisibleTo = (visibleTo: string[] | null): string[] => {
    if (!visibleTo || visibleTo.length === 0) return [];
    return visibleTo;
  };

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      sku: product?.sku ?? "",
      nameFr: (product?.name as TranslatedName)?.fr ?? "",
      nameNl: (product?.name as TranslatedName)?.nl ?? "",
      nameEn: (product?.name as TranslatedName)?.en ?? "",
      descriptionFr: (product?.description as TranslatedName)?.fr ?? "",
      descriptionNl: (product?.description as TranslatedName)?.nl ?? "",
      descriptionEn: (product?.description as TranslatedName)?.en ?? "",
      categoryId: product?.category_id ?? null,
      basePrice: product?.base_price ?? 0,
      unit: product?.unit ?? "kg",
      approximateWeight: product?.approximate_weight ?? null,
      imageUrl: product?.image_url ?? "",
      visibleTo: normalizeVisibleTo(product?.visible_to ?? null),
      active: product?.active ?? true,
    },
  });

  const visibleTo = useWatch({ control: form.control, name: "visibleTo" }) || [];

  useEffect(() => {
    if (result?.status === "success") {
      toast.success(isEditing ? t("updateSuccess") : t("createSuccess"));
    } else if (result?.status === "error") {
      toast.error(t(`errors.${result.code}`));
    }
  }, [result, isEditing, t]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setResult({ status: "error", code: "validation-error" });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setResult({ status: "error", code: "validation-error" });
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload image
    setUploadingImage(true);
    const uploadFormData = new FormData();
    uploadFormData.append("image", file);

    try {
      const uploadResult = await uploadProductImageAction(locale, uploadFormData);
      
      if (uploadResult.status === "success") {
        // uploadResult.imageUrl is now a storage path (e.g., "products/xxx.webp")
        form.setValue("imageUrl", uploadResult.imageUrl);
        
        // Generate signed URL for preview
        const supabase = createClient();
        const { data, error } = await supabase.storage
          .from("product-images")
          .createSignedUrl(uploadResult.imageUrl, 3600);
        
        if (!error && data?.signedUrl) {
          setImagePreview(data.signedUrl);
        }
        
        setResult(null);
      } else {
        setResult({ status: "error", code: "validation-error" });
        // On error, keep the FileReader preview (data URL) temporarily
        // The useEffect will restore the original image if product?.image_url exists
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      setResult({ status: "error", code: "validation-error" });
      // On error, keep the FileReader preview (data URL) temporarily
      // The useEffect will restore the original image if product?.image_url exists
    } finally {
      setUploadingImage(false);
    }
  };

  const onSubmit = form.handleSubmit((values) => {
    setResult(null);
    form.clearErrors();

    startTransition(async () => {
      const formData = new FormData();
      
      if (isEditing && product) {
        formData.append("productId", product.id);
      }
      
      if (values.sku) formData.append("sku", values.sku);
      formData.append("nameFr", values.nameFr);
      formData.append("nameNl", values.nameNl);
      formData.append("nameEn", values.nameEn);
      if (values.descriptionFr) formData.append("descriptionFr", values.descriptionFr);
      if (values.descriptionNl) formData.append("descriptionNl", values.descriptionNl);
      if (values.descriptionEn) formData.append("descriptionEn", values.descriptionEn);
      if (values.categoryId) formData.append("categoryId", values.categoryId);
      formData.append("basePrice", values.basePrice.toString());
      if (values.unit) formData.append("unit", values.unit);
      if (values.approximateWeight) formData.append("approximateWeight", values.approximateWeight.toString());
      // Always append imageUrl, even if empty/null, so we can delete images during update
      // Empty string or null means no image
      formData.append("imageUrl", values.imageUrl ?? "");
      formData.append("visibleTo", JSON.stringify(values.visibleTo || []));
      formData.append("active", values.active ? "true" : "false");

      const actionResult = isEditing
        ? await updateProductAction(locale, formData)
        : await createProductAction(locale, formData);

      setResult(actionResult);

      if (actionResult.status === "success") {
        if (!isEditing && "productId" in actionResult) {
          router.push(`/${locale}/employee/products/${actionResult.productId}`);
        } else {
          router.refresh();
        }
      }
    });
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="sku"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("sku.label")}</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
                </FormControl>
                <FormDescription>{t("sku.description")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("category.label")}</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value || null)}
                  value={field.value ?? undefined}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("category.placeholder")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {getCategoryName(category.name, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="nameFr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("name.fr")}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nameNl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("name.nl")}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="nameEn"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("name.en")}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="descriptionFr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("description.fr")}</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={3} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="descriptionNl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("description.nl")}</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={3} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="descriptionEn"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("description.en")}</FormLabel>
              <FormControl>
                <Textarea {...field} rows={3} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-6 md:grid-cols-3">
          <FormField
            control={form.control}
            name="basePrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("basePrice.label")}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    value={field.value ?? 0}
                  />
                </FormControl>
                <FormDescription>{t("basePrice.description")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("unit.label")}</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value ?? ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("unit.placeholder")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableUnits.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>{t("unit.description")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="approximateWeight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("approximateWeight.label")}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormDescription>{t("approximateWeight.description")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("imageUrl.label")}</FormLabel>
              <FormControl>
                <div className="space-y-4">
                  {imagePreview && (
                    <div className="relative w-full h-48 rounded-md border border-input overflow-hidden">
                      <Image
                        src={imagePreview}
                        alt="Product preview"
                        fill
                        className="object-contain"
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleImageChange}
                      disabled={uploadingImage || isPending}
                      className="cursor-pointer"
                    />
                    {imagePreview && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setImagePreview(null);
                          form.setValue("imageUrl", null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = "";
                          }
                        }}
                        disabled={uploadingImage || isPending}
                      >
                        {t("imageUrl.remove")}
                      </Button>
                    )}
                  </div>
                  {uploadingImage && (
                    <p className="text-sm text-muted-foreground">{t("imageUrl.uploading")}</p>
                  )}
                  {/* Hidden field to store the URL */}
                  <input type="hidden" {...field} value={field.value ?? ""} />
                </div>
              </FormControl>
              <FormDescription>{t("imageUrl.description")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="visibleTo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("visibleTo.label")}</FormLabel>
              <FormDescription>{t("visibleTo.description")}</FormDescription>
              <div className="grid gap-2 md:grid-cols-2">
                {clientRoles.map((role) => (
                  <label
                    key={role.id}
                    className="flex items-center gap-3 rounded-md border border-input p-3 hover:bg-accent cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={visibleTo.includes(role.slug)}
                      onCheckedChange={(checked) => {
                        const current = field.value || [];
                        if (checked) {
                          field.onChange([...current, role.slug]);
                        } else {
                          field.onChange(current.filter((slug) => slug !== role.slug));
                        }
                      }}
                    />
                    <span className="text-sm font-medium">
                      {getRoleName(role.name, locale)}
                    </span>
                  </label>
                ))}
              </div>
              <FormDescription className="text-xs">
                {visibleTo.length === 0
                  ? t("visibleTo.allClients")
                  : t("visibleTo.selectedClients", { count: visibleTo.length })}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value ?? true}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="cursor-pointer">
                  {t("active.label")}
                </FormLabel>
                <FormDescription>
                  {t("active.description")}
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <div className="flex gap-4">
          <Button type="submit" disabled={isPending}>
            {isPending
              ? isEditing
                ? t("updating")
                : t("creating")
              : isEditing
                ? t("update")
                : t("create")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isPending}
          >
            {t("cancel")}
          </Button>
        </div>
      </form>
    </Form>
  );
}

