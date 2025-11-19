"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import { updateOrderAction, type UpdateOrderResult } from "@/app/[locale]/(employee)/employee/orders/[id]/actions";
import type { Locale } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type OrderDetailFormProps = {
  locale: Locale;
  order: {
    id: string;
    status: string | null;
    final_total: number | null;
    notes: string | null;
  };
};

const validStatuses = ["pending", "confirmed", "shipped", "delivered", "cancelled"] as const;

function isValidStatus(status: string | null): status is typeof validStatuses[number] {
  return status !== null && validStatuses.includes(status as typeof validStatuses[number]);
}

const orderUpdateSchema = z.object({
  status: z.enum(["pending", "confirmed", "shipped", "delivered", "cancelled"]).optional(),
  finalTotal: z
    .string()
    .optional()
    .refine(
      (val) => !val || (!Number.isNaN(Number(val)) && Number(val) >= 0),
      "Must be a positive number",
    ),
  notes: z.string().max(500).optional(),
});

type OrderUpdateFormValues = z.infer<typeof orderUpdateSchema>;

export function OrderDetailForm({ locale, order }: OrderDetailFormProps) {
  const t = useTranslations("employeeOrders.detail.update");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<UpdateOrderResult | null>(null);

  useEffect(() => {
    if (result?.status === "success") {
      toast.success(t("updateSuccess"));
    } else if (result?.status === "error") {
      toast.error(t(`errors.${result.code}`));
    }
  }, [result, t]);

  const form = useForm<OrderUpdateFormValues>({
    resolver: zodResolver(orderUpdateSchema),
    defaultValues: {
      status: isValidStatus(order.status) ? order.status : undefined,
      finalTotal: order.final_total?.toString() ?? "",
      notes: order.notes ?? "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setResult(null);
    form.clearErrors();

    startTransition(async () => {
      const formData = new FormData();
      formData.append("orderId", order.id);
      if (values.status !== undefined) {
        formData.append("status", values.status);
      }
      if (values.finalTotal) {
        formData.append("finalTotal", values.finalTotal);
      }
      if (values.notes !== undefined) {
        formData.append("notes", values.notes);
      }

      const actionResult = await updateOrderAction(locale, formData);
      setResult(actionResult);

      if (actionResult.status === "success") {
        router.refresh();
      }
    });
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("status.label")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("status.placeholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">{t("status.pending")}</SelectItem>
                      <SelectItem value="confirmed">{t("status.confirmed")}</SelectItem>
                      <SelectItem value="shipped">{t("status.shipped")}</SelectItem>
                      <SelectItem value="delivered">{t("status.delivered")}</SelectItem>
                      <SelectItem value="cancelled">{t("status.cancelled")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="finalTotal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("finalTotal.label")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder={t("finalTotal.placeholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("notes.label")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("notes.placeholder")}
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isPending}>
              {isPending ? t("submitting") : t("submit")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

