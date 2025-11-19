"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Search,
  Package,
  ShoppingCart,
  FileText,
  Star,
  Building2,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { motion } from "framer-motion";

interface SearchResult {
  id: string;
  type: "product" | "order" | "client" | "favorite";
  title: string;
  subtitle?: string;
  href: string;
  icon: React.ReactNode;
}

interface GlobalSearchProps {
  locale: string;
  userType: "client" | "employee";
}

export function GlobalSearch({ locale, userType }: GlobalSearchProps) {
  const [mounted, setMounted] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const router = useRouter();
  const t = useTranslations("search");

  // Only render dialog after mount to avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Keyboard shortcut (Cmd+K or Ctrl+K)
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Search function with debounce
  React.useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(searchQuery)}&type=${userType}&locale=${locale}`
        );
        if (response.ok) {
          const data = await response.json();
          setResults(data.results || []);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, userType, locale]);

  const handleSelect = (href: string) => {
    setOpen(false);
    setSearchQuery("");
    router.push(href);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "product":
        return <Package className="h-4 w-4" />;
      case "order":
        return <ShoppingCart className="h-4 w-4" />;
      case "client":
        return <Building2 className="h-4 w-4" />;
      case "favorite":
        return <Star className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <Search className="h-4 w-4" />
        <span>{t("searchPlaceholder")}</span>
        <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </motion.button>

      {mounted && (
        <CommandDialog open={open} onOpenChange={setOpen}>
          <CommandInput
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {isLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {t("searching")}...
              </div>
            ) : searchQuery.length < 2 ? (
              <CommandEmpty>{t("typeToSearch")}</CommandEmpty>
            ) : results.length === 0 ? (
              <CommandEmpty>{t("noResults")}</CommandEmpty>
            ) : (
              <>
                {Object.entries(groupedResults).map(([type, items]) => (
                  <CommandGroup key={type} heading={t(`types.${type}`)}>
                    {items.map((result) => (
                      <CommandItem
                        key={result.id}
                        value={result.title}
                        onSelect={() => handleSelect(result.href)}
                        className="cursor-pointer"
                      >
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-2"
                        >
                          {getIcon(result.type)}
                          <div className="flex flex-col">
                            <span>{result.title}</span>
                            {result.subtitle && (
                              <span className="text-xs text-muted-foreground">
                                {result.subtitle}
                              </span>
                            )}
                          </div>
                        </motion.div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </>
            )}
          </CommandList>
        </CommandDialog>
      )}
    </>
  );
}

