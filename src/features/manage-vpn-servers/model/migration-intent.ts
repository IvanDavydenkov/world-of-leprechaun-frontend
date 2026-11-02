import { intentSchema } from "./migration-schema";
import type { MigrationIntent } from "./migration-schema";

const storageKey = (actor: string) => `private:vpn-server-intent:${actor}`;
export function readMigrationIntent(actor: string): MigrationIntent | null {
  try {
    const result = intentSchema.safeParse(JSON.parse(sessionStorage.getItem(storageKey(actor)) || "null"));
    return result.success ? result.data : null;
  } catch { return null; }
}
export function storeMigrationIntent(actor: string, intent: MigrationIntent | null): boolean {
  try {
    if (intent) sessionStorage.setItem(storageKey(actor), JSON.stringify(intentSchema.parse(intent)));
    else sessionStorage.removeItem(storageKey(actor));
    return true;
  } catch { return false; }
}
