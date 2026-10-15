import { expect, it } from "vitest";
import { buildServerPatch, serverFormSchema, serverSchema } from "./server-schema";

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
