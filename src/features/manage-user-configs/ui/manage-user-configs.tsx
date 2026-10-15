import { useCallback, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { UserOverview } from "../../../entities/user";
import { useChangeConfigsMutation } from "../api/config-management-api";
import { countSchema, isTerminal } from "../model/config-operation";
import type {
  ConfigAction,
  ConfigOperation,
  ConfigRequest,
} from "../model/config-operation";
import { getManagementError } from "../lib/get-management-error";
import { OperationStatus } from "./operation-status";

export function ManageUserConfigs({ user }: { user: UserOverview }) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState("1");
  const [fieldError, setFieldError] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmation, setConfirmation] = useState<ConfigAction | null>(null);
  const [lastRequest, setLastRequest] = useState<ConfigRequest | null>(null);
  const [operation, setOperation] = useState<ConfigOperation | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [changeConfigs, { isLoading, error, reset }] =
    useChangeConfigsMutation();
  const receiveStatus = useCallback((value: ConfigOperation) => {
    setOperation(value);
    if (value.status === 'succeeded') setSelected([]);
  }, []);
  const unresolved = !!lastRequest && operation?.status !== "succeeded";
  const locked = isLoading || unresolved;
  const configs =
    user.vpn?.availability === "available" ? user.vpn.configs : null;
  const revocable =
    configs?.filter((config) => config.status !== "deleted") ?? [];
  const selectedIds = selected.filter((id) =>
    revocable.some((config) => config.id === id),
  );
  const terminal = operation && isTerminal(operation.status);

  async function send(request: ConfigRequest) {
    setLastRequest(request);
    setConfirmation(null);
    setAttempt((value) => value + 1);
    reset();
    try {
      setOperation(await changeConfigs(request).unwrap());
    } catch {
      /* Показываем RTK Query error, сохраняя ключ для повтора. */
    }
  }
  function start(action: ConfigAction) {
    setOperation(null);
    send({ userId: user.id, key: crypto.randomUUID(), action });
  }
  function create() {
    const result = countSchema.safeParse(count);
    if (!result.success) {
      setFieldError(result.error.issues[0].message);
      return;
    }
    setFieldError("");
    start({ kind: "create", count: result.data });
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        sx={{ display: "block", minHeight: 44, px: 0, fontSize: 12 }}
      >
        Управлять
      </Button>
      <Dialog
        open={open}
        onClose={() => {
          if (!isLoading) setOpen(false);
        }}
        fullWidth
        maxWidth="sm"
        aria-labelledby={`manage-user-${user.id}`}
        slotProps={{
          paper: {
            sx: {
              m: { xs: 1, sm: 4 },
              width: { xs: "calc(100% - 16px)", sm: undefined },
              borderRadius: "12px",
              backgroundImage: 'none',
              bgcolor: 'background.paper',
            },
          },
        }}
      >
        <DialogTitle id={`manage-user-${user.id}`}>
          Конфиги пользователя
          <Typography
            component="span"
            sx={{
              display: "block",
              fontSize: 14,
              color: "text.secondary",
              mt: 1,
              overflowWrap: "anywhere",
            }}
          >
            {user.display_name || user.id}
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {user.vpn?.availability === "available" && user.vpn.counts
              ? `Всего: ${user.vpn.counts.total} · Активных: ${user.vpn.counts.active}`
              : "Количество конфигов пока не получено от сервера."}
          </Typography>
          <Stack
            component="form"
            noValidate
            spacing={2}
            onSubmit={(event) => {
              event.preventDefault();
              if (!locked) create();
            }}
          >
            <TextField
              label="Добавить конфигов"
              type="number"
              value={count}
              onChange={(event) => {
                setCount(event.target.value);
                setFieldError("");
              }}
              disabled={locked}
              error={!!fieldError}
              helperText={
                fieldError || "От 1 до 20 новых конфигов. Текущие сохраняются."
              }
              slotProps={{ htmlInput: { min: 1, max: 20, step: 1 } }}
            />
            <Button
              variant="contained"
              type="submit"
              disabled={locked}
              sx={{ minHeight: 44 }}
            >
              {isLoading ? "Отправляем…" : "Выписать конфиги"}
            </Button>
          </Stack>
          <Divider sx={{ my: 3 }} />
          <Typography component="h3" sx={{ fontSize: 17, mb: 2 }}>
            Отключить доступ
          </Typography>
          {configs == null ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              Сервер пока не передаёт список конфигов. Выбор отдельных конфигов
              недоступен.
            </Alert>
          ) : revocable.length === 0 ? (
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Нет конфигов для отключения.
            </Typography>
          ) : (
            <Stack spacing={1} sx={{ mb: 2 }}>
              {revocable.map((config) => (
                <Box
                  key={config.id}
                  sx={{ borderBottom: 1, borderColor: "divider", pb: 1 }}
                >
                  <FormControlLabel
                    sx={{ m: 0, overflowWrap: "anywhere" }}
                    control={
                      <Checkbox
                        checked={selectedIds.includes(config.id)}
                        disabled={
                          locked ||
                          (!selectedIds.includes(config.id) &&
                            selectedIds.length >= 100)
                        }
                        onChange={(_, checked) =>
                          setSelected((previous) =>
                            checked
                              ? [...previous, config.id]
                              : previous.filter((id) => id !== config.id),
                          )
                        }
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2">
                          {config.name || config.id}
                        </Typography>
                        <Typography
                          sx={{ fontSize: 11, color: "text.secondary" }}
                        >
                          {config.id}
                        </Typography>
                      </Box>
                    }
                  />
                  <Button
                    color="warning"
                    onClick={() =>
                      setConfirmation({ kind: "single", configId: config.id })
                    }
                    disabled={locked}
                    sx={{ minHeight: 44 }}
                  >
                    Отключить конфиг
                  </Button>
                </Box>
              ))}
            </Stack>
          )}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button
              color="warning"
              variant="outlined"
              disabled={locked || selectedIds.length === 0}
              onClick={() =>
                setConfirmation({ kind: "selected", configIds: selectedIds })
              }
              sx={{ minHeight: 44 }}
            >
              Отключить выбранные ({selectedIds.length})
            </Button>
            <Button
              color="error"
              variant="outlined"
              disabled={locked || (configs != null && revocable.length === 0)}
              onClick={() => setConfirmation({ kind: "all" })}
              sx={{ minHeight: 44 }}
            >
              Отключить все
            </Button>
          </Stack>
          {confirmation && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                {confirmation.kind === "all"
                  ? "Отключить все конфиги пользователя, включая незавершённые выдачи?"
                  : confirmation.kind === "single"
                    ? "Отключить выбранный конфиг пользователя?"
                    : `Отключить выбранные конфиги: ${confirmation.kind === "selected" ? confirmation.configIds.length : 0}?`}{" "}
                Доступ будет отозван. История сохранится.
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Button
                  color="error"
                  onClick={() => start(confirmation)}
                  disabled={locked}
                >
                  Подтвердить отключение
                </Button>
                <Button onClick={() => setConfirmation(null)}>Отмена</Button>
              </Stack>
            </Alert>
          )}
          {error && (
            <Alert severity="error" sx={{ mt: 3 }}>
              {getManagementError(error)}
            </Alert>
          )}
          {operation && !isLoading && (
            <OperationStatus
              key={`${operation.operation_id}:${attempt}`}
              userId={user.id}
              operationId={operation.operation_id}
              onStatus={receiveStatus}
            />
          )}
          {lastRequest &&
            (error || (terminal && operation.status !== "succeeded")) && (
              <Button
                sx={{ mt: 2, minHeight: 44 }}
                disabled={isLoading}
                onClick={() => send(lastRequest)}
              >
                Повторить тот же запрос
              </Button>
            )}
          {lastRequest &&
            error &&
            typeof error === "object" &&
            "status" in error &&
            [400, 403, 404, 409].includes(Number(error.status)) && (
              <Button
                onClick={() => {
                  setLastRequest(null);
                  setOperation(null);
                  reset();
                }}
                sx={{ mt: 2 }}
              >
                Изменить действие
              </Button>
            )}
          {unresolved && (
            <Typography color="text.secondary" sx={{ mt: 2, fontSize: 12 }}>
              Закрытие окна не отменяет принятую сервером операцию. Не
              создавайте повторную выдачу с новым ключом при неизвестном
              результате.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpen(false)}
            disabled={isLoading}
            sx={{ minHeight: 44 }}
          >
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
