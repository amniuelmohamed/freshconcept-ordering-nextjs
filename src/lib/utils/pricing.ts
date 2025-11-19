const CURRENCY_FRACTION_DIGITS = 2;

export function clampDiscount(discount: number) {
  if (Number.isNaN(discount)) {
    return 0;
  }

  return Math.min(Math.max(discount, 0), 100);
}

export function calculateDiscountedPrice(basePrice: number, discount: number) {
  if (basePrice < 0) {
    throw new Error("Base price cannot be negative.");
  }

  const safeDiscount = clampDiscount(discount);
  const value = basePrice * (1 - safeDiscount / 100);

  return Number(value.toFixed(CURRENCY_FRACTION_DIGITS));
}

export function formatPrice(
  value: number,
  locale: string,
  currency = "EUR",
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: CURRENCY_FRACTION_DIGITS,
    maximumFractionDigits: CURRENCY_FRACTION_DIGITS,
  }).format(value);
}

