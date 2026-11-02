export function getServerError(error: unknown): string {
  const data = error && typeof error === "object" && "data" in error ? error.data : undefined;
  const code = data && typeof data === "object" && "error" in data ? data.error : undefined;
  if (code === "server_identity_locked") return "Установка уже используется. Для другого хоста или установки создайте новую запись сервера.";
  if (code === "server_busy") return "Сервер занят операцией. Дождитесь её завершения.";
  if (code === "public_host_required") return "Укажите публичный хост VPN-сервера.";
  const status = error && typeof error === "object" && "status" in error ? error.status : undefined;
  switch (status) {
    case 400: return "Сервер отклонил данные. Проверьте поля формы.";
    case 401: return "Сессия истекла. Войдите заново.";
    case 403: return "Нет доступа к настройкам сервера. Проверьте права администратора и адрес сайта.";
    case 404: return "Запись сервера больше не найдена. Обновите список.";
    case 409: return "Сервер уже изменён другим администратором. Загрузите актуальную запись перед сохранением.";
    case 503: return "Сервис серверов временно недоступен. Попробуйте позже.";
    default: return "Не удалось подтвердить результат запроса. Обновите список перед повторным сохранением.";
  }
}
