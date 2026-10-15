import { z } from 'zod';

const originErrorSchema = z.object({ error: z.literal('invalid_origin') });

export function getSignOutError(error: unknown) {
  if (error && typeof error === 'object' && 'status' in error && error.status === 403 && 'data' in error) {
    try {
      const data = typeof error.data === 'string' ? JSON.parse(error.data) : error.data;
      if (originErrorSchema.safeParse(data).success) {
        return 'Сервер не разрешает выход с этого адреса сайта. Требуется исправить настройки авторизации.';
      }
    } catch {
      // Некорректное тело ошибки не должно ломать интерфейс.
    }
  }
  return 'Не удалось выйти. Попробуйте ещё раз.';
}
