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
export const serverSchema = serverFieldsSchema.extend({
  id: z.string().min(1),
  revision: z.number().int().positive(),
  password_set: z.boolean(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});
export type VpnServer = z.infer<typeof serverSchema>;
export type ServerForm = z.infer<typeof serverFormSchema>;
export type SaveServerRequest = { id?: string; body: Partial<ServerForm> & { expected_revision?: number } };
export const emptyServerForm: ServerForm = {
  name: "", ssh_address: "", ssh_username: "", ssh_host_key: "", public_endpoint: "", container: "amnezia-awg2", interface: "awg0", password: "",
};
export function serverToForm(server: VpnServer): ServerForm {
  return { ...serverFieldsSchema.parse(server), password: "" };
}
export function buildServerPatch(server: VpnServer, values: ServerForm): SaveServerRequest["body"] {
  const body: SaveServerRequest["body"] = { expected_revision: server.revision };
  for (const key of Object.keys(serverFieldsSchema.shape) as (keyof z.infer<typeof serverFieldsSchema>)[]) {
    if (values[key] !== server[key]) body[key] = values[key];
  }
  if (values.password !== "") body.password = values.password;
  return body;
}
