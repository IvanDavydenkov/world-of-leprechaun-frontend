import { expect, it } from 'vitest';
import { getSignOutError } from './get-sign-out-error';

it('объясняет invalid_origin в текстовом ответе выхода', () => {
  expect(getSignOutError({ status: 403, data: '{"error":"invalid_origin"}' })).toContain('Сервер не разрешает выход');
});

it('сохраняет общее сообщение для прочих ошибок и некорректного JSON', () => {
  expect(getSignOutError({ status: 403, data: 'bad json' })).toBe('Не удалось выйти. Попробуйте ещё раз.');
  expect(getSignOutError({ status: 503 })).toBe('Не удалось выйти. Попробуйте ещё раз.');
});
