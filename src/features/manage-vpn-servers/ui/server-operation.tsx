import { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useGetServerOperationItemsQuery, useGetServerOperationQuery } from "../api/migration-api";
import { isPollingOperation, isTerminalOperation } from "../model/migration-schema";
import type { MigrationCommand, Routing, ServerOperation } from "../model/migration-schema";
import type { VpnServer } from "../model/server-schema";
import { migrationError, operationError } from "../lib/get-migration-error";

export const statusLabels: Record<ServerOperation["status"], string> = {
  queued: "В очереди", running: "Выполняется", needs_input: "Нужен выбор", succeeded: "Завершено", partial: "Выполнено частично", failed: "Завершено с ошибкой",
};
const stepLabels: Record<string, string> = { verify_host_key: "Проверка SSH-ключа", authenticate: "Авторизация", inspect_ubuntu: "Проверка Ubuntu", inspect_docker: "Проверка Docker", discover_awg: "Поиск AmneziaWG", install_helper: "Установка helper", verify_helper: "Проверка helper" };
const itemLabels: Record<string, string> = { pending: "Ожидает", running: "Выполняется", succeeded: "Готово", failed: "Ошибка", skipped: "Пропущен", created: "Создана выдача", reused: "Использована сохранённая выдача", already_selected: "Уже выбран" };

function useVisible() {
  const [visible, setVisible] = useState(!document.hidden);
  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return visible;
}

export function ServerOperationView({ id, servers, features, onTerminal, onCommand, locked }: {
  id: string; servers: VpnServer[]; onTerminal: (operation: ServerOperation) => void;
  onCommand: (command: MigrationCommand) => void; locked: boolean;
  features: Routing["features"];
}) {
  const visible = useVisible();
  const [polling, setPolling] = useState(2000);
  const { currentData: operation, error, isFetching, refetch } = useGetServerOperationQuery(id, { pollingInterval: polling, refetchOnFocus: true, refetchOnMountOrArgChange: true });
  const terminalKey = useRef("");
  useEffect(() => { setPolling(isPollingOperation(operation) ? visible ? 2000 : 15000 : operation ? 0 : 2000); }, [operation, visible]);
  useEffect(() => {
    if (operation && isTerminalOperation(operation) && terminalKey.current !== operation.updated_at) {
      terminalKey.current = operation.updated_at;
      onTerminal(operation);
    }
  }, [operation, onTerminal]);
  const server = servers.find((item) => item.id === operation?.server_id);
  return (
    <Stack spacing={2} sx={{ mt: 3, borderTop: 1, borderColor: "divider", pt: 2, minWidth: 0 }}>
      <Typography component="h3" variant="h6">Операция</Typography>
      <Typography sx={{ overflowWrap: "anywhere", fontSize: 12 }} color="text.secondary">{id}</Typography>
      {error && <Alert severity="warning">Не удалось получить статус. {migrationError(error)}</Alert>}
      <Button onClick={() => void refetch()} disabled={isFetching} sx={{ alignSelf: "flex-start", minHeight: 44 }}>Обновить статус</Button>
      {operation ? <>
        <Alert severity={operation.status === "succeeded" ? "success" : operation.status === "partial" || operation.status === "failed" ? "warning" : "info"}>
          {statusLabels[operation.status]} · {operation.phase === "planning" ? "План формируется" : operation.phase === "processing" ? "Обработка" : operation.phase === "waiting_input" ? "Ожидание выбора" : "Попытка завершена"}
        </Alert>
        <Typography>Тип: {operation.kind === "prepare" ? "Подготовка" : operation.kind === "switch" ? "Переключение" : "Отзыв"}. Сервер: {servers.find((item) => item.id === (operation.target_server_id || operation.server_id))?.name || operation.target_server_id || operation.server_id || "Все серверы"}</Typography>
        {operation.counts ? <Typography>
          Всего: {operation.counts.requested_count} · Успешно: {operation.counts.succeeded_count} · Ошибок: {operation.counts.failed_count} · Ожидает: {operation.counts.pending_count} · Пропущено: {operation.counts.skipped_count}
        </Typography> : <Typography color="text.secondary">{operation.kind === "prepare" ? "Подготовка сервера" : "План формируется"}</Typography>}
        {operation.error_code && <Alert severity="warning">{operationError(operation.error_code)}</Alert>}
        {(operation.status === "partial" || operation.status === "failed") && operation.kind === "switch" && <Typography>Успешные элементы и выбранный сервер для новых выдач не откатились.</Typography>}
        {operation.steps.map((step, index) => <Box key={index}>
          <Typography>{stepLabels[step.name || step.step || ""] || `Шаг ${index + 1}`}: {itemLabels[step.status] || step.status}</Typography>
          {step.error_code && <Typography color="error">{operationError(step.error_code)}</Typography>}
        </Box>)}
        {operation.status === "needs_input" && operation.kind === "prepare" && <DiscoverySelection key={operation.updated_at} operation={operation} revision={server?.revision} locked={locked || !features.prepare} onCommand={onCommand} />}
        {isTerminalOperation(operation) && operation.retryable && <Button variant="outlined" disabled={locked || !features[operation.kind]} onClick={() => onCommand({ kind: "retry", operationId: id, body: {} })} sx={{ minHeight: 44, alignSelf: "flex-start" }}>Повторить неуспешные элементы</Button>}
        {operation.kind !== "prepare" && <OperationItems key={id} id={id} version={operation.updated_at} />}
      </> : <Typography role="status">Загружаем операцию…</Typography>}
    </Stack>
  );
}

function DiscoverySelection({ operation, revision, locked, onCommand }: { operation: ServerOperation; revision?: number; locked: boolean; onCommand: (command: MigrationCommand) => void }) {
  const [candidateId, setCandidateId] = useState("");
  const [port, setPort] = useState("");
  const [host, setHost] = useState("");
  const candidates = operation.details?.candidates || [];
  const required = operation.details?.required_fields || [];
  const candidate = candidates.find((item) => item.candidate_id === candidateId);
  const known = required.every((field) => ["candidate_id", "udp_port", "public_host"].includes(field));
  const valid = known && revision != null && (!required.includes("candidate_id") || !!candidate) && (!required.includes("udp_port") || !!candidate?.published_udp_ports.includes(Number(port))) && (!required.includes("public_host") || !!host.trim());
  return <Stack spacing={2}>
    <Typography>Выберите установку из результатов проверки. Выбор не подставляется автоматически.</Typography>
    {(required.includes("candidate_id") || required.includes("udp_port")) && <TextField select label="Обнаруженная установка" value={candidateId} onChange={(event) => { setCandidateId(event.target.value); setPort(""); }}>
      {candidates.map((item) => <MenuItem key={item.candidate_id} value={item.candidate_id}>{item.container} / {item.interface}</MenuItem>)}
    </TextField>}
    {required.includes("udp_port") && <TextField select label="Опубликованный UDP-порт" value={port} onChange={(event) => setPort(event.target.value)} disabled={!candidate}>
      {(candidate?.published_udp_ports || []).map((value) => <MenuItem key={value} value={String(value)}>{value}</MenuItem>)}
    </TextField>}
    {required.includes("public_host") && <TextField label="Публичный адрес сервера" value={host} onChange={(event) => setHost(event.target.value)} helperText="Без схемы и порта" />}
    {!known && <Alert severity="warning">Требуются неизвестные этой версии интерфейса поля. Обновите приложение.</Alert>}
    <Button disabled={locked || !valid} onClick={() => {
      if (!valid || revision == null) return;
      onCommand({ kind: "resume", operationId: operation.operation_id, body: { expected_revision: revision, selection: {
        ...(candidate ? { candidate_id: candidate.candidate_id } : {}), ...(required.includes("udp_port") ? { udp_port: Number(port) } : {}), ...(required.includes("public_host") ? { public_host: host.trim() } : {}),
      } } });
    }} sx={{ minHeight: 44 }}>Продолжить подготовку</Button>
  </Stack>;
}

function OperationItems({ id, version }: { id: string; version: string }) {
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const { currentData: data, error, isFetching, refetch } = useGetServerOperationItemsQuery({ id, after: cursors[cursors.length - 1], version }, { refetchOnFocus: true });
  const countAction = (action: string) => data?.items.filter((item) => item.action === action).length || 0;
  return <Stack spacing={1}>
    <Typography component="h4" sx={{ fontWeight: 500 }}>Результаты · страница {cursors.length}</Typography>
    {error && <Alert severity="warning">Не удалось загрузить элементы. {migrationError(error)}</Alert>}
    <Typography sx={{ fontSize: 12 }} color="text.secondary">На текущей странице: создано {countAction("created")}, повторно использовано {countAction("reused")}, уже выбрано {countAction("already_selected")}. Это не общая сводка.</Typography>
    {data?.items.map((item) => <Box key={item.item_id} sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 1.5, overflowWrap: "anywhere" }}>
      <Typography sx={{ fontSize: 13 }}>Пользователь: {item.user_id} · Конфиг: {item.config_id}</Typography>
      <Typography sx={{ fontSize: 13 }}>{itemLabels[item.status]}{item.action ? ` · ${itemLabels[item.action]}` : ""} · Попыток: {item.attempts}</Typography>
      {item.error_code && <Typography sx={{ fontSize: 13 }} color="error">{operationError(item.error_code)}</Typography>}
    </Box>)}
    {data?.items.length === 0 && <Typography>На этой странице пока нет элементов.</Typography>}
    <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>
      <Button disabled={isFetching || cursors.length === 1} onClick={() => setCursors((values) => values.slice(0, -1))}>Назад</Button>
      <Button disabled={isFetching || !data?.next_cursor} onClick={() => { if (data?.next_cursor) setCursors((values) => [...values, data.next_cursor]); }}>Следующая страница</Button>
      <Button disabled={isFetching} onClick={() => void refetch()}>Обновить элементы</Button>
    </Stack>
  </Stack>;
}
