import { Alert, Button, Stack, Typography } from "@mui/material";
import type { PersonalConfig } from "../../../entities/vpn-config";
import { useDownloadConfigMutation } from "../api/download-config-api";
import { useEffect, useRef } from "react";

export function DownloadConfigButton({ config }: { config: PersonalConfig }) {
  const [download, { isLoading, isSuccess, error }] =
    useDownloadConfigMutation();
  const requestRef = useRef<ReturnType<typeof download> | null>(null);
  useEffect(
    () => () => {
      requestRef.current?.abort();
    },
    [],
  );
  const status = error && "status" in error ? error.status : undefined;
  return (
    <Stack spacing={1}>
      <Button
        variant="contained"
        disabled={!config.download_available || isLoading}
        onClick={() => {
          requestRef.current = download(config.id);
        }}
        sx={{ height: 44, minWidth: 120, flexShrink: 0 }}
        aria-busy={isLoading}
        aria-label={`Скачать ${config.name || "конфиг"}`}
      >
        Скачать
      </Button>
      {!config.download_available && (
        <Typography color="text.secondary" sx={{ fontSize: 12 }}>
          Клиентский файл пока недоступен.
        </Typography>
      )}
      {isSuccess && !error && (
        <Typography role="status" color="text.secondary" sx={{ fontSize: 12 }}>
          Файл передан браузеру для сохранения.
        </Typography>
      )}
      {error && (
        <Alert severity="error">
          {status === 401
            ? "Сессия истекла. Войдите заново."
            : status === 404
              ? "Конфиг больше недоступен. Обновите список."
              : "Не удалось скачать конфиг. Попробуйте ещё раз."}
        </Alert>
      )}
    </Stack>
  );
}
