export type ProgressLevel = "normal" | "warning" | "error" | "offline";

export const getProgressLevel = (
  percentage: number,
  offline: boolean
): ProgressLevel => {
  if (offline) return "offline";
  if (percentage > 90) return "error";
  if (percentage > 50) return "warning";
  return "normal";
};
