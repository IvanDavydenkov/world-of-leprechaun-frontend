import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { useGetConfigOperationQuery } from "../api/config-management-api";
import { isTerminal } from "../model/config-operation";
import type { ConfigOperation } from "../model/config-operation";
import { getManagementError } from "../lib/get-management-error";

const labels = {
  pending: "Операция принята",
  running: "Выполняется",
  succeeded: "Выполнено",
  partial: "Выполнено частично",
  failed: "Результат не подтверждён",
};

export function OperationStatus({
  userId,
  operationId,
  onStatus,
}: {
  userId: string;
  operationId: string;
  onStatus: (operation: ConfigOperation) => void;
}) {
  const [polling, setPolling] = useState(2000);
  const {
    currentData: data,
    error,
    isFetching,
    refetch,
  } = useGetConfigOperationQuery(
    { userId, operationId },
    {
      pollingInterval: polling,
      skipPollingIfUnfocused: true,
      refetchOnMountOrArgChange: true,
    },
  );
  useEffect(() => {
    if (data && !isFetching) {
      onStatus(data);
      if (isTerminal(data.status)) setPolling(0);
    }
    if (error) setPolling(0);
  }, [data, error, isFetching, onStatus]);
  return (
    <Stack spacing={2} sx={{ mt: 3 }}>
      {error && (
        <Alert
          severity="error"
          action={
            <Button
              onClick={() => {
                setPolling(2000);
                refetch();
              }}
              disabled={isFetching}
            >
              Проверить
            </Button>
          }
        >
          {getManagementError(error)}
        </Alert>
      )}
      {!data ? (
        <Typography role="status">Проверяем статус операции…</Typography>
      ) : (
        <>
          <Alert
            severity={
              data.status === "succeeded"
                ? "success"
                : data.status === "failed" || data.status === "partial"
                  ? "warning"
                  : "info"
            }
          >
            {labels[data.status]}
            {data.status === "pending" || data.status === "running"
              ? ". Изменения ещё не подтверждены."
              : ""}
          </Alert>
          {!isTerminal(data.status) && (
            <LinearProgress aria-label="Выполнение операции" />
          )}
          <Typography variant="body2">
            Запрошено: {data.requested_count} · Выполнено:{" "}
            {data.succeeded_count ?? "—"} · В процессе:{" "}
            {data.pending_count ?? "—"} · Ошибок: {data.failed_count ?? "—"}
          </Typography>
          {data.items?.map((item) => (
            <Box key={item.config_id} sx={{ overflowWrap: "anywhere" }}>
              <Typography sx={{ fontSize: 12, fontFamily: "monospace" }}>
                {item.config_id}
              </Typography>
              <Typography
                variant="body2"
                color={
                  item.status === "failed" ? "warning.main" : "text.secondary"
                }
              >
                {item.status === "succeeded"
                  ? "Подтверждено"
                  : item.status === "failed"
                    ? "Не подтверждено. Требуется сверка и повтор операции."
                    : "В обработке"}
              </Typography>
            </Box>
          ))}
        </>
      )}
    </Stack>
  );
}
