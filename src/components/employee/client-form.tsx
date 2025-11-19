"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import {
  createClientAction,
  updateClientAction,
  type CreateClientResult,
  type UpdateClientResult,
} from "@/app/[locale]/(employee)/employee/clients/actions";
import type { Locale } from "@/i18n/routing";
import { clientCreationSchema } from "@/lib/validations/schemas";
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

type ClientRole = {
  id: string;
  name: TranslatedName | null;
  slug: string;
  default_delivery_days: string[] | null;
};

type Address = {
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
};

type ClientFormProps = {
  locale: Locale;
  roles: ClientRole[];
  client?: {
    id: string;
    company_name: string | null;
    contact_name: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    contact_mobile: string | null;
    client_role_id: string | null;
    remise: number | null;
    delivery_days: string[] | null;
    preferred_locale: string | null;
    tva_number: string | null;
    billing_address: Address | null;
    shipping_address: Address | null;
  };
};

const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const updateClientSchema = clientCreationSchema.partial().extend({
  billingAddressDifferent: z.boolean().optional(),
});

type ClientFormValues = z.infer<typeof clientCreationSchema> & {
  billingAddressDifferent?: boolean;
};

function getRoleName(name: TranslatedName | null, locale: string): string {
  if (!name || typeof name !== "object") return "-";
  return (name[locale as keyof TranslatedName] as string) ?? name.fr ?? name.nl ?? name.en ?? "-";
}

export function ClientForm({ locale, roles, client }: ClientFormProps) {
  const t = useTranslations("employeeClients.form");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<CreateClientResult | UpdateClientResult | null>(null);

  const isEditing = !!client;

  useEffect(() => {
    if (result?.status === "success") {
      toast.success(isEditing ? t("updateSuccess") : t("createSuccess"));
    } else if (result?.status === "error") {
      toast.error(t(`errors.${result.code}`));
    }
  }, [result, isEditing, t]);

  // Normalize delivery days from database
  const normalizeDeliveryDays = (
    days: string[] | null,
  ): typeof DAYS_OF_WEEK[number][] => {
    if (!days || days.length === 0) return [];
    return days
      .map((day) => day.toLowerCase())
      .filter((day): day is typeof DAYS_OF_WEEK[number] =>
        DAYS_OF_WEEK.includes(day as typeof DAYS_OF_WEEK[number]),
      );
  };

  // Get default delivery days from selected role
  const getDefaultDeliveryDays = (roleId: string | null): typeof DAYS_OF_WEEK[number][] => {
    if (!roleId) return [];
    const role = roles.find((r) => r.id === roleId);
    if (!role || !role.default_delivery_days) return [];
    return normalizeDeliveryDays(role.default_delivery_days);
  };

  const form = useForm<ClientFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(isEditing ? updateClientSchema : clientCreationSchema) as any,
    defaultValues: {
      email: client?.contact_email ?? "",
      companyName: client?.company_name ?? "",
      contactName: client?.contact_name ?? "",
      clientRoleId: client?.client_role_id ?? "",
      remise: client?.remise ?? 0,
      deliveryDays: normalizeDeliveryDays(client?.delivery_days ?? null),
      preferredLocale: (client?.preferred_locale as "fr" | "nl" | "en") ?? locale,
      contactPhone: client?.contact_phone ?? "",
      contactMobile: client?.contact_mobile ?? "",
      tvaNumber: client?.tva_number ?? "",
      shippingAddress: (client?.shipping_address as Address | null) ?? undefined,
      billingAddress: (client?.billing_address as Address | null) ?? undefined,
      billingAddressDifferent: client?.billing_address && client?.shipping_address
        ? JSON.stringify(client.billing_address) !== JSON.stringify(client.shipping_address)
        : false,
    },
  });

  const selectedRoleId = form.watch("clientRoleId");
  const billingAddressDifferent = form.watch("billingAddressDifferent");

  // Update delivery days when role changes (only if not editing or if delivery days are empty)
  useEffect(() => {
    if (selectedRoleId) {
      const currentDeliveryDays = form.getValues("deliveryDays");
      // Only auto-fill if we're creating a new client, or if delivery days are empty
      if (!isEditing || !currentDeliveryDays || currentDeliveryDays.length === 0) {
        const defaultDays = getDefaultDeliveryDays(selectedRoleId);
        if (defaultDays.length > 0) {
          form.setValue("deliveryDays", defaultDays);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoleId, isEditing]);

  // Sync billing address with shipping address when checkbox is unchecked
  const shippingAddress = form.watch("shippingAddress");
  useEffect(() => {
    if (!billingAddressDifferent && shippingAddress) {
      const currentBillingAddress = form.getValues("billingAddress");
      // Only update if they're different to avoid unnecessary updates
      if (JSON.stringify(shippingAddress) !== JSON.stringify(currentBillingAddress)) {
        form.setValue("billingAddress", shippingAddress);
      }
    }
  }, [billingAddressDifferent, shippingAddress, form]);

  const onSubmit = form.handleSubmit((values) => {
    setResult(null);
    form.clearErrors();

    startTransition(async () => {
      const formData = new FormData();

      if (isEditing && client) {
        formData.append("clientId", client.id);
      }

      formData.append("email", values.email ?? "");
      formData.append("companyName", values.companyName ?? "");
      formData.append("contactName", values.contactName ?? "");
      if (values.contactPhone) formData.append("contactPhone", values.contactPhone);
      if (values.contactMobile) formData.append("contactMobile", values.contactMobile);
      formData.append("clientRoleId", values.clientRoleId ?? "");
      formData.append("remise", (values.remise ?? 0).toString());
      formData.append("deliveryDays", JSON.stringify(values.deliveryDays ?? []));
      formData.append("preferredLocale", values.preferredLocale ?? locale);
      if (values.tvaNumber) formData.append("tvaNumber", values.tvaNumber);
      
      // Handle addresses: if billing is different, use separate addresses, otherwise copy shipping to billing
      if (values.shippingAddress) {
        formData.append("shippingAddress", JSON.stringify(values.shippingAddress));
      }
      
      if (values.billingAddressDifferent && values.billingAddress) {
        formData.append("billingAddress", JSON.stringify(values.billingAddress));
      } else {
        // If billing is same as shipping, copy shipping address
        formData.append("billingAddress", JSON.stringify(values.shippingAddress || {}));
      }
      
      formData.append("billingAddressDifferent", String(values.billingAddressDifferent ?? false));

      const actionResult = isEditing
        ? await updateClientAction(locale, formData)
        : await createClientAction(locale, formData);

      setResult(actionResult);

      if (actionResult.status === "success") {
        if (!isEditing && "clientId" in actionResult) {
          router.push(`/${locale}/employee/clients/${actionResult.clientId}`);
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
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("email.label")}</FormLabel>
                <FormControl>
                  <Input type="email" {...field} disabled={isEditing} />
                </FormControl>
                <FormDescription>
                  {isEditing ? t("email.descriptionEdit") : t("email.description")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="companyName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("companyName.label")}</FormLabel>
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
          name="contactName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("contactName.label")}</FormLabel>
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
            name="contactPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("contactPhone.label")}</FormLabel>
                <FormControl>
                  <Input type="tel" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contactMobile"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("contactMobile.label")}</FormLabel>
                <FormControl>
                  <Input type="tel" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="clientRoleId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("role.label")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("role.placeholder")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {getRoleName(role.name, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="remise"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("remise.label")}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormDescription>{t("remise.description")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="preferredLocale"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("preferredLocale.label")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Français" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="nl">Nederlands</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tvaNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("tvaNumber.label")}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">{t("shippingAddress.title")}</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="shippingAddress.street"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("shippingAddress.street")}</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="shippingAddress.city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("shippingAddress.city")}</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="shippingAddress.postalCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("shippingAddress.postalCode")}</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="shippingAddress.country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("shippingAddress.country")}</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name="billingAddressDifferent"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value ?? false}
                  onCheckedChange={(checked) => {
                    const isChecked = checked === true;
                    field.onChange(isChecked);
                    // If unchecking, copy shipping address to billing address
                    if (!isChecked) {
                      const shippingAddress = form.getValues("shippingAddress");
                      form.setValue("billingAddress", shippingAddress);
                    }
                  }}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="cursor-pointer">
                  {t("billingAddress.different")}
                </FormLabel>
                <FormDescription>
                  {t("billingAddress.differentDescription")}
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        {billingAddressDifferent && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground">{t("billingAddress.title")}</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="billingAddress.street"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("billingAddress.street")}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="billingAddress.city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("billingAddress.city")}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="billingAddress.postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("billingAddress.postalCode")}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="billingAddress.country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("billingAddress.country")}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}

        <FormField
          control={form.control}
          name="deliveryDays"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("deliveryDays.label")}</FormLabel>
              <FormDescription>{t("deliveryDays.description")}</FormDescription>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {DAYS_OF_WEEK.map((day) => (
                  <label
                    key={day}
                    className="flex items-center gap-3 rounded-md border border-input p-3 hover:bg-accent cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={(field.value ?? []).includes(day)}
                      onCheckedChange={(checked) => {
                        const current = field.value ?? [];
                        if (checked) {
                          field.onChange([...current, day]);
                        } else {
                          field.onChange(current.filter((d) => d !== day));
                        }
                      }}
                    />
                    <span className="text-sm font-medium capitalize">{t(`deliveryDays.${day}`)}</span>
                  </label>
                ))}
              </div>
              <FormMessage />
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

