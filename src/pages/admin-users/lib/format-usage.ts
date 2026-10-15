const units = ["Б", "КиБ", "МиБ", "ГиБ", "ТиБ", "ПиБ"];

export function formatBytes(bytes: number | null | undefined) {
  if (bytes == null) return "Нет данных";
  if (bytes === 0) return "0 Б";
  const unit = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: unit === 0 ? 0 : 2 }).format(bytes / 1024 ** unit)} ${units[unit]}`;
}

export function formatTimestamp(value: string | null | undefined) {
  if (!value) return "Нет данных";
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
