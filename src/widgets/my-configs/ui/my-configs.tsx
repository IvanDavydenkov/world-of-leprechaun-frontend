import {
  Alert,
  Box,
  Button,
  Chip,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useGetMyConfigsQuery } from "../../../entities/vpn-config";
import { DownloadConfigButton } from "../../../features/download-config";
import { BrandMark } from "../../../shared/ui/brand-mark";

export function MyConfigs() {
  const {
    currentData: configs,
    error,
    isFetching,
    refetch,
  } = useGetMyConfigsQuery(undefined, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const unauthorized = error && "status" in error && error.status === 401;

  return (
    <Paper
      id="configurations"
      component="section"
      aria-labelledby="configurations-title"
      variant="outlined"
      sx={{
        minWidth: 0,
        overflow: "hidden",
        backgroundImage: "none",
        borderRadius: "12px",
      }}
    >
      <Stack
        direction="row"
        sx={{
          p: { xs: 2.5, sm: 3 },
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box>
          <Typography
            id="configurations-title"
            component="h2"
            sx={{ fontSize: { xs: 18, sm: 21 } }}
          >
            Мои конфиги
          </Typography>
          {configs && !error && (
            <Typography color="text.secondary" sx={{ fontSize: 12, mt: 0.5 }}>
              Доступно: {configs.length}
            </Typography>
          )}
        </Box>
        <Button
          onClick={() => refetch()}
          disabled={isFetching}
          sx={{ minHeight: 44 }}
        >
          Обновить
        </Button>
      </Stack>
      {isFetching && <LinearProgress aria-label="Загрузка конфигов" />}
      {error ? (
        <Box sx={{ p: 3 }}>
          <Alert severity="error">
            {unauthorized
              ? "Сессия истекла. Войдите заново."
              : "Не удалось загрузить конфиги. Проверьте соединение или повторите позже."}
          </Alert>
          {unauthorized ? (
            <Button href="/login" sx={{ mt: 2 }}>
              Войти
            </Button>
          ) : (
            <Button
              onClick={() => refetch()}
              disabled={isFetching}
              sx={{ mt: 2 }}
            >
              Повторить
            </Button>
          )}
        </Box>
      ) : !configs ? (
        <Typography role="status" sx={{ p: 3 }}>
          Загружаем ваши конфиги…
        </Typography>
      ) : configs.length === 0 ? (
        <Stack
          sx={{ alignItems: "center", px: 3, py: 6, textAlign: "center" }}
          spacing={2}
        >
          <BrandMark sx={{ fontSize: 48, color: "primary.main" }} />
          <Typography
            component="h3"
            sx={{ fontSize: 26 }}
          >
            Пока нет активных конфигов
          </Typography>
          <Typography
            color="text.secondary"
            sx={{ fontSize: 14, lineHeight: 1.8 }}
          >
            Когда администратор выдаст конфиг, он появится здесь. Если выдача
            уже началась, обновите список чуть позже.
          </Typography>
        </Stack>
      ) : (
        <Stack
          component="ul"
          sx={{ listStyle: "none", p: 0, m: 0 }}
          divider={<Box sx={{ borderBottom: 1, borderColor: "divider" }} />}
        >
          {configs.map((config) => (
            <Box
              component="li"
              key={`${config.id}:${config.version}`}
              sx={{ p: { xs: 2.5, sm: 3 }, overflowWrap: "anywhere" }}
            >
              <Stack
                direction={{ xs: "column", sm: "row" }}
                sx={{
                  justifyContent: "space-between",
                  alignItems: { xs: "stretch", sm: "center" },
                  gap: 3,
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Stack
                    direction="row"
                    sx={{
                      gap: 1.5,
                      alignItems: "center",
                      flexWrap: "wrap",
                      mb: 1,
                    }}
                  >
                    <Typography component="h3" sx={{ fontSize: 18 }}>
                      {config.name || "Без названия"}
                    </Typography>
                    <Chip
                      size="small"
                      variant="outlined"
                      label="Активен"
                      color="secondary"
                    />
                  </Stack>
                  <Typography
                    color="text.secondary"
                    sx={{ fontSize: 12, lineHeight: 1.8 }}
                  >
                    Версия {config.version} ·{" "}
                    {new Intl.DateTimeFormat("ru-RU", {
                      dateStyle: "medium",
                    }).format(new Date(config.created_at))}
                  </Typography>
                  <Typography
                    color="text.secondary"
                    sx={{ fontFamily: "monospace", fontSize: 11, mt: 0.5 }}
                  >
                    {config.id}
                  </Typography>
                </Box>
                <Box sx={{ width: { xs: "100%", sm: 170 }, flexShrink: 0 }}>
                  <DownloadConfigButton config={config} />
                </Box>
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
      <Box
        sx={{
          px: 3,
          py: 2,
          borderTop: 1,
          borderColor: "divider",
          bgcolor: "rgba(0,0,0,.1)",
        }}
      >
        <Typography
          color="text.secondary"
          sx={{ fontSize: 12, lineHeight: 1.8 }}
        >
          Конфиг содержит данные доступа. Не передавайте файл другим людям.
        </Typography>
      </Box>
    </Paper>
  );
}
