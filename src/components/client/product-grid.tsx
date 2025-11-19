"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Star, StarOff, Search, Grid3x3, List as ListIcon, ImageOff } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

import type { Locale } from "@/i18n/routing";
import { useCartStore } from "@/lib/store/cart";
import { formatPrice } from "@/lib/utils/pricing";
import { formatWeight } from "@/lib/utils/weight";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ProductImage } from "@/components/client/product-image";
import { toggleFavoriteAction } from "@/app/[locale]/(client)/quick-order/actions";
import type {
  QuickOrderCategory,
  QuickOrderProduct,
} from "@/lib/data/quick-order";

type ProductGridProps = {
  products: QuickOrderProduct[];
  categories: QuickOrderCategory[];
  locale: Locale;
  currency?: string;
  showFavoritesToggle?: boolean;
};

type ViewMode = "grid" | "list";
type SortKey = "relevance" | "name-asc" | "name-desc" | "price-asc" | "price-desc";

export function ProductGrid({
  products,
  categories,
  locale,
  currency = "EUR",
  showFavoritesToggle = true,
}: ProductGridProps) {
  const t = useTranslations("quickOrder");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortKey, setSortKey] = useState<SortKey>("relevance");

  const queryDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const initializedFromUrlRef = useRef(false);
  const isInitialMountRef = useRef(true);

  // Initialize state from URL search params and localStorage once on mount
  useEffect(() => {
    if (initializedFromUrlRef.current) return;
    initializedFromUrlRef.current = true;

    const urlQuery = searchParams.get("q") ?? "";
    const urlCategory = searchParams.get("category") ?? "all";
    const urlFavorites = searchParams.get("favorites") === "1";
    const urlView = searchParams.get("view") as ViewMode | null;
    const urlSort = (searchParams.get("sort") as SortKey) ?? "relevance";

    // Get view mode from URL (priority) or localStorage, default to "grid"
    const storedViewMode = typeof window !== "undefined" 
      ? (localStorage.getItem("quickOrderViewMode") as ViewMode | null)
      : null;
    // URL takes priority, then localStorage, then default to "grid"
    const initialViewMode = urlView || storedViewMode || "grid";
    const validViewMode: ViewMode = initialViewMode === "list" ? "list" : "grid";
    
    // If URL specifies a view mode, save it to localStorage
    if (urlView && typeof window !== "undefined") {
      localStorage.setItem("quickOrderViewMode", validViewMode);
    }

    setQuery(urlQuery);
    setSelectedCategory(urlCategory || "all");
    setShowFavoritesOnly(urlFavorites);
    setViewMode(validViewMode);
    setSortKey(
      ["relevance", "name-asc", "name-desc", "price-asc", "price-desc"].includes(urlSort)
        ? urlSort
        : "relevance",
    );
    
    // Mark that initial mount is complete
    isInitialMountRef.current = false;
    // We intentionally only run this once on mount to initialize from URL params
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save view mode to localStorage when it changes
  useEffect(() => {
    if (isInitialMountRef.current) return;
    
    if (typeof window !== "undefined") {
      localStorage.setItem("quickOrderViewMode", viewMode);
    }
  }, [viewMode]);

  // Sync URL when filters change (but not on initial mount)
  useEffect(() => {
    if (isInitialMountRef.current) return;
    
    updateUrl({
      category: selectedCategory === "all" ? null : selectedCategory,
      favorites: showFavoritesOnly ? "1" : null,
      view: viewMode === "grid" ? null : viewMode,
      sort: sortKey === "relevance" ? null : sortKey,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, showFavoritesOnly, viewMode, sortKey]);

  const updateUrl = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    const queryString = params.toString();
    router.push(queryString ? `?${queryString}` : "?");
  };

  const filteredProducts = useMemo(() => {
    const base = products.filter((product) => {
      if (showFavoritesOnly && !product.isFavorite) {
        return false;
      }

      if (
        selectedCategory !== "all" &&
        product.categoryId !== selectedCategory
      ) {
        return false;
      }

      if (!query.trim()) {
        return true;
      }

      const normalizedQuery = query.trim().toLowerCase();
      return (
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.sku.toLowerCase().includes(normalizedQuery) ||
        product.categoryName.toLowerCase().includes(normalizedQuery)
      );
    });

    // Sorting
    const sorted = [...base];
    switch (sortKey) {
      case "name-asc":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "price-asc":
        sorted.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        sorted.sort((a, b) => b.price - a.price);
        break;
      case "relevance":
      default:
        // keep original order
        break;
    }

    return sorted;
  }, [products, showFavoritesOnly, selectedCategory, query, sortKey]);

  // Filter categories to only show those that have visible products
  const visibleCategories = useMemo(() => {
    // Get unique category IDs from filtered products
    const categoryIdsWithProducts = new Set(
      filteredProducts.map((product) => product.categoryId).filter((id): id is string => id !== null && id !== undefined)
    );
    
    // Only return categories that have products
    return categories.filter((category) => categoryIdsWithProducts.has(category.id));
  }, [categories, filteredProducts]);

  // Group products by category
  const productsByCategory = useMemo(() => {
    const grouped: Record<string, QuickOrderProduct[]> = {};
    
    filteredProducts.forEach((product) => {
      const categoryKey = product.categoryId || "uncategorized";
      
      if (!grouped[categoryKey]) {
        grouped[categoryKey] = [];
      }
      grouped[categoryKey].push(product);
    });

    // Sort categories by name, but keep "uncategorized" at the end
    const sortedCategories = Object.keys(grouped).sort((a, b) => {
      if (a === "uncategorized") return 1;
      if (b === "uncategorized") return -1;
      const nameA = grouped[a][0]?.categoryName || "";
      const nameB = grouped[b][0]?.categoryName || "";
      return nameA.localeCompare(nameB);
    });

    return sortedCategories.map((categoryId) => ({
      categoryId,
      categoryName: grouped[categoryId][0]?.categoryName || t("filters.all"),
      products: grouped[categoryId],
    }));
  }, [filteredProducts, t]);

  const totalItems = useCartStore((state) =>
    Object.values(state.items).reduce((sum, item) => sum + item.quantity, 0),
  );
  const totalAmount = useCartStore((state) =>
    Object.values(state.items).reduce((sum, item) => sum + item.subtotal, 0),
  );

  return (
    <div className="flex flex-1 flex-col gap-4 pb-20">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => {
              const value = event.target.value;
              setQuery(value);

              if (queryDebounceRef.current) {
                clearTimeout(queryDebounceRef.current);
              }

              queryDebounceRef.current = setTimeout(() => {
                updateUrl({ q: value.trim() ? value : null });
              }, 300);
            }}
            placeholder={t("searchPlaceholder")}
            className="h-9 border-none bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="flex items-center gap-2">
          {showFavoritesToggle && (
            <Button
              variant={showFavoritesOnly ? "default" : "outline"}
              className={cn(
                "gap-2",
                showFavoritesOnly
                  ? "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  : undefined,
              )}
              onClick={() => {
                setShowFavoritesOnly((prev) => !prev);
              }}
            >
              {showFavoritesOnly ? (
                <Star className="size-4 fill-current" />
              ) : (
                <StarOff className="size-4" />
              )}
              {t("favorites")}
            </Button>
          )}

          {/* Sort selector */}
          <Select
            value={sortKey}
            onValueChange={(value) => setSortKey(value as SortKey)}
          >
            <SelectTrigger className="h-9 w-auto text-xs text-muted-foreground">
              <SelectValue placeholder={t("sort.relevance")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">{t("sort.relevance")}</SelectItem>
              <SelectItem value="name-asc">{t("sort.nameAsc")}</SelectItem>
              <SelectItem value="name-desc">{t("sort.nameDesc")}</SelectItem>
              <SelectItem value="price-asc">{t("sort.priceAsc")}</SelectItem>
              <SelectItem value="price-desc">{t("sort.priceDesc")}</SelectItem>
            </SelectContent>
          </Select>

          <div className="hidden rounded-lg border border-border bg-card p-1 md:flex">
            <ToggleButton
              icon={<Grid3x3 className="size-3.5" />}
              isActive={viewMode === "grid"}
              ariaLabel="Grid view"
              onClick={() => setViewMode("grid")}
            />
            <ToggleButton
              icon={<ListIcon className="size-3.5" />}
              isActive={viewMode === "list"}
              ariaLabel="List view"
              onClick={() => setViewMode("list")}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip
          label={t("filters.all")}
          isActive={selectedCategory === "all"}
          onClick={() => setSelectedCategory("all")}
        />
        {visibleCategories.map((category) => (
          <FilterChip
            key={category.id}
            label={category.name}
            isActive={selectedCategory === category.id}
            onClick={() => setSelectedCategory(category.id)}
          />
        ))}
      </div>

      {filteredProducts.length === 0 ? (
        <EmptyState
          title={t("empty.title")}
          subtitle={t("empty.subtitle")}
        />
      ) : viewMode === "grid" ? (
        <div className="space-y-8">
          {productsByCategory.map(({ categoryId, categoryName, products: categoryProducts }) => (
            <div key={categoryId} className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-1 w-12 rounded-full bg-gradient-to-r from-primary to-primary/60"></div>
                <h2 className="text-xl font-semibold text-foreground">{categoryName}</h2>
                <span className="text-sm text-muted-foreground">({categoryProducts.length})</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {categoryProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    locale={locale}
                    currency={currency}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {productsByCategory.map(({ categoryId, categoryName, products: categoryProducts }) => (
            <div key={categoryId} className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-1 w-12 rounded-full bg-gradient-to-r from-primary to-primary/60"></div>
                <h2 className="text-xl font-semibold text-foreground">{categoryName}</h2>
                <span className="text-sm text-muted-foreground">({categoryProducts.length})</span>
              </div>
              <div className="rounded-lg border border-border bg-card">
                <div className="hidden border-b border-border bg-muted px-4 py-3 text-sm font-medium text-muted-foreground md:grid md:grid-cols-[auto_minmax(0,2fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,1fr)_auto] md:gap-4">
                  <span className="w-12">{t("product.image")}</span>
                  <span>{t("product.name")}</span>
                  <span>{t("product.category")}</span>
                  <span>{t("product.packaging")}</span>
                  <span>{t("product.unit")}</span>
                  <span>{t("product.price")}</span>
                  <span className="text-right">{t("product.quantity")}</span>
                </div>
                <div className="divide-y divide-border">
                  {categoryProducts.map((product) => (
                    <ProductRow
                      key={product.id}
                      product={product}
                      locale={locale}
                      currency={currency}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <CartSummary
        locale={locale}
        currency={currency}
        totalItems={totalItems}
        totalAmount={totalAmount}
        label={t("summary.items", {
          count: totalItems.toFixed(totalItems % 1 === 0 ? 0 : 2),
        })}
        actionLabel={t("summary.review")}
        href={`/${locale}/checkout`}
      />
    </div>
  );
}

function ProductCard({
  product,
  locale,
  currency,
}: {
  product: QuickOrderProduct;
  locale: Locale;
  currency: string;
}) {
  const t = useTranslations("quickOrder");
  const quantity = useCartStore(
    (state) => state.items[product.id]?.quantity ?? 0,
  );
  const [isFavorite, setIsFavorite] = useState(product.isFavorite);

  const formattedPrice = formatPrice(product.price, locale, currency);
  const priceLabel = t("product.pricePerKg", {
    price: formattedPrice,
  });
  const approximateWeightLabel = product.approximateWeight
    ? formatWeight(product.approximateWeight, "1 kg")
    : null;
  const skuLabel = t("product.sku", { value: product.sku });

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-sm transition hover:shadow-md">
      <div className="relative mb-3 h-40 w-full rounded-md border border-input overflow-hidden bg-muted flex items-center justify-center">
        {product.imageUrl ? (
          <ProductImage
            imageUrl={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
          />
        ) : (
          <ImageOff className="size-6 text-muted-foreground" />
        )}
      </div>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">
            {product.name}
          </h3>
          {product.categoryName ? (
            <p className="text-xs font-medium uppercase tracking-wide text-primary">
              {product.categoryName}
            </p>
          ) : null}
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          {skuLabel}
        </span>
      </div>

      <div className="mb-4 flex flex-col gap-2 text-sm text-muted-foreground">
        <p>{priceLabel}</p>
        {approximateWeightLabel ? (
          <p>≈ {approximateWeightLabel}</p>
        ) : null}
        {product.description ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {product.description}
          </p>
        ) : null}
      </div>

      <div className="mt-auto flex items-end justify-between gap-3">
        <button
          type="button"
          onClick={async () => {
            try {
              const result = await toggleFavoriteAction(locale, product.id);
              if (result.status === "success") {
                setIsFavorite(result.isFavorite);
              }
            } catch {
              // best-effort; ignore for now
            }
          }}
          className={cn(
            "flex items-center gap-1 text-xs font-medium",
            isFavorite
              ? "text-secondary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {isFavorite ? (
            <Star className="size-4 fill-current" />
          ) : (
            <StarOff className="size-4" />
          )}
          <span>{t("badges.favorite")}</span>
        </button>
        <QuantityControl
          quantity={quantity}
          product={{
            id: product.id,
            unitPrice: product.price,
            name: product.name,
            sku: product.sku,
            unit: product.unit,
            approximateWeight: product.approximateWeight,
          }}
        />
      </div>
    </div>
  );
}

function ProductRow({
  product,
  locale,
  currency,
}: {
  product: QuickOrderProduct;
  locale: string;
  currency: string;
}) {
  const t = useTranslations("quickOrder");
  const quantity = useCartStore(
    (state) => state.items[product.id]?.quantity ?? 0,
  );

  const formattedPrice = formatPrice(product.price, locale, currency);
  const priceLabel = t("product.pricePerKg", {
    price: formattedPrice,
  });
  const skuLabel = t("product.sku", { value: product.sku });
  const packagingWeight = formatWeight(
    product.approximateWeight,
    "1 kg",
  );

  return (
    <div className="grid items-center gap-4 px-4 py-3 text-sm text-muted-foreground md:grid-cols-[auto_minmax(0,2fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,1fr)_auto]">
      <div className="relative h-12 w-12 rounded-md border border-input overflow-hidden bg-muted flex items-center justify-center">
        {product.imageUrl ? (
          <ProductImage
            imageUrl={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover"
            sizes="48px"
          />
        ) : (
          <ImageOff className="size-4 text-muted-foreground" />
        )}
      </div>
      <div>
        <p className="font-semibold text-foreground">{product.name}</p>
        <p className="text-xs uppercase tracking-wide text-primary">
          {skuLabel}
        </p>
      </div>
      <span>{product.categoryName}</span>
      <span className="text-xs">{packagingWeight}</span>
      <span className="text-xs uppercase">{product.unit}</span>
      <span className="font-semibold text-foreground">
        {priceLabel}
      </span>
      <div className="flex justify-end">
        <QuantityControl
          quantity={quantity}
          product={{
            id: product.id,
            unitPrice: product.price,
            name: product.name,
            sku: product.sku,
            unit: product.unit,
            approximateWeight: product.approximateWeight,
          }}
        />
      </div>
    </div>
  );
}

type QuantityProduct = {
  id: string;
  unitPrice: number;
  name: string;
  sku: string;
  unit: string;
  approximateWeight: number | null;
};

function QuantityControl({
  product,
  quantity,
}: {
  product: QuantityProduct;
  quantity: number;
}) {
  const setQuantity = useCartStore((state) => state.setQuantity);

  const handleUpdate = (next: number) => {
    const safeValue = Number.isFinite(next) ? Math.max(next, 0) : 0;
    setQuantity({
      productId: product.id,
      quantity: Number(safeValue.toFixed(2)),
      unitPrice: product.unitPrice,
      name: product.name,
      sku: product.sku,
      unit: product.unit,
      approximateWeight: product.approximateWeight,
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="size-8"
        onClick={() => handleUpdate(quantity - 1)}
        aria-label="Decrease quantity"
      >
        -
      </Button>
      <Input
        type="number"
        value={quantity === 0 ? "" : quantity}
        onChange={(event) => handleUpdate(parseFloat(event.target.value))}
        onBlur={(event) => {
          const value = parseFloat(event.target.value);
          if (Number.isNaN(value) || value < 0) {
            handleUpdate(0);
          }
        }}
        min={0}
        step={1}
        className="h-8 w-20 text-center"
      />
      <Button
        variant="outline"
        size="icon"
        className="size-8"
        onClick={() => handleUpdate(quantity + 1)}
        aria-label="Increase quantity"
      >
        +
      </Button>
    </div>
  );
}

function FilterChip({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-1 text-sm transition",
        isActive
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary",
      )}
    >
      {label}
    </button>
  );
}

function ToggleButton({
  icon,
  isActive,
  ariaLabel,
  onClick,
}: {
  icon: ReactNode;
  isActive: boolean;
  ariaLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition",
        isActive
          ? "bg-primary text-primary-foreground shadow"
          : "hover:bg-muted hover:text-foreground",
      )}
    >
      {icon}
    </button>
  );
}

function EmptyState({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card py-12 text-center">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="text-xs text-muted-foreground/80">{subtitle}</p>
    </div>
  );
}

function CartSummary({
  totalItems,
  totalAmount,
  locale,
  currency,
  label,
  actionLabel,
  href,
}: {
  totalItems: number;
  totalAmount: number;
  locale: string;
  currency: string;
  label: string;
  actionLabel: string;
  href: string;
}) {
  if (totalItems === 0) {
    return null;
  }

  return (
    <div className="sticky bottom-4 ml-auto flex w-full max-w-md items-center justify-between rounded-full border border-primary/30 bg-card px-5 py-3 shadow-lg">
      <span className="text-sm text-muted-foreground">
        {label}
      </span>
      <span className="text-base font-semibold text-foreground">
        {formatPrice(totalAmount, locale, currency)}
      </span>
      <Button variant="default" asChild>
        <Link href={href}>{actionLabel}</Link>
      </Button>
    </div>
  );
}

