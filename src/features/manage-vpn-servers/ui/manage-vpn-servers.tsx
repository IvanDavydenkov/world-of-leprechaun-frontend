import { useState } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, Stack, Typography } from "@mui/material";
import { useGetVpnServersQuery, useLazyGetVpnServerQuery } from "../api/server-api";
import type { VpnServer } from "../model/server-schema";
import { getServerError } from "../lib/get-server-error";
import { ServerForm } from "./server-form";

export function ManageVpnServers({ onClose }: { onClose: () => void }) {
  const { currentData: servers, isFetching, error, refetch } = useGetVpnServersQuery(undefined, { refetchOnMountOrArgChange: true });
  const [loadServer, { isFetching: loadingServer }] = useLazyGetVpnServerQuery();
  const [selected, setSelected] = useState<VpnServer | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [detailError, setDetailError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);
  const [formKey, setFormKey] = useState(0);

  async function edit(id: string) {
    setDetailError(null);
    setSaved(false);
    try {
      const result = await loadServer(id, false).unwrap();
      setSelected(result);
      setFormKey((value) => value + 1);
      setEditing(true);
    } catch (failure) { setDetailError(failure); }
  }
  const close = () => { if (!busy) onClose(); };
  return (
    <Dialog open onClose={close} fullWidth maxWidth="md" aria-labelledby="vpn-servers-title"
      slotProps={{ paper: { sx: { m: { xs: 1, sm: 4 }, width: { xs: "calc(100% - 16px)", sm: undefined }, borderRadius: "12px", backgroundImage: "none" } } }}>
      <DialogTitle id="vpn-servers-title">Серверы VPN</DialogTitle>
      <DialogContent dividers sx={{ px: { xs: 2, sm: 3 } }}>
        <Alert severity="info" role="note" sx={{ mb: 3 }}>Здесь сохраняются параметры серверов. Сохранение не устанавливает VPN и не переключает сервер для выдачи конфигов.</Alert>
        {(isFetching || loadingServer) && <LinearProgress aria-label="Загрузка серверов" sx={{ mb: 2 }} />}
        {detailError != null && <Alert severity="error" sx={{ mb: 2 }}>{getServerError(detailError)}</Alert>}
        {editing ? (
          <ServerForm key={formKey} server={selected} onBusy={setBusy}
            onReload={() => { if (selected) void edit(selected.id); }}
            onBack={() => { setEditing(false); setSelected(null); setDetailError(null); void refetch(); }}
            onSaved={() => { setEditing(false); setSelected(null); setSaved(true); }} />
        ) : (
          <>
            <Stack direction="row" sx={{ gap: 1, justifyContent: "space-between", mb: 2, flexWrap: "wrap" }}>
              <Button variant="contained" disabled={loadingServer || !servers || !!error} sx={{ minHeight: 44 }} onClick={() => {
                setSelected(null); setEditing(true); setSaved(false); setDetailError(null); setFormKey((value) => value + 1);
              }}>Добавить сервер</Button>
              <Button disabled={isFetching || loadingServer} onClick={() => { setSaved(false); setDetailError(null); void refetch(); }} sx={{ minHeight: 44 }}>Обновить список</Button>
            </Stack>
            {saved && <Alert severity="success" sx={{ mb: 2 }}>Настройки сохранены в реестре.</Alert>}
            {error ? <Alert severity="error">{getServerError(error)}</Alert> : !servers ? (
              <Typography role="status">Загружаем серверы…</Typography>
            ) : servers.length === 0 ? <Typography>Серверы ещё не добавлены.</Typography> : (
              <Stack component="ul" spacing={2} sx={{ p: 0, m: 0, listStyle: "none" }}>
                {servers.map((server) => (
                  <Box component="li" key={server.id} sx={{ border: 1, borderColor: "divider", borderRadius: "12px", p: 2, minWidth: 0 }}>
                    <Stack direction={{ xs: "column", sm: "row" }} sx={{ justifyContent: "space-between", gap: 1 }}>
                      <Box sx={{ minWidth: 0, overflowWrap: "anywhere" }}>
                        <Typography component="h3" sx={{ fontWeight: 500 }}>{server.name}</Typography>
                        <Typography color="text.secondary" sx={{ fontSize: 13, mt: 0.5 }}>SSH: {server.ssh_address} · {server.ssh_username}</Typography>
                        <Typography color="text.secondary" sx={{ fontSize: 13 }}>VPN: {server.public_endpoint}</Typography>
                        <Typography color="text.secondary" sx={{ fontSize: 12 }}>Версия {server.revision} · {server.container} / {server.interface}</Typography>
                      </Box>
                      <Button disabled={loadingServer || isFetching} onClick={() => void edit(server.id)} aria-label={`Настроить ${server.name}`} sx={{ minHeight: 44, alignSelf: { sm: "center" }, flexShrink: 0 }}>Настроить</Button>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions><Button onClick={close} disabled={busy} sx={{ minHeight: 44 }}>Закрыть</Button></DialogActions>
    </Dialog>
  );
}
