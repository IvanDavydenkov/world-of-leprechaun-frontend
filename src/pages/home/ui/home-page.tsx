import { Box, Stack, Typography } from "@mui/material";
import { MyConfigs } from "../../../widgets/my-configs";

export function HomePage() {
  return (
    <>
      <Stack direction="row" sx={{ alignItems: "center", gap: 1, mb: 3 }}>
        <Box sx={{ width: 22, height: "1px", bgcolor: "primary.main" }} />
        <Typography
          sx={{
            color: "primary.main",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: ".2em",
          }}
        >
          ВАШ УГОЛОК СВОБОДЫ
        </Typography>
      </Stack>
      <Box sx={{ mb: { xs: 4, md: 5 } }}>
        <Typography
          component="h1"
          variant="h1"
          sx={{
            fontSize: { xs: 38, sm: 48, md: 60 },
            lineHeight: 1.12,
            letterSpacing: "-.035em",
            mb: 2,
          }}
        >
          Личный кабинет<span style={{ color: "#d9ba73" }}>.</span>
        </Typography>
        <Typography
          sx={{
            color: "text.secondary",
            fontSize: { xs: 14, md: 16 },
            lineHeight: 1.8,
            maxWidth: 540,
          }}
        >
          Всё для вашего подключения — в одном месте.
          <br />
          Меньше суеты, больше открытого мира.
        </Typography>
      </Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) 300px" },
          gap: 3,
          alignItems: "start",
        }}
      >
        <MyConfigs />
        <Stack component="aside" spacing={3}>
          <Box
            id="connection-guide"
            component="section"
            aria-labelledby="guide-title"
            sx={{
              p: 3,
              border: "1px solid rgba(217,186,115,.22)",
              borderRadius: "12px",
              background:
                "linear-gradient(140deg, rgba(217,186,115,.07), rgba(217,186,115,.01))",
            }}
          >
            <Typography
              sx={{
                color: "primary.main",
                fontSize: 10,
                letterSpacing: ".15em",
                mb: 2,
              }}
            >
              ПЕРВЫЕ ШАГИ
            </Typography>
            <Typography
              id="guide-title"
              component="h2"
              variant="h2"
              sx={{ fontSize: 26, mb: 3 }}
            >
              На связи с миром
            </Typography>
            <Stack spacing={2.5}>
              {[
                "Выберите VPN-клиент для вашего устройства.",
                "Загрузите свою конфигурацию из кабинета.",
                "Импортируйте её в клиент и подключитесь.",
              ].map((text, index) => (
                <Stack key={text} direction="row" sx={{ gap: 1.5 }}>
                  <Typography
                    sx={{

                      color: "primary.main",
                      fontSize: 15,
                    }}
                  >
                    0{index + 1}
                  </Typography>
                  <Typography
                    sx={{
                      color: "text.secondary",
                      fontSize: 12,
                      lineHeight: 1.8,
                    }}
                  >
                    {text}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
          <Box sx={{ px: 1 }}>
            <Typography
              sx={{ color: "text.secondary", fontSize: 11, lineHeight: 1.9 }}
            >
              Конфигурация содержит данные доступа.
              <br />
              Храните её так же бережно, как пароль.
            </Typography>
          </Box>
        </Stack>
      </Box>
    </>
  );
}
