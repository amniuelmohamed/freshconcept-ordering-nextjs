"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import { updateSettingsAction } from "@/app/[locale]/(employee)/employee/settings/actions";
import {
  DEFAULT_AVAILABLE_PERMISSIONS,
  DEFAULT_AVAILABLE_UNITS,
  DEFAULT_AVAILABLE_LOCALES,
} from "@/lib/data/settings-constants";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Use exported constants from settings.ts
const ALL_POSSIBLE_UNITS = [...DEFAULT_AVAILABLE_UNITS] as const;

const settingsSchema = z.object({
  cutoffTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  cutoffDayOffset: z.number().int().min(0).max(7),
  defaultLocale: z.enum(["fr", "nl", "en"]),
  vatRate: z.number().min(0).max(100),
  availableLocales: z.record(z.enum(["fr", "nl", "en"]), z.boolean()),
  availablePermissions: z.record(z.string(), z.boolean()),
  availableUnits: z.record(z.string(), z.boolean()),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

type SettingsFormProps = {
  locale: Locale;
  initialData: {
    cutoffTime: string;
    cutoffDayOffset: number;
    defaultLocale: string;
    vatRate: number;
    availableLocales: Record<string, boolean>;
    availablePermissions: Record<string, boolean>;
    availableUnits: Record<string, boolean>;
  };
};

export function SettingsForm({ locale, initialData }: SettingsFormProps) {
  const t = useTranslations("employeeSettings.form");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Normalize permissions: merge with defaults to ensure all permissions are present
  const normalizePermissions = (
    availablePermissions: Record<string, boolean>,
  ): Record<string, boolean> => {
    const result: Record<string, boolean> = {};
    DEFAULT_AVAILABLE_PERMISSIONS.forEach((perm) => {
      result[perm] = availablePermissions[perm] ?? true;
    });
    return result;
  };

  // Normalize locales: merge with defaults to ensure all locales are present
  const normalizeLocales = (
    availableLocales: Record<string, boolean>,
  ): Record<string, boolean> => {
    const result: Record<string, boolean> = {};
    DEFAULT_AVAILABLE_LOCALES.forEach((loc) => {
      result[loc] = availableLocales[loc] ?? true;
    });
    return result;
  };

  // Normalize units: merge with defaults to ensure all units are present
  const normalizeUnits = (
    availableUnits: Record<string, boolean>,
  ): Record<string, boolean> => {
    const result: Record<string, boolean> = {};
    DEFAULT_AVAILABLE_UNITS.forEach((unit) => {
      result[unit] = availableUnits[unit] ?? true;
    });
    return result;
  };

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      cutoffTime: initialData.cutoffTime,
      cutoffDayOffset: initialData.cutoffDayOffset,
      defaultLocale: initialData.defaultLocale as "fr" | "nl" | "en",
      vatRate: initialData.vatRate,
      availableLocales: normalizeLocales(initialData.availableLocales),
      availablePermissions: normalizePermissions(initialData.availablePermissions),
      availableUnits: normalizeUnits(initialData.availableUnits),
    },
  });

  const permissions = useWatch({ control: form.control, name: "availablePermissions" }) || {};
  const locales = useWatch({ control: form.control, name: "availableLocales" }) || {};
  const units = useWatch({ control: form.control, name: "availableUnits" }) || {};

  const onSubmit = form.handleSubmit((values) => {
    form.clearErrors();

    startTransition(async () => {
      const formData = new FormData();

      formData.append("cutoffTime", values.cutoffTime);
      formData.append("cutoffDayOffset", values.cutoffDayOffset.toString());
      formData.append("defaultLocale", values.defaultLocale);
      formData.append("vatRate", values.vatRate.toString());
      
      // Save locales as object (new format)
      formData.append("availableLocales", JSON.stringify(values.availableLocales || {}));
      
      // Save permissions as object (new format)
      formData.append("availablePermissions", JSON.stringify(values.availablePermissions || {}));
      
      // Save units as object (new format)
      formData.append("availableUnits", JSON.stringify(values.availableUnits || {}));

      const actionResult = await updateSettingsAction(locale, formData);

      if (actionResult.status === "success") {
        toast.success(t("updateSuccess"));
        router.refresh();
      } else {
        toast.error(t(`errors.${actionResult.code}`));
      }
    });
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="cutoffTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("cutoffTime.label")}</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormDescription>{t("cutoffTime.description")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cutoffDayOffset"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("cutoffDayOffset.label")}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="7"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormDescription>{t("cutoffDayOffset.description")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="defaultLocale"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("defaultLocale.label")}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a language" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="nl">Nederlands</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>{t("defaultLocale.description")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="vatRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("vatRate.label")}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    value={field.value ?? 0}
                  />
                </FormControl>
                <FormDescription>{t("vatRate.description")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="availableLocales"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("availableLocales.label")}</FormLabel>
              <FormDescription>{t("availableLocales.description")}</FormDescription>
              <div className="grid gap-2 md:grid-cols-3">
                {(["fr", "nl", "en"] as const).map((loc) => (
                  <label
                    key={loc}
                    className="flex items-center gap-3 rounded-md border border-input p-3 hover:bg-accent cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={locales[loc] === true}
                      onCheckedChange={(checked) => {
                        const current = field.value || {};
                        field.onChange({
                          ...current,
                          [loc]: checked === true,
                        });
                      }}
                    />
                    <span className="text-sm font-medium">
                      {loc === "fr" ? "Français" : loc === "nl" ? "Nederlands" : "English"}
                    </span>
                  </label>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="availablePermissions"
          render={({ field }) => {
            // Always show all default permissions (even if unchecked)
            return (
              <FormItem>
                <FormLabel>{t("permissions.label")}</FormLabel>
                <FormDescription>{t("permissions.description")}</FormDescription>
                <div className="grid gap-2 md:grid-cols-2">
                  {DEFAULT_AVAILABLE_PERMISSIONS.map((permission) => (
                    <label
                      key={permission}
                      className="flex items-center gap-3 rounded-md border border-input p-3 hover:bg-accent cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={permissions[permission] === true}
                        onCheckedChange={(checked) => {
                          const current = field.value || {};
                          field.onChange({
                            ...current,
                            [permission]: checked === true,
                          });
                        }}
                      />
                      <span className="text-sm font-medium">
                        {t(`permissions.${permission}`) || permission}
                      </span>
                    </label>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <FormField
          control={form.control}
          name="availableUnits"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("units.label")}</FormLabel>
              <FormDescription>{t("units.description")}</FormDescription>
              <div className="grid gap-2 md:grid-cols-3">
                {ALL_POSSIBLE_UNITS.map((unit) => (
                  <label
                    key={unit}
                    className="flex items-center gap-3 rounded-md border border-input p-3 hover:bg-accent cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={units[unit] === true}
                      onCheckedChange={(checked) => {
                        const current = field.value || {};
                        field.onChange({
                          ...current,
                          [unit]: checked === true,
                        });
                      }}
                    />
                    <span className="text-sm font-medium">{unit}</span>
                  </label>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-4">
          <Button type="submit" disabled={isPending}>
            {isPending ? t("updating") : t("update")}
          </Button>
        </div>
      </form>
    </Form>
  );
}

