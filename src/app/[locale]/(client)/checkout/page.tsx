import { getTranslations } from "next-intl/server";

import { CheckoutReview } from "@/components/client/checkout-review";
import { CheckoutPendingOrderLoader } from "@/components/client/checkout-pending-order-loader";
import { CartOrderStatusChecker } from "@/components/client/cart-order-status-checker";
import { getSession } from "@/lib/auth/session";
import { getNextDeliveryDate, DAY_TO_INDEX } from "@/lib/utils/delivery";
import { getCutoffSettings, getVatRate } from "@/lib/data/settings";
import { getClientPendingOrder } from "@/lib/data/orders";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { LocalePageProps } from "@/types/next";

type CheckoutPageProps = LocalePageProps;

export default async function CheckoutPage({
  params,
}: CheckoutPageProps) {
  const { locale } = await params;
  // Use getSession() instead of requireClient() since layout already verified auth
  const session = await getSession();
  
  if (!session?.clientProfile) {
    redirect(`/${locale}/login`);
  }
  const t = await getTranslations({ locale, namespace: "checkout" });

  let deliveryDays = session.clientProfile?.delivery_days ?? [];

  // If client doesn't have custom delivery_days, fetch from client_role
  if (deliveryDays.length === 0 && session.clientProfile?.id) {
    const supabase = await createClient();
    // First get the client with client_role_id
    const { data: client } = await supabase
      .from("clients")
      .select("client_role_id")
      .eq("id", session.clientProfile.id)
      .maybeSingle<{ client_role_id: string | null }>();

    // Then fetch the role's default_delivery_days if client_role_id exists
    if (client?.client_role_id) {
      const { data: role } = await supabase
        .from("client_roles")
        .select("default_delivery_days")
        .eq("id", client.client_role_id)
        .maybeSingle<{ default_delivery_days: string[] | null }>();

      if (role?.default_delivery_days && Array.isArray(role.default_delivery_days)) {
        deliveryDays = role.default_delivery_days;
      }
    }
  }

  // Check if client has a pending order
  const pendingOrder = await getClientPendingOrder(session.clientProfile.id);

  const [cutoffSettings, vatRate] = await Promise.all([
    getCutoffSettings(),
    getVatRate(),
  ]);

  let nextDeliveryIso: string | null = null;
  try {
    if (deliveryDays.length > 0) {
      const nextDelivery = getNextDeliveryDate({
        deliveryDays,
        cutoffTime: cutoffSettings.cutoffTime,
        cutoffDayOffset: cutoffSettings.cutoffDayOffset,
      });
      
      // Verify the calculated date is actually one of the delivery days
      const calculatedDayIndex = nextDelivery.getDay();
      const normalizedDeliveryDays = deliveryDays
        .map((day) => day.trim().toLowerCase())
        .map((day) => DAY_TO_INDEX[day])
        .filter((idx): idx is number => typeof idx === "number");
      
      if (!normalizedDeliveryDays.includes(calculatedDayIndex)) {
        console.error(
          `Calculated delivery date (${nextDelivery.toLocaleDateString()}, day index ${calculatedDayIndex}) does not match delivery days:`,
          deliveryDays,
        );
      }
      
      // Format as YYYY-MM-DD in local timezone to avoid timezone conversion issues
      const year = nextDelivery.getFullYear();
      const month = String(nextDelivery.getMonth() + 1).padStart(2, "0");
      const day = String(nextDelivery.getDate()).padStart(2, "0");
      nextDeliveryIso = `${year}-${month}-${day}`;
    }
  } catch (error) {
    // If calculation fails, nextDeliveryIso remains null
    // The checkout page will handle this gracefully
    console.error("Failed to calculate next delivery date:", error);
  }

  // Prepare pending order items for the loader
  const pendingOrderItems =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pendingOrder?.order_items?.map((item: any) => ({
      productId: item.product_id ?? item.id,
      name: item.product_name ?? "",
      quantity: item.quantity ?? 0,
      unitPrice: item.unit_price ?? 0,
      sku: item.products?.sku ?? "",
      unit: item.products?.unit ?? "",
      approximateWeight: item.products?.approximate_weight ?? null,
      subtotal: item.subtotal ?? 0,
    })) ?? [];

  return (
    <div className="flex flex-1 flex-col gap-6">
      <CartOrderStatusChecker currentPendingOrderId={pendingOrder?.id ?? null} />
      <CheckoutPendingOrderLoader
        pendingOrderId={pendingOrder?.id ?? null}
        pendingOrderItems={pendingOrderItems}
      />

      <header className="space-y-1">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          {t("badge")}
        </p>
        <h1 className="text-2xl font-semibold text-foreground">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>

      <CheckoutReview
        locale={locale}
        nextDeliveryDate={nextDeliveryIso}
        vatRate={vatRate}
      />
    </div>
  );
}
