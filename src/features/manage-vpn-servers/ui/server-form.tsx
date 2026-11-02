import { useState } from "react";
import { Alert, Box, Button, FormControlLabel, Radio, RadioGroup, Stack, TextField, Typography } from "@mui/material";
import { useSaveVpnServerMutation } from "../api/server-api";
import { buildServerCreate, buildServerPatch, emptyServerForm, modernServerFormSchema, serverFormSchema, serverToForm } from "../model/server-schema";
import type { ServerForm as ServerFormValues, VpnServer } from "../model/server-schema";
import { getServerError } from "../lib/get-server-error";
import { HostKeyCommand } from "./host-key-command";

const fields: { name: keyof ServerFormValues; label: string; help?: string }[] = [
  { name: "name", label: "Название сервера" },
  { name: "ssh_address", label: "Адрес SSH", help: "Адрес и порт, например vpn.example.org:22" },
  { name: "ssh_username", label: "Пользователь SSH" },
  { name: "password", label: "Пароль SSH" },
  { name: "public_endpoint", label: "Публичный VPN-адрес", help: "Адрес и UDP-порт, например vpn.example.org:39977" },
  { name: "container", label: "Контейнер" },
  { name: "interface", label: "Интерфейс" },
  { name: "ssh_host_key", label: "Публичный SSH-ключ сервера", help: "Полный ssh-ed25519 ключ из доверенной консоли, без комментария. Не приватный ключ и не SHA256-отпечаток." },
];

export function ServerForm({ server, onSaved, onBack, onBusy, onReload, modern = false }: {
  server: VpnServer | null;
  onSaved: () => void;
  onBack: () => void;
  onBusy: (value: boolean) => void;
  onReload: () => void;
  modern?: boolean;
}) {
  const [values, setValues] = useState<ServerFormValues>(() => server ? serverToForm(server) : { ...emptyServerForm, ...(modern ? { container: "", interface: "", ssh_host_fingerprint: "", public_host: "" } : {}) });
  const [trustType, setTrustType] = useState(() => server && !server.ssh_host_key && server.ssh_host_fingerprint ? "fingerprint" : "key");
  const [copyMessage, setCopyMessage] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof ServerFormValues, string>>>({});
  const [message, setMessage] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [save, { isLoading }] = useSaveVpnServerMutation();

  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading || blocked) return;
    const parsed = (modern ? modernServerFormSchema : serverFormSchema).safeParse(values);
    const nextErrors: Partial<Record<keyof ServerFormValues, string>> = {};
    if (!parsed.success) for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof ServerFormValues;
      nextErrors[field] ??= issue.message;
    }
    if (!server && !values.password) nextErrors.password = "Укажите пароль SSH";
    setErrors(nextErrors);
    if (!parsed.success || Object.keys(nextErrors).length > 0) return;
    const body = server ? buildServerPatch(server, parsed.data, modern) : buildServerCreate(parsed.data, modern);
    if (server && Object.keys(body).length === 1) {
      setMessage("Измените хотя бы одно поле перед сохранением.");
      return;
    }
    setMessage("");
    onBusy(true);
    try {
      await save({ id: server?.id, body });
      onSaved();
    } catch (error) {
      setMessage(getServerError(error));
      const status = error && typeof error === "object" && "status" in error ? error.status : undefined;
      setConflict(status === 409);
      // При неопределённом результате повтор POST/PATCH может дублировать действие.
      setBlocked(status !== 400 && status !== 503);
    } finally {
      setValues((previous) => ({ ...previous, password: "" }));
      onBusy(false);
    }
  }

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <Typography component="h3" variant="h6" sx={{ mb: 2 }}>
        {server ? "Настройки сервера" : "Новый сервер"}
      </Typography>
      {server && <Typography sx={{ mb: 2, overflowWrap: "anywhere" }} color="text.secondary">
        Версия {server.revision} · Пароль {server.password_set ? "задан" : "не задан"}
      </Typography>}
      {modern && !server && <RadioGroup row value={trustType} onChange={(_event, value) => {
        setTrustType(value);
        setValues((previous) => ({ ...previous, ssh_host_key: "", ssh_host_fingerprint: "" }));
        setErrors({});
      }} aria-label="Проверка подлинности сервера">
        <FormControlLabel value="key" control={<Radio disabled={isLoading || blocked} />} label="Публичный ключ" />
        <FormControlLabel value="fingerprint" control={<Radio disabled={isLoading || blocked} />} label="SHA256-отпечаток" />
      </RadioGroup>}
      {modern && <Typography color="text.secondary" sx={{ fontSize: 13, mb: 2 }}>Параметры Amnezia можно оставить пустыми — они будут определены при подготовке сервера. Ключ или отпечаток получите через доверенную консоль.</Typography>}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
        {[...fields.filter((field) => !modern || field.name !== "ssh_host_key"),
          ...(modern ? [{ name: "public_host" as const, label: "Публичный хост", help: "Если отличается от SSH-адреса или не определяется однозначно; без порта" }] : []),
          ...(modern && trustType === "key" ? [fields[fields.length - 1]] : []),
          ...(modern && trustType === "fingerprint" ? [{ name: "ssh_host_fingerprint" as const, label: "Доверенный ED25519 SHA256-отпечаток", help: "SHA256:… из доверенной консоли, не отпечаток клиентского ключа" }] : []),
        ].map(({ name, label, help }) => (
          <TextField
            key={name}
            label={label}
            value={values[name] ?? ""}
            type={name === "password" ? "password" : "text"}
            autoComplete="off"
            required={name === "password" ? !server : !modern || !["public_host", "public_endpoint", "container", "interface"].includes(name)}
            disabled={isLoading || blocked}
            error={!!errors[name]}
            helperText={errors[name] || (name === "password" && server ? "Оставьте пустым, чтобы сохранить прежний пароль" : help)}
            onChange={(event) => {
              setValues((previous) => ({ ...previous, [name]: event.target.value }));
              setErrors((previous) => ({ ...previous, [name]: undefined }));
              setMessage("");
            }}
            fullWidth
            multiline={name === "ssh_host_key"}
            minRows={name === "ssh_host_key" ? 2 : undefined}
            sx={{ gridColumn: name === "ssh_host_key" ? "1 / -1" : undefined, minWidth: 0 }}
          />
        ))}
      </Box>
      {trustType === "fingerprint" && modern ? <Stack spacing={1} sx={{ mt: 2 }}>
        <Typography color="text.secondary" sx={{ fontSize: 13 }}>Получите отпечаток ED25519-ключа в доверенной консоли сервера:</Typography>
        <Box component="code" sx={{ p: 1.5, bgcolor: "rgba(0,0,0,.2)", borderRadius: 1, fontSize: 12, overflowWrap: "anywhere", userSelect: "all" }}>{`ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub -E sha256 | awk '{print $2}'`}</Box>
        <Button sx={{ alignSelf: "flex-start", minHeight: 44 }} onClick={async () => {
          try { await navigator.clipboard.writeText(`ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub -E sha256 | awk '{print $2}'`); setCopyMessage("Команда скопирована."); }
          catch { setCopyMessage("Не удалось скопировать. Выделите команду и скопируйте вручную."); }
        }}>Копировать команду отпечатка</Button>
        <Typography role="status" color="text.secondary" sx={{ fontSize: 12 }}>{copyMessage}</Typography>
      </Stack> : <HostKeyCommand />}
      {message && <Alert severity="error" sx={{ mt: 2 }} role="alert">{message}</Alert>}
      {conflict && <Button onClick={onReload} sx={{ minHeight: 44, mt: 1 }}>Загрузить актуальную запись</Button>}
      {blocked && !conflict && <Typography sx={{ mt: 1 }} color="text.secondary">Вернитесь к списку и обновите данные перед новой попыткой.</Typography>}
      <Stack direction="row" sx={{ mt: 3, gap: 1, justifyContent: "flex-end", flexWrap: "wrap" }}>
        <Button onClick={onBack} disabled={isLoading} sx={{ minHeight: 44 }}>К списку</Button>
        <Button type="submit" variant="contained" disabled={isLoading || blocked} aria-busy={isLoading} sx={{ minWidth: 130, height: 44 }}>Сохранить</Button>
      </Stack>
    </Box>
  );
}
