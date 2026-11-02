import { z } from "zod";

const bytes = (value: string) => new TextEncoder().encode(value).length;
const identifier = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/, "Латинские буквы, цифры, точка, дефис и подчёркивание; до 64 символов");
const address = z.string().refine((value) => {
  const match = /^(\[[0-9a-fA-F:]+\]|[A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?):([0-9]+)$/.exec(value);
  if (!match || Number(match[2]) < 1 || Number(match[2]) > 65535) return false;
  if (match[1].startsWith("[")) {
    try { new URL(`http://${value}`); } catch { return false; }
  }
  return true;
}, "Укажите адрес и порт 1–65535, например vpn.example.org:22");
const hostKey = z.string().refine((value) => {
  const parts = value.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0] !== "ssh-ed25519") return false;
  try {
    const key = atob(parts[1]);
    return key.length === 51 && key.startsWith("\x00\x00\x00\x0bssh-ed25519\x00\x00\x00\x20");
  } catch { return false; }
}, "Нужен полный публичный ключ ssh-ed25519, без комментария и SHA256-отпечатка");
const fingerprint = z.string().regex(/^SHA256:[A-Za-z0-9+/]{43}$/, "Нужен ED25519 SHA256-отпечаток: SHA256: и 43 символа Base64 без =");
const publicHost = z.string().refine((value) => {
  if (/^[A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?$/.test(value)) return true;
  try { return value.includes(":") && new URL(`http://[${value.replace(/^\[|\]$/g, "")}]`).hostname.startsWith("["); } catch { return false; }
}, "Укажите публичный IP или имя хоста без порта");

export const serverFieldsSchema = z.object({
  name: z.string().refine((value) => value.trim().length > 0 && bytes(value) <= 128 && !/[\r\n\x00]/.test(value), "Название обязательно, до 128 байт, без переносов строк"),
  ssh_address: address,
  ssh_username: identifier,
  ssh_host_key: hostKey,
  public_endpoint: address,
  container: identifier,
  interface: identifier.refine((value) => value.length <= 15, "Имя интерфейса — до 15 символов"),
});
export const serverFormSchema = serverFieldsSchema.extend({
  password: z.string().refine((value) => bytes(value) <= 4096, "Пароль — до 4096 байт"),
});
export const modernServerFormSchema = serverFormSchema.extend({
  ssh_host_key: z.union([hostKey, z.literal("")]),
  ssh_host_fingerprint: z.union([fingerprint, z.literal("")]).optional(),
  public_host: z.union([publicHost, z.literal("")]).optional(),
  public_endpoint: z.union([address, z.literal("")]),
  container: z.union([identifier, z.literal("")]),
  interface: z.union([serverFieldsSchema.shape.interface, z.literal("")]),
}).superRefine((value, context) => {
  if (!!value.ssh_host_key === !!value.ssh_host_fingerprint) {
    context.addIssue({ code: "custom", path: ["ssh_host_key"], message: "Укажите ровно один доверенный публичный ключ или SHA256-отпечаток" });
    context.addIssue({ code: "custom", path: ["ssh_host_fingerprint"], message: "Укажите ровно один доверенный публичный ключ или SHA256-отпечаток" });
  }
});
export const serverSchema = serverFieldsSchema.extend({
  ssh_host_key: hostKey.nullable(),
  ssh_host_fingerprint: fingerprint.nullable().optional(),
  public_host: publicHost.nullable().optional(),
  public_endpoint: address.nullable(),
  container: identifier.nullable(),
  interface: serverFieldsSchema.shape.interface.nullable(),
  id: z.string().min(1),
  revision: z.number().int().positive(),
  password_set: z.boolean(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
  preparation_status: z.enum(["not_prepared", "preparing", "needs_input", "ready", "failed", "stale"]).optional(),
  prepared_revision: z.number().int().positive().nullable().optional(),
  checked_at: z.iso.datetime().nullable().optional(),
  helper: z.object({ version: z.string(), sha256: z.string() }).nullable().optional(),
  last_error_code: z.string().nullable().optional(),
  last_operation_id: z.string().nullable().optional(),
  is_default: z.boolean().optional(),
  bindings_counts: z.object({ active: z.number().int().nonnegative(), revoked: z.number().int().nonnegative(), pending: z.number().int().nonnegative() }).optional(),
});
export type VpnServer = z.infer<typeof serverSchema>;
export type ServerForm = z.infer<typeof serverFormSchema> & { ssh_host_fingerprint?: string; public_host?: string };
export type SaveServerRequest = { id?: string; body: Partial<ServerForm> & { expected_revision?: number } };
export const emptyServerForm: ServerForm = {
  name: "", ssh_address: "", ssh_username: "", ssh_host_key: "", public_endpoint: "", container: "amnezia-awg2", interface: "awg0", password: "",
};
export function serverToForm(server: VpnServer): ServerForm {
  return {
    name: server.name, ssh_address: server.ssh_address, ssh_username: server.ssh_username,
    ssh_host_key: server.ssh_host_key ?? "", public_endpoint: server.public_endpoint ?? "",
    container: server.container ?? "", interface: server.interface ?? "", password: "",
    ...(!server.ssh_host_key && server.ssh_host_fingerprint ? { ssh_host_fingerprint: server.ssh_host_fingerprint } : {}),
    ...(server.public_host ? { public_host: server.public_host } : {}),
  };
}
export function buildServerCreate(values: ServerForm, modern = false): SaveServerRequest["body"] {
  if (!modern) return serverFormSchema.parse(values);
  return Object.fromEntries(Object.entries(modernServerFormSchema.parse(values)).filter(([, value]) => value !== "" && value !== undefined)) as SaveServerRequest["body"];
}
export function buildServerPatch(server: VpnServer, values: ServerForm, modern = false): SaveServerRequest["body"] {
  const body: SaveServerRequest["body"] = { expected_revision: server.revision };
  const keys: (keyof Omit<ServerForm, "password">)[] = [...Object.keys(serverFieldsSchema.shape) as (keyof z.infer<typeof serverFieldsSchema>)[], ...(modern ? ["ssh_host_fingerprint", "public_host"] as const : [])];
  for (const key of keys) {
    if (values[key] !== undefined && values[key] !== "" && values[key] !== (server[key] ?? "")) body[key] = values[key];
  }
  if (values.password !== "") body.password = values.password;
  return body;
}
