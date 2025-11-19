/**
 * Formats weight for display:
 * - If weight < 1kg, converts to grams
 * - Otherwise shows in kg
 * - If weight is null, returns default (e.g., "1 kg")
 */
export function formatWeight(
  weight: number | null,
  defaultWeight = "1 kg",
): string {
  if (!weight || weight <= 0) {
    return defaultWeight;
  }

  if (weight < 1) {
    // Convert to grams
    const grams = Math.round(weight * 1000);
    return `${grams} g`;
  }

  // Show in kg with appropriate decimals
  const formatted = weight % 1 === 0
    ? weight.toFixed(0)
    : weight.toFixed(2);
  
  return `${formatted} kg`;
}

