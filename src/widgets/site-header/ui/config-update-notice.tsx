import { Alert, Container, Typography } from "@mui/material";
import { useGetMyConfigsQuery } from "../../../entities/vpn-config";

export function ConfigUpdateNotice({ userId }: { userId: string }) {
  const storageKey = `notice:config-update:2026-11-02:${encodeURIComponent(userId)}`;
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(storageKey) === "dismissed"; }
    catch { return false; }
  });
  const { currentData: configs, error } = useGetMyConfigsQuery(undefined, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  if (dismissed || error || !configs || configs.length <= 1) return null;

  function dismiss() {
    setDismissed(true);
    try { localStorage.setItem(storageKey, "dismissed"); }
    catch { /* При отключённом storage скрываем до конца текущего посещения. */ }
  }

  return (
    <Container maxWidth="lg" sx={{ pb: 2 }}>
      <Alert severity="info" role="status" onClose={dismiss} closeText="Скрыть уведомление" sx={{ borderRadius: "12px", overflowWrap: "anywhere" }}>
        <Typography component="span" sx={{ display: "block", fontSize: 12, color: "text.secondary", mb: 0.5 }}>
          <time dateTime="2026-11-02">2 ноября 2026</time>
        </Typography>
        Конфиги обновлены. Просто скачайте их заново в личном кабинете и импортируйте в VPN-клиент вместо прежних.
      </Alert>
    </Container>
  );
}
import { useState } from "react";
