"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export function PrintOrderButton() {
  const t = useTranslations("employeeOrders.detail");

  const handlePrint = useCallback(() => {
    if (typeof window !== "undefined") {
      window.print();
    }
  }, []);

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handlePrint}
      className="w-full sm:w-auto"
    >
      {t("print")}
    </Button>
  );
}


