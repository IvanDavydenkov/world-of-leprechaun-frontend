import { expect, it } from 'vitest';
import { userOverviewSchema } from './user-overview-schema';

const profile = { id: 'example-user', display_name: 'Пример', role: 'user' };

it('поддерживает старый ответ каталога без VPN-сводки', () => {
  expect(userOverviewSchema.parse(profile).vpn).toBeUndefined();
});

it('принимает недоступную сводку и отклоняет отрицательные байты', () => {
  expect(userOverviewSchema.safeParse({ ...profile, vpn: { availability: 'unavailable', counts: null, configs: null, traffic: null } }).success).toBe(true);
  expect(userOverviewSchema.safeParse({ ...profile, vpn: { availability: 'available', counts: null, configs: [], traffic: { upload_bytes: -1, download_bytes: 0, total_bytes: -1, freshness: 'fresh', coverage: 'partial', observed_since: null, updated_at: null } } }).success).toBe(false);
});
