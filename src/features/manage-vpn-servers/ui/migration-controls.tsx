import { useCallback, useRef, useState } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
import { useDispatch } from "react-redux";
import { baseApi } from "../../../shared/api";
import { useGetSessionQuery } from "../../../entities/session";
import { useGetServerOperationsQuery, useRunServerCommandMutation } from "../api/migration-api";
import type { MigrationCommand, MigrationIntent, Routing, ServerOperation } from "../model/migration-schema";
import { readMigrationIntent, storeMigrationIntent } from "../model/migration-intent";
import type { VpnServer } from "../model/server-schema";
import { migrationError, operationError } from "../lib/get-migration-error";
import { ServerOperationView, statusLabels } from "./server-operation";

const preparationLabels = { not_prepared: "Не подготовлен", preparing: "Подготовка", needs_input: "Нужен выбор установки", ready: "Готов", failed: "Ошибка подготовки", stale: "Нужна повторная проверка" };
const invalidate = ["VpnServers", "VpnRouting", "ServerOperations", "Users", "MyConfigs"] as const;

export function MigrationControls({ routing, routingError, servers, refresh }: { routing?: Routing; routingError: unknown; servers: VpnServer[]; refresh: () => void }) {
  const { data: session } = useGetSessionQuery();
  if (!session || session.role !== "admin") return null;
  return <ActorMigrationControls key={session.id} actor={session.id} routing={routing} routingError={routingError} servers={servers} refresh={refresh} />;
}

function ActorMigrationControls({ actor, routing, routingError, servers, refresh }: { actor: string; routing?: Routing; routingError: unknown; servers: VpnServer[]; refresh: () => void }) {
  const [intent, setIntent] = useState<MigrationIntent | null>(() => readMigrationIntent(actor));
  const [selectedId, setSelectedId] = useState<string | null>(() => readMigrationIntent(actor)?.operationId || null);
  const [attempt, setAttempt] = useState(0);
  const [message, setMessage] = useState("");
  const [rejected, setRejected] = useState(false);
  const [revokeServer, setRevokeServer] = useState<VpnServer | null>(null);
  const [run, { isLoading }] = useRunServerCommandMutation();
  const sending = useRef(false);
  const dispatch = useDispatch();
  const enabled = !!routing && Object.values(routing.features).some(Boolean);
  const unknown = !!intent && !intent.operationId;
  const locked = isLoading || unknown || !!intent?.operationId;
  const activeId = selectedId || routing?.active_switch_operation_id;
  const onTerminal = useCallback((operation: ServerOperation) => {
    dispatch(baseApi.util.invalidateTags([...invalidate]));
    setIntent((previous) => {
      if (previous?.operationId !== operation.operation_id) return previous;
      storeMigrationIntent(actor, null);
      return null;
    });
  }, [actor, dispatch]);

  async function send(next: MigrationIntent) {
    if (sending.current || !routing || !enabled) return;
    // Запись до POST гарантирует сохранение исходного ключа при потере ответа.
    if (!storeMigrationIntent(actor, next)) {
      setMessage("Браузер запретил сохранение намерения. Разрешите sessionStorage перед запуском операции.");
      return;
    }
    sending.current = true;
    setIntent(next);
    setMessage("");
    setRejected(false);
    try {
      const operation = await run(next).unwrap();
      const confirmed = { ...next, operationId: operation.operation_id };
      storeMigrationIntent(actor, confirmed);
      setIntent(confirmed);
      setSelectedId(operation.operation_id);
      setAttempt((value) => value + 1);
      setRevokeServer(null);
    } catch (error) {
      setMessage(migrationError(error));
      const status = error && typeof error === "object" && "status" in error ? error.status : undefined;
      setRejected(typeof status === "number" && status >= 400 && status < 500);
      dispatch(baseApi.util.invalidateTags(["VpnRouting", "VpnServers", "ServerOperations"]));
    } finally { sending.current = false; }
  }
  function start(command: MigrationCommand) {
    const resumeCurrent = command.kind === "resume" && intent?.operationId === command.operationId;
    if (isLoading || unknown || (locked && !resumeCurrent)) return;
    if (!routing || (command.kind === "prepare" || command.kind === "resume") && !routing.features.prepare || command.kind === "switch" && !routing.features.switch || command.kind === "revoke" && !routing.features.revoke) return;
    void send({ key: crypto.randomUUID(), command });
  }
  const missing = routingError && typeof routingError === "object" && "status" in routingError && routingError.status === 404;
  return <Stack spacing={2} sx={{ mt: 3, minWidth: 0 }}>
    <Typography component="h3" variant="h6">Подготовка и переключение</Typography>
    {!routing ? <Alert severity={missing ? "info" : "warning"}>
      {missing ? "Переключение серверов пока недоступно в этой версии backend" : routingError ? migrationError(routingError) : "Проверяем поддержку переключения серверов…"}
    </Alert> : <>
      {!enabled && <Alert severity="info">Новые действия с серверами отключены в этой версии backend.</Alert>}
      <Typography>Выбран для новых выдач: {servers.find((server) => server.id === routing.default_server_id)?.name || routing.default_server_id || "Не выбран"}</Typography>
      {routing.active_switch_operation_id && <Alert severity="info">Выполняется переключение. Новые переключения временно недоступны.<Button onClick={() => setSelectedId(routing.active_switch_operation_id)}>Показать операцию</Button></Alert>}
      <Alert severity="info">Ubuntu и Amnezia должны быть уже установлены. При подготовке будет установлен или обновлён helper; пользовательские ключи не меняются.</Alert>
      <Typography color="text.secondary">Старые конфиги останутся рабочими. Файлы в кабинете изменятся. Пользователям нужно заново скачать и импортировать конфиг.</Typography>
      {servers.map((server) => <Box key={server.id} sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: "12px", overflowWrap: "anywhere" }}>
        <Typography sx={{ fontWeight: 500 }}>{server.name}</Typography>
        <Typography sx={{ fontSize: 13 }}>Подготовка: {server.preparation_status ? preparationLabels[server.preparation_status] : "Нет данных в этой версии backend"}</Typography>
        <Typography sx={{ fontSize: 13 }} color="text.secondary">VPN: {server.public_endpoint || "Будет определён"} · {server.container || "Контейнер будет определён"} / {server.interface || "Интерфейс будет определён"}</Typography>
        <Typography sx={{ fontSize: 13 }} color="text.secondary">Последняя проверка: {server.checked_at ? new Date(server.checked_at).toLocaleString("ru-RU") : "Нет данных"} · Helper: {server.helper?.version || "Нет данных"}</Typography>
        {server.last_error_code && <Typography color="error" sx={{ fontSize: 13 }}>{operationError(server.last_error_code)}</Typography>}
        {server.last_operation_id && <Button onClick={() => setSelectedId(server.last_operation_id!)} sx={{ minHeight: 44 }}>Показать подготовку</Button>}
        {server.bindings_counts && <Typography sx={{ fontSize: 13 }}>Выдачи: активных {server.bindings_counts.active}, отозванных {server.bindings_counts.revoked}, ожидающих {server.bindings_counts.pending}</Typography>}
        {routing.default_server_id === server.id && <Typography color="primary" sx={{ fontSize: 13 }}>Выбран для новых выдач</Typography>}
        <Stack direction={{ xs: "column", sm: "row" }} sx={{ gap: 1, mt: 2, flexWrap: "wrap" }}>
          <Button disabled={locked || !routing.features.prepare || server.preparation_status === "preparing" || !!routing.active_switch_operation_id} onClick={() => start({ kind: "prepare", serverId: server.id, body: { expected_revision: server.revision } })} sx={{ minHeight: 44 }}>Проверить и подготовить</Button>
          <Button variant="outlined" disabled={locked || !routing.features.switch || !!routing.active_switch_operation_id || server.preparation_status !== "ready"} onClick={() => start({ kind: "switch", body: { target_server_id: server.id, expected_routing_revision: routing.revision } })} sx={{ minHeight: 44 }}>Переключить пользователей сюда</Button>
          <Button color="error" disabled={locked || !routing.features.revoke || routing.default_server_id === server.id || !!routing.active_switch_operation_id} onClick={() => setRevokeServer(server)} sx={{ minHeight: 44 }}>Отозвать выдачи этого сервера</Button>
        </Stack>
      </Box>)}
    </>}
    <Button onClick={refresh} disabled={isLoading} sx={{ alignSelf: "flex-start", minHeight: 44 }}>Обновить серверы и маршрутизацию</Button>
    {message && <Alert severity="warning">{message}</Alert>}
    {intent && <Alert severity="info">{unknown ? "Результат запроса неизвестен. Не создавайте новое намерение: повтор использует прежний ключ." : "Операция принята. Закрытие окна не отменяет её. Успех будет подтверждён статусом операции."}</Alert>}
    {unknown && <Stack direction={{ xs: "column", sm: "row" }} sx={{ gap: 1 }}>
      {!rejected && <Button disabled={isLoading || !enabled} onClick={() => void send(intent!)} sx={{ minHeight: 44 }}>Повторить тот же запрос</Button>}
      {rejected && <Button disabled={isLoading} onClick={() => { storeMigrationIntent(actor, null); setIntent(null); setMessage(""); refresh(); }} sx={{ minHeight: 44 }}>Обновить данные и выбрать новое действие</Button>}
    </Stack>}
    {enabled && <OperationHistory onSelect={setSelectedId} />}
    {enabled && activeId && <ServerOperationView key={`${activeId}:${attempt}`} id={activeId} servers={servers} features={routing!.features} onTerminal={onTerminal} locked={isLoading || unknown || !!intent?.operationId && intent.operationId !== activeId} onCommand={start} />}
    <Dialog open={!!revokeServer} onClose={() => { if (!isLoading) setRevokeServer(null); }} aria-labelledby="server-revoke-title" fullWidth maxWidth="sm">
      <DialogTitle id="server-revoke-title">Отозвать выдачи сервера?</DialogTitle>
      <DialogContent>
        <Typography sx={{ overflowWrap: "anywhere" }}>Сервер: {revokeServer?.name} ({revokeServer?.public_endpoint || revokeServer?.ssh_address}).</Typography>
        <Typography sx={{ mt: 2 }}>Будут отозваны все выдачи только этого сервера. Это отдельное отключение доступа; переключение пользователей не выполняется. Если сервер ещё выбран пользователями, сначала переключите их.</Typography>
      </DialogContent>
      <DialogActions sx={{ flexWrap: "wrap" }}>
        <Button disabled={isLoading} onClick={() => setRevokeServer(null)}>Отмена</Button>
        <Button color="error" disabled={locked || !revokeServer || !routing?.features.revoke} onClick={() => { if (revokeServer) start({ kind: "revoke", body: { scope: "server", server_id: revokeServer.id, all_configs: true } }); }} sx={{ minHeight: 44 }}>Подтвердить отзыв этого сервера</Button>
      </DialogActions>
    </Dialog>
  </Stack>;
}

function OperationHistory({ onSelect }: { onSelect: (id: string) => void }) {
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const { currentData: data, error, isFetching, refetch } = useGetServerOperationsQuery(cursors[cursors.length - 1], { refetchOnFocus: true, refetchOnMountOrArgChange: true });
  return <Stack spacing={1} sx={{ mt: 2 }}>
    <Typography component="h3" variant="h6">Последние операции</Typography>
    {error && <Alert severity="warning">{migrationError(error)}</Alert>}
    {data?.items.map((operation) => <Button key={operation.operation_id} onClick={() => onSelect(operation.operation_id)} sx={{ justifyContent: "flex-start", textAlign: "left", overflowWrap: "anywhere", minHeight: 44 }}>{operation.kind === "prepare" ? "Подготовка" : operation.kind === "switch" ? "Переключение" : "Отзыв"} · {statusLabels[operation.status]} · {new Date(operation.created_at).toLocaleString("ru-RU")}</Button>)}
    {data?.items.length === 0 && <Typography>Операций пока нет.</Typography>}
    <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>
      <Button disabled={isFetching || cursors.length === 1} onClick={() => setCursors((values) => values.slice(0, -1))}>Назад</Button>
      <Button disabled={isFetching || !data?.next_cursor} onClick={() => { if (data?.next_cursor) setCursors((values) => [...values, data.next_cursor]); }}>Следующие операции</Button>
      <Button disabled={isFetching} onClick={() => void refetch()}>Обновить операции</Button>
    </Stack>
  </Stack>;
}
