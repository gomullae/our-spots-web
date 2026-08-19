export function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export function formatWeight(weightKg: number): string {
  return roundToOneDecimal(weightKg).toFixed(1);
}
