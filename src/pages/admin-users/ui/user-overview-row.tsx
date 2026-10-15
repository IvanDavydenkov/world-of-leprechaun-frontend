import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Stack,
  TableCell,
  TableRow,
  Typography,
} from "@mui/material";
import type { UserOverview } from "../../../entities/user";
import { formatBytes, formatTimestamp } from "../lib/format-usage";
import { ManageUserConfigs } from "../../../features/manage-user-configs";

const statuses = {
  active: "Активен",
  deleted: "Отключён",
  creating: "Создаётся",
  deleting: "Отключается",
  reactivating: "Активируется",
};

export function UserOverviewRow({ user }: { user: UserOverview }) {
  const [expanded, setExpanded] = useState(false);
  const available = user.vpn?.availability === "available";
  const counts = available ? user.vpn?.counts : null;
  const traffic = available ? user.vpn?.traffic : null;
  const configs = available ? user.vpn?.configs : null;
  const measured = traffic && traffic.freshness !== "unavailable";
  const detailsId = `user-details-${user.id}`;

  return (
    <>
      <TableRow hover>
        <TableCell component="th" scope="row">
          <Typography sx={{ fontSize: 14, mb: 1 }}>
            {user.display_name || "Без имени"}
          </Typography>
          <Typography
            color="text.secondary"
            sx={{ fontSize: 11, fontFamily: "monospace", mb: 1 }}
          >
            {user.id}
          </Typography>
          <Chip
            size="small"
            label={user.role === "admin" ? "Админ" : "User"}
            variant="outlined"
            color={user.role === "admin" ? "primary" : "default"}
          />
          <Button
            aria-expanded={expanded}
            aria-controls={detailsId}
            onClick={() => setExpanded((previous) => !previous)}
            sx={{ display: "block", minHeight: 44, px: 0, fontSize: 12 }}
          >
            {expanded ? "Свернуть" : "Подробнее"}
          </Button>
          <ManageUserConfigs user={user} />
        </TableCell>
        <TableCell sx={{ verticalAlign: "top" }}>
          {counts ? (
            <Stack spacing={1}>
              <Typography sx={{ fontSize: 16, fontWeight: 600 }}>
                {counts.total}
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: 11 }}>
                Активных: {counts.active}
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: 11 }}>
                Отключено: {counts.disabled}
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: 11 }}>
                В процессе: {counts.pending}
              </Typography>
            </Stack>
          ) : (
            <Typography color="text.secondary" sx={{ fontSize: 12 }}>
              Нет данных
            </Typography>
          )}
        </TableCell>
        <TableCell sx={{ verticalAlign: "top" }}>
          <Typography sx={{ fontSize: { xs: 13, sm: 16 }, fontWeight: 600 }}>
            {formatBytes(measured ? traffic.total_bytes : null)}
          </Typography>
          {measured && (
            <>
              <Typography color="text.secondary" sx={{ fontSize: 11, mt: 1 }}>
                ↑ {formatBytes(traffic.upload_bytes)}
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: 11, mt: 0.5 }}>
                ↓ {formatBytes(traffic.download_bytes)}
              </Typography>
            </>
          )}
          {traffic?.freshness === "stale" && (
            <Typography color="warning.main" sx={{ fontSize: 11, mt: 1 }}>
              Устаревшие данные
            </Typography>
          )}
          {traffic && traffic.coverage !== "complete" && (
            <Typography color="warning.main" sx={{ fontSize: 11, mt: 1 }}>
              {traffic.coverage === "partial"
                ? "Неполная история"
                : "История неизвестна"}
            </Typography>
          )}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell
          colSpan={3}
          sx={{ p: "0 !important", borderBottom: expanded ? undefined : 0 }}
        >
          <Collapse in={expanded} unmountOnExit>
            <Box
              id={detailsId}
              sx={{ p: { xs: 2, sm: 3 }, bgcolor: "rgba(0,0,0,.12)" }}
            >
              <Typography component="h2" sx={{ fontSize: 17, mb: 2 }}>
                Подробности: {user.display_name || "Без имени"}
              </Typography>
              <Stack spacing={1} sx={{ mb: 3 }}>
                <Typography variant="body2">
                  Яндекс ID: {user.yandex_id || "Нет данных"}
                </Typography>
                <Typography variant="body2">
                  Регистрация: {formatTimestamp(user.created_at)}
                </Typography>
                <Typography variant="body2">
                  Отправлено пользователем:{" "}
                  {formatBytes(measured ? traffic.upload_bytes : null)}
                </Typography>
                <Typography variant="body2">
                  Получено пользователем:{" "}
                  {formatBytes(measured ? traffic.download_bytes : null)}
                </Typography>
                <Typography variant="body2">
                  Начало наблюдений: {formatTimestamp(traffic?.observed_since)}
                </Typography>
                <Typography variant="body2">
                  Обновлено: {formatTimestamp(traffic?.updated_at)}
                </Typography>
              </Stack>
              {!available ? (
                <Alert severity="info">
                  {user.vpn
                    ? "VPN-статистика временно недоступна."
                    : "Сервер пока не передаёт данные о конфигах и трафике."}
                </Alert>
              ) : (
                <>
                  <Typography component="h3" sx={{ fontSize: 15, mb: 2 }}>
                    Выписанные конфиги
                  </Typography>
                  {configs == null ? (
                    <Typography color="text.secondary">
                      Список конфигов недоступен.
                    </Typography>
                  ) : configs.length === 0 ? (
                    <Typography color="text.secondary">
                      Конфиги не выдавались.
                    </Typography>
                  ) : (
                    <Stack
                      component="ul"
                      spacing={2}
                      sx={{ listStyle: "none", p: 0, m: 0 }}
                    >
                      {configs.map((config) => (
                        <Box
                          component="li"
                          key={config.id}
                          sx={{
                            border: 1,
                            borderColor: "divider",
                            borderRadius: "12px",
                            p: 2,
                            overflowWrap: "anywhere",
                          }}
                        >
                          <Typography sx={{ fontWeight: 600, mb: 1 }}>
                            {config.name || "Без названия"}
                          </Typography>
                          <Typography
                            color="text.secondary"
                            sx={{ fontSize: 12 }}
                          >
                            {config.id} · Версия {config.version}
                          </Typography>
                          <Typography sx={{ fontSize: 13, mt: 1 }}>
                            {statuses[config.status]}
                          </Typography>
                          {config.source && (
                            <Typography
                              color="text.secondary"
                              sx={{ fontSize: 12, mt: 1 }}
                            >
                              {config.source === "discovered"
                                ? "Обнаружен на VPN-сервере"
                                : "Выдан сервисом"}
                            </Typography>
                          )}
                          {config.file_available !== undefined && (
                            <Typography
                              color="text.secondary"
                              sx={{ fontSize: 12, mt: 0.5 }}
                            >
                              {config.file_available
                                ? "Файл доступен"
                                : "Клиентский файл отсутствует"}
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Stack>
                  )}
                </>
              )}
              <Typography color="text.secondary" sx={{ fontSize: 11, mt: 3 }}>
                Трафик за всё время наблюдения. ↑ — отправлено, ↓ — получено
                пользователем. Активный конфиг означает выданный доступ, а не
                подключение устройства сейчас.
              </Typography>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}
