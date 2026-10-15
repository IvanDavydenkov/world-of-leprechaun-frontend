import { Alert, Button, Stack, Typography } from "@mui/material";
import { Navigate, Outlet } from "react-router-dom";
import { useGetSessionQuery } from "../../entities/session";

export function SessionGuard() {
  const { data, error, isLoading, isFetching, refetch } = useGetSessionQuery(
    undefined,
    {
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
      refetchOnReconnect: true,
      pollingInterval: 60000,
      skipPollingIfUnfocused: true,
    },
  );
  if (isLoading)
    return <Typography role="status">Проверяем сессию…</Typography>;
  if (error && "status" in error && error.status === 401)
    return <Navigate to="/login" replace />;
  if (error || !data)
    return (
      <Stack spacing={2} sx={{ maxWidth: 520, mx: "auto" }}>
        <Alert severity="error">
          Не удалось проверить сессию. Кабинет временно недоступен.
        </Alert>
        <Button onClick={() => refetch()} disabled={isFetching}>
          Повторить проверку
        </Button>
      </Stack>
    );
  return <Outlet />;
}
