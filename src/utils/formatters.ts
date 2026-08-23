export function formatUGX(amount: number): string {
  if (isNaN(amount)) return "UGX 0";
  return "UGX " + Math.round(amount).toLocaleString();
}

export function formatDate(dateVal: string | number | Date): string {
  if (!dateVal) return "";
  const date = new Date(dateVal);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
