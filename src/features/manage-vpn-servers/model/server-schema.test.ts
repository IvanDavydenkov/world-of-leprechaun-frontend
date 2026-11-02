import { expect, it } from "vitest";
import { buildServerCreate, buildServerPatch, modernServerFormSchema, serverFormSchema, serverSchema, serverToForm } from "./server-schema";

import { testServer } from "../testing/server-fixture";

it("проверяет адреса, SSH-ключ, имена и ограничения в байтах", () => {
  const values = { ...testServer, password: "" };
  expect(serverFormSchema.safeParse(values).success).toBe(true);
  expect(serverFormSchema.safeParse({ ...values, ssh_address: "[::1]:22" }).success).toBe(true);
  for (const patch of [
    { ssh_address: "host" }, { public_endpoint: "host:65536" }, { public_endpoint: "host:0" },
    { ssh_host_key: "SHA256:invalid" }, { ssh_host_key: "ssh-ed25519 YQ==" }, { interface: "a".repeat(16) },
    { container: "container; rm" }, { name: "я".repeat(65) }, { password: "я".repeat(2049) },
  ]) expect(serverFormSchema.safeParse({ ...values, ...patch }).success).toBe(false);
});

it("PATCH содержит только изменения, revision и непустой новый пароль", () => {
  expect(buildServerPatch(testServer, { ...testServer, name: "Новый", password: "" })).toEqual({ expected_revision: 1, name: "Новый" });
  expect(buildServerPatch(testServer, { ...testServer, password: "new-secret" })).toEqual({ expected_revision: 1, password: "new-secret" });
});

it("не сохраняет неизвестные поля из ответа сервера", () => {
  expect(serverSchema.parse({ ...testServer, password: "secret", password_ciphertext: "ciphertext" })).toEqual(testServer);
});

it("принимает nullable discovery DTO, не назначая старым записям готовность", () => {
  expect(serverSchema.parse(testServer).preparation_status).toBeUndefined();
  const server = serverSchema.parse({ ...testServer, ssh_host_key: null, ssh_host_fingerprint: `SHA256:${"a".repeat(43)}`, public_host: "vpn.example.org", public_endpoint: null, container: null, interface: null, preparation_status: "not_prepared", prepared_revision: null, checked_at: null, helper: null, last_error_code: null, last_operation_id: null, is_default: false, bindings_counts: { active: 0, revoked: 0, pending: 0 } });
  expect(serverToForm(server).ssh_host_key).toBe("");
  expect(serverToForm(server).ssh_host_fingerprint).toBe(`SHA256:${"a".repeat(43)}`);
});

it("новое создание требует ровно одну доверенную identity и не требует discovery полей", () => {
  const values = { ...testServer, password: "synthetic-password", ssh_host_key: "", ssh_host_fingerprint: `SHA256:${"a".repeat(43)}`, public_endpoint: "", container: "", interface: "" };
  expect(modernServerFormSchema.safeParse(values).success).toBe(true);
  expect(modernServerFormSchema.safeParse({ ...values, ssh_host_key: testServer.ssh_host_key }).success).toBe(false);
  expect(modernServerFormSchema.safeParse({ ...values, ssh_host_fingerprint: "" }).success).toBe(false);
  expect(modernServerFormSchema.safeParse({ ...values, ssh_host_fingerprint: "SHA256:not-valid" }).success).toBe(false);
  const body = buildServerCreate(modernServerFormSchema.parse(values), true);
  expect(body).not.toHaveProperty("ssh_host_key");
  expect(body).not.toHaveProperty("container");
  expect(body).not.toHaveProperty("interface");
  expect(body).not.toHaveProperty("public_endpoint");
  expect(body).toHaveProperty("ssh_host_fingerprint", values.ssh_host_fingerprint);
});

it("не заменяет доверенную identity автоматически при PATCH подготовленной записи", () => {
  const server = { ...testServer, ssh_host_fingerprint: `SHA256:${"a".repeat(43)}` };
  const values = serverToForm(server);
  expect(values.ssh_host_fingerprint).toBeUndefined();
  expect(buildServerPatch(server, { ...values, name: "Новое имя" }, true)).toEqual({ expected_revision: 1, name: "Новое имя" });
});
