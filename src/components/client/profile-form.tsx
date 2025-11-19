"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { updateProfileAction, type UpdateProfileResult } from "@/app/[locale]/(client)/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ProfileFormProps = {
  initialData: {
    companyName: string;
    contactName: string;
    contactEmail: string;
    phone: string;
    mobile: string;
    street: string;
    city: string;
    postalCode: string;
    country: string;
    preferredLocale: string;
  };
};

const initialState: UpdateProfileResult = { success: true };

export function ProfileForm({ initialData }: ProfileFormProps) {
  const t = useTranslations("clientProfile");
  const [state, formAction, isPending] = useActionState(
    updateProfileAction,
    initialState
  );
  const [preferredLocale, setPreferredLocale] = useState(initialData.preferredLocale);

  useEffect(() => {
    if (state !== initialState) {
      if (state.success) {
        toast.success(t("messages.profileSuccess"));
      } else if (state.error) {
        toast.error(state.message || t("messages.profileError"));
      }
    }
  }, [state, t]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="companyName">{t("form.companyName")}</Label>
        <Input
          id="companyName"
          name="companyName"
          defaultValue={initialData.companyName}
          required
          disabled={isPending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contactName">{t("form.contactName")}</Label>
        <Input
          id="contactName"
          name="contactName"
          defaultValue={initialData.contactName}
          required
          disabled={isPending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contactEmail">{t("form.contactEmail")}</Label>
        <Input
          id="contactEmail"
          name="contactEmail"
          type="email"
          defaultValue={initialData.contactEmail}
          required
          disabled
          className="bg-muted"
        />
        <p className="text-xs text-muted-foreground">
          {t("form.emailReadOnly")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">{t("form.phone")}</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={initialData.phone}
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="mobile">{t("form.mobile")}</Label>
          <Input
            id="mobile"
            name="mobile"
            type="tel"
            defaultValue={initialData.mobile}
            disabled={isPending}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="street">{t("form.street")}</Label>
        <Input
          id="street"
          name="street"
          defaultValue={initialData.street}
          disabled={isPending}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="city">{t("form.city")}</Label>
          <Input
            id="city"
            name="city"
            defaultValue={initialData.city}
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="postalCode">{t("form.postalCode")}</Label>
          <Input
            id="postalCode"
            name="postalCode"
            defaultValue={initialData.postalCode}
            disabled={isPending}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="country">{t("form.country")}</Label>
        <Input
          id="country"
          name="country"
          defaultValue={initialData.country}
          disabled={isPending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="preferredLocale">{t("form.preferredLocale")}</Label>
        <Select
          value={preferredLocale}
          onValueChange={setPreferredLocale}
          disabled={isPending}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("form.preferredLocale")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fr">Français</SelectItem>
            <SelectItem value="nl">Nederlands</SelectItem>
            <SelectItem value="en">English</SelectItem>
          </SelectContent>
        </Select>
        <input type="hidden" name="preferredLocale" value={preferredLocale} />
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? t("form.savingProfile") : t("form.saveProfile")}
      </Button>
    </form>
  );
}

