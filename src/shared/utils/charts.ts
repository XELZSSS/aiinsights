export const COOL_COLORS = [
  "#6e56cf",
  "#00a2c7",
  "#30a46c",
  "#ffb224",
  "#e5484d",
  "#e93d82",
  "#8e4ec6",
  "#ff5c00",
  "#0091ff",
  "#7c8794",
];

export function getModelColor(index: number): string {
  return COOL_COLORS[index % COOL_COLORS.length]!;
}

export const chartTooltipStyle = {
  background: "var(--bg-secondary)",
  border: "1px solid var(--border)",
  color: "var(--text-primary)",
  fontSize: "12px",
  borderRadius: "6px",
} as const;
