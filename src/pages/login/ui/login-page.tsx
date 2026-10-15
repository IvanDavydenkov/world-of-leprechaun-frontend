import { Alert, Box, Button, Paper, Stack, Typography } from "@mui/material";
import { Navigate, useSearchParams } from "react-router-dom";
import { useGetSessionQuery } from "../../../entities/session";
import { BrandMark } from "../../../shared/ui/brand-mark";

export function LoginPage() {
  const [params] = useSearchParams();
  const { data, error, isLoading, isFetching, refetch } = useGetSessionQuery(
    undefined,
    {
      refetchOnFocus: true,
      refetchOnReconnect: true,
    },
  );
  if (data && !error) return <Navigate to="/" replace />;
  const guest = error && "status" in error && error.status === 401;
  const unavailable = !!error && !guest;

  return (
    <Box sx={{ maxWidth: 480, mx: "auto", py: { xs: 1, md: 4 } }}>
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 3, sm: 5 },
          borderRadius: "24px",
          backgroundImage: "none",
        }}
      >
        <Stack spacing={3}>
          <BrandMark sx={{ color: "primary.main", fontSize: 48 }} />
          <Box>
            <Typography
              component="h1"
              variant="h1"
              sx={{ fontSize: { xs: 34, sm: 42 }, mb: 2 }}
            >
              Добро пожаловать<span style={{ color: "#d9ba73" }}>.</span>
            </Typography>
            <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
              Войдите в свой уголок свободы, чтобы получить доступ к личному
              кабинету.
            </Typography>
          </Box>
          {params.has("auth_error") && (
            <Alert severity="warning">
              Вход не завершён: вы могли отказаться или прервать процесс, либо
              сервис временно недоступен. Попробуйте снова.
            </Alert>
          )}
          {isLoading ? (
            <Typography role="status">Проверяем сессию…</Typography>
          ) : unavailable ? (
            <>
              <Alert severity="error">
                Не удалось проверить сессию. Проверьте соединение или повторите
                попытку позже.
              </Alert>
              <Button
                onClick={() => refetch()}
                disabled={isFetching}
                variant="outlined"
              >
                Повторить проверку
              </Button>
            </>
          ) : (
            <Button
              component="a"
              href="/auth/yandex/login"
              variant="contained"
              size="large"
              sx={{ minHeight: 52 }}
            >
              Войти через Яндекс
            </Button>
          )}
          <Typography
            color="text.secondary"
            sx={{ fontSize: 12, lineHeight: 1.8 }}
          >
            Вы перейдёте на страницу Яндекса для подтверждения входа. Пароль
            остаётся у Яндекса. Если передумаете, вернитесь на эту страницу —
            вход можно начать заново.
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
