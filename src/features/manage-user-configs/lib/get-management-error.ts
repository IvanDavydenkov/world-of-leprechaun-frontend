export function getManagementError(error: unknown) {
  if (error && typeof error === "object" && "status" in error) {
    const code =
      "data" in error &&
      error.data &&
      typeof error.data === "object" &&
      "error" in error.data
        ? error.data.error
        : undefined;
    if (error.status === 401) return "Сессия истекла. Войдите заново.";
    if (error.status === 403)
      return code === "invalid_origin"
        ? "Адрес сайта не разрешён настройками сервера."
        : "Недостаточно прав администратора.";
    if (error.status === 404)
      return "Пользователь, конфиг или операция не найдены. Обновите данные.";
    if (error.status === 409)
      return "Конфликт операции. Возможно, уже выполняется отключение всех конфигов. Обновите данные.";
    if (error.status === 400)
      return "Сервер отклонил параметры запроса. Проверьте данные.";
  }
  return "Не удалось получить подтверждение сервера. Повторите тот же запрос: дубликаты не будут созданы.";
}
