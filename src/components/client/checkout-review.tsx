"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { useCartStore } from "@/lib/store/cart";
import { formatPrice } from "@/lib/utils/pricing";
import { formatWeight } from "@/lib/utils/weight";
import {
  submitOrderAction,
  type SubmitOrderState,
} from "@/app/[locale]/(client)/checkout/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type CheckoutReviewProps = {
  locale: string;
  currency?: string;
  nextDeliveryDate?: string | null;
  vatRate?: number;
};

const initialState: SubmitOrderState = { status: "idle" };

export function CheckoutReview({
  locale,
  currency = "EUR",
  nextDeliveryDate,
  vatRate = 0,
}: CheckoutReviewProps) {
  const t = useTranslations("checkout");
  const selectItems = useCallback(
    (state: ReturnType<typeof useCartStore.getState>) => state.items,
    [],
  );
  const itemsRecord = useCartStore(selectItems);
  const existingOrderId = useCartStore((state) => state.existingOrderId);
  const clearCart = useCartStore((state) => state.clear);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const router = useRouter();

  const [notes, setNotes] = useState("");

  const items = useMemo(() => Object.values(itemsRecord), [itemsRecord]);

  const itemsValue = useMemo(
    () =>
      JSON.stringify(
        items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          name: item.name,
          sku: item.sku,
          unit: item.unit,
        })),
      ),
    [items],
  );

  const totals = useMemo(() => {
    const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotalExclVat = items.reduce((sum, item) => sum + item.subtotal, 0);
    const vatAmount = Number((subtotalExclVat * (vatRate / 100)).toFixed(2));
    const totalInclVat = Number((subtotalExclVat + vatAmount).toFixed(2));
    return {
      quantity,
      subtotalExclVat: Number(subtotalExclVat.toFixed(2)),
      vatAmount,
      totalInclVat,
    };
  }, [items, vatRate]);

  const [state, formAction] = useActionState(submitOrderAction, initialState);
  const formattedDeliveryDate = useMemo(() => {
    if (!nextDeliveryDate) {
      return null;
    }

    const date = new Date(nextDeliveryDate);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return new Intl.DateTimeFormat(locale, {
      dateStyle: "full",
    }).format(date);
  }, [locale, nextDeliveryDate]);

  // Store the initial existingOrderId to prevent duplicate toasts
  const initialOrderIdRef = useRef(existingOrderId);
  const hasShownToastRef = useRef(false);

  useEffect(() => {
    if (state.status === "success" && !hasShownToastRef.current) {
      hasShownToastRef.current = true;
      toast.success(
        initialOrderIdRef.current
          ? t("messages.updateSuccess")
          : t("messages.submitSuccess")
      );
      clearCart();
      router.replace(`/${locale}/orders/${state.orderId}`);
    } else if (state.status === "error" && !hasShownToastRef.current) {
      hasShownToastRef.current = true;
      toast.error(
        t(
          state.code === "cart-empty"
            ? "messages.cartEmpty"
            : state.code === "validation-error"
            ? "messages.validationError"
            : state.code === "product-mismatch"
            ? "messages.productMismatch"
            : "messages.genericError",
        )
      );
    }
  }, [state, clearCart, router, locale, t]);

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("empty.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("empty.subtitle")}</p>
          <Button onClick={() => router.push(`/${locale}/quick-order`)}>
            {t("empty.cta")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="items" value={itemsValue} />
      {existingOrderId ? (
        <input type="hidden" name="existingOrderId" value={existingOrderId} />
      ) : null}
      {nextDeliveryDate ? (
        <input type="hidden" name="deliveryDate" value={nextDeliveryDate} />
      ) : null}

      <FormFieldset>
        <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>{t("items.heading")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="hidden grid-cols-[2fr_1fr_0.8fr_0.8fr_1fr_1fr] items-center gap-4 text-xs font-medium text-muted-foreground md:grid">
                <span>{t("items.table.product")}</span>
                <span>{t("items.table.quantity")}</span>
                <span>{t("items.table.packaging")}</span>
                <span>{t("items.table.unit")}</span>
                <span>{t("items.table.unitPrice")}</span>
                <span className="text-right">{t("items.table.subtotal")}</span>
              </div>

              <div className="space-y-4">
                {items.map((item) => (
                  <article
                    key={item.productId}
                    className="grid gap-3 rounded-lg border border-border p-4 text-sm md:grid-cols-[2fr_1fr_0.8fr_0.8fr_1fr_1fr] md:items-center md:gap-4"
                  >
                    <div>
                      <p className="font-semibold text-foreground">
                        {item.name}
                      </p>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {t("items.sku", { value: item.sku })}
                      </p>
                    </div>
                    <div className="md:justify-self-center">
                      <QuantityEditor
                        quantity={item.quantity}
                        onChange={(nextQuantity) =>
                          setQuantity({
                            productId: item.productId,
                            quantity: nextQuantity,
                            unitPrice: item.unitPrice,
                            name: item.name,
                            sku: item.sku,
                            unit: item.unit,
                            approximateWeight: item.approximateWeight ?? null,
                          })
                        }
                      />
                    </div>
                    <p className="text-xs text-muted-foreground md:text-center">
                      {formatWeight(item.approximateWeight, "1 kg")}
                    </p>
                    <p className="text-xs uppercase text-muted-foreground md:text-center">
                      {item.unit}
                    </p>
                    <p className="text-sm text-foreground md:text-center">
                      {formatPrice(item.unitPrice, locale, currency)} / kg
                    </p>
                    <p className="text-sm font-semibold text-foreground md:text-right">
                      {formatPrice(item.subtotal, locale, currency)}
                    </p>
                  </article>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("summary.heading")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {t("summary.items", {
                    count: totals.quantity.toFixed(
                      totals.quantity % 1 === 0 ? 0 : 2,
                    ),
                  })}
                </span>
                <span className="text-sm font-medium text-foreground">
                  {t("summary.estimatedTotalLabel")}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-sm text-muted-foreground">
                  {t("summary.subtotalExclVat")}
                </span>
                <span className="text-sm font-medium text-foreground">
                  {formatPrice(totals.subtotalExclVat, locale, currency)}
                </span>
              </div>
              {vatRate > 0 && (
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-sm text-muted-foreground">
                    {t("summary.vat", { rate: vatRate })}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {formatPrice(totals.vatAmount, locale, currency)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-medium text-foreground">
                  {t("summary.estimatedTotal")}
                </span>
                <span className="text-lg font-semibold text-foreground">
                  {formatPrice(totals.totalInclVat, locale, currency)}
                </span>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("details.heading")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  {t("details.deliveryDate")}
                </p>
                <div className="rounded-md border border-dashed border-muted bg-muted/40 p-3 text-sm text-muted-foreground">
                  {formattedDeliveryDate
                    ? t("details.deliveryDateValue", {
                        value: formattedDeliveryDate,
                      })
                    : t("details.deliveryDatePending")}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("details.deliveryHint")}
                </p>
              </div>
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-foreground"
                  htmlFor="notes"
                >
                  {t("details.notes")}
                </label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder={t("details.notesPlaceholder")}
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">
                  {t("details.notesHint")}
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </FormFieldset>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <FormBackButton
          onClick={() => router.push(`/${locale}/quick-order`)}
        >
          {t("actions.back")}
        </FormBackButton>
        <SubmitButton
          label={
            existingOrderId
              ? t("actions.submitUpdate")
              : t("actions.submit")
          }
          pendingLabel={
            existingOrderId
              ? t("actions.submittingUpdate")
              : t("actions.submitting")
          }
        />
      </div>
    </form>
  );
}

function QuantityEditor({
  quantity,
  onChange,
}: {
  quantity: number;
  onChange: (value: number) => void;
}) {
  const handleChange = useCallback(
    (next: number) => {
      if (!Number.isFinite(next)) {
        onChange(0);
        return;
      }

      onChange(Number(Math.max(next, 0).toFixed(2)));
    },
    [onChange],
  );

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="size-8"
        type="button"
        onClick={() => handleChange(quantity - 1)}
        aria-label="Decrease quantity"
      >
        -
      </Button>
      <Input
        type="number"
        value={quantity === 0 ? "" : quantity}
        onChange={(event) => handleChange(parseFloat(event.target.value))}
        onBlur={(event) => {
          const value = parseFloat(event.target.value);
          if (Number.isNaN(value) || value < 0) {
            handleChange(0);
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
        type="button"
        onClick={() => handleChange(quantity + 1)}
        aria-label="Increase quantity"
      >
        +
      </Button>
    </div>
  );
}

function FormFieldset({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return <fieldset disabled={pending}>{children}</fieldset>;
}

function SubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

function FormBackButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="button" variant="outline" onClick={onClick} disabled={pending}>
      {children}
    </Button>
  );
}

