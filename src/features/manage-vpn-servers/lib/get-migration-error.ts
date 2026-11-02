const messages: Record<string, string> = {
  revision_conflict: "Настройки изменились. Обновите данные и выполните новое осознанное действие.",
  server_not_ready: "Сервер ещё не подготовлен. Сначала выполните проверку и подготовку.",
  server_busy: "Сервер занят другой операцией.", switch_in_progress: "Другое переключение ещё выполняется.",
  pending_config_operations: "Дождитесь завершения текущих выдач конфигов.",
  server_in_use: "Сервер ещё используется. Сначала переключите пользователей на другой сервер.",
  server_identity_locked: "Установка уже используется. Для другого хоста или установки добавьте новую запись сервера.",
  discovery_changed: "Обнаруженная установка изменилась. Повторите проверку сервера.",
  operation_not_resumable: "Операция уже не ожидает выбора. Обновите её статус.",
  switch_superseded: "После этой операции уже выполнено другое переключение. Обновите routing и выберите новое действие.",
  idempotency_conflict: "Ключ уже относится к другому запросу. Обновите статус операции.",
  public_host_required: "Укажите публичный адрес VPN-сервера.",
  host_unreachable: "Не удалось связаться с сервером.", host_key_mismatch: "SSH-ключ сервера не совпадает с доверенным.",
  ssh_auth_failed: "Не удалось авторизоваться по SSH.", sudo_required: "На сервере требуются права root или настроенный sudo.",
  unsupported_os: "Операционная система сервера не поддерживается.", docker_missing: "На сервере не найден Docker.",
  awg_not_found: "Установка AmneziaWG не найдена.", awg_unsupported: "Установка AmneziaWG не поддерживается.",
  helper_conflict: "Обнаружен неизвестный helper. Автоматическая замена заблокирована.",
  helper_install_failed: "Не удалось установить helper.", helper_verify_failed: "Не удалось проверить helper.",
  helper_journal_missing: "Не найден журнал helper.", host_operation_unconfirmed: "Действие на сервере пока не подтверждено.",
  binding_missing_on_host: "Выдача не найдена на сервере.", file_unavailable: "Файл конфигурации недоступен.",
  storage_unavailable: "Хранилище временно недоступно.", deleted_during_switch: "Конфиг удалён во время переключения.",
};
export function operationError(code?: string | null): string {
  if (!code) return "";
  return messages[code] || (/^[a-z_]{1,80}$/.test(code) ? `Ошибка операции (${code}).` : "Ошибка операции.");
}
export function migrationError(error: unknown): string {
  const status = error && typeof error === "object" && "status" in error ? error.status : undefined;
  const code = error && typeof error === "object" && "data" in error && error.data && typeof error.data === "object" && "error" in error.data && typeof error.data.error === "string" ? error.data.error : undefined;
  if (status === 401) return "Сессия истекла. Войдите заново.";
  if (status === 403) return "Доступ запрещён. Проверьте права администратора и адрес сайта.";
  if (status === 503) return "Сервис временно недоступен. Результат операции не подтверждён.";
  if (code && messages[code]) return messages[code];
  if (status === 404) return "Операция или сервер не найдены. Обновите данные.";
  if (status === 400) return "Сервер отклонил данные запроса.";
  return "Не удалось получить подтверждение сервера. Проверьте статус перед повтором действия.";
}
