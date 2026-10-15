export function saveConfigFile(blob: Blob, id: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `config-${id.replace(/[^a-zA-Z0-9_-]/g, "-")}.conf`;
  link.style.display = "none";
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    // Даём браузеру начать скачивание, затем освобождаем память с конфигом.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
