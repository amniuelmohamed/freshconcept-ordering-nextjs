"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

type SearchInputProps = {
  placeholder?: string;
  className?: string;
};

export function SearchInput({ placeholder, className }: SearchInputProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [inputValue, setInputValue] = useState(searchParams.get("search") ?? "");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentSearch = searchParams.get("search") ?? "";

  // Sync input value when URL changes externally
  useEffect(() => {
    setInputValue(currentSearch);
  }, [currentSearch]);

  const handleSearch = (value: string) => {
    setInputValue(value);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer for debounced update
    debounceTimerRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      
      if (value.trim()) {
        params.set("search", value);
      } else {
        params.delete("search");
      }

      startTransition(() => {
        router.push(`?${params.toString()}`);
      });
    }, 300); // 300ms debounce delay
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <Input
      type="search"
      placeholder={placeholder}
      value={inputValue}
      onChange={(e) => handleSearch(e.target.value)}
      className={className}
      disabled={isPending}
    />
  );
}

