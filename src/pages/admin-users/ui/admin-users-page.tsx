import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { Navigate } from "react-router-dom";
import { useGetUsersQuery } from "../../../entities/user";
import { useGetSessionQuery } from "../../../entities/session";
import { UserOverviewRow } from "./user-overview-row";

const pageSize = 50;

export function AdminUsersPage() {
  const [cursors, setCursors] = useState<string[]>([""]);
  const cursor = cursors[cursors.length - 1];
  const {
    data: session,
    error: sessionError,
    refetch: refetchSession,
  } = useGetSessionQuery();
  const {
    currentData: resultPage,
    error,
    isFetching,
    refetch,
  } = useGetUsersQuery(
    { limit: pageSize, ...(cursor ? { after: cursor } : {}) },
    {
      refetchOnFocus: true,
      refetchOnReconnect: true,
      skip: session?.role !== "admin" || !!sessionError,
    },
  );
  const users = resultPage?.users;
  const unauthorized = error && "status" in error && error.status === 401;
  const forbidden = error && "status" in error && error.status === 403;

  if (unauthorized) return <SessionExpired />;

  return (
    <Stack spacing={3}>
      <Box>
        <Typography
          sx={{
            color: "primary.main",
            fontSize: 11,
            letterSpacing: ".15em",
            mb: 1,
          }}
        >
          АДМИНИСТРИРОВАНИЕ
        </Typography>
        <Typography
          component="h1"
          variant="h1"
          sx={{ fontSize: { xs: 34, md: 48 }, mb: 1.5 }}
        >
          Пользователи<span style={{ color: "#d9ba73" }}>.</span>
        </Typography>
        <Typography color="text.secondary">
          Пользователи, вошедшие через Яндекс.
        </Typography>
      </Box>
      {forbidden ? (
        <Alert
          severity="warning"
          action={
            <Button onClick={() => refetchSession()}>Проверить доступ</Button>
          }
        >
          Нет доступа к каталогу пользователей.
        </Alert>
      ) : (
        <>
          <Paper
            variant="outlined"
            sx={{
              minWidth: 0,
              overflow: "hidden",
              borderRadius: "20px",
              backgroundImage: "none",
            }}
          >
            <Stack
              direction="row"
              sx={{
                p: 2,
                justifyContent: "space-between",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Страница {cursors.length}
                {users && !error ? ` · Записей: ${users.length}` : ""}
              </Typography>
              <Button
                onClick={() => refetch()}
                disabled={isFetching}
                sx={{ minHeight: 44 }}
              >
                Обновить
              </Button>
            </Stack>
            {isFetching && (
              <LinearProgress aria-label="Загрузка пользователей" />
            )}
            {error ? (
              <Box sx={{ p: 2 }}>
                <Alert
                  severity="error"
                  action={
                    <Button onClick={() => refetch()} disabled={isFetching}>
                      Повторить
                    </Button>
                  }
                >
                  Не удалось загрузить пользователей. Попробуйте ещё раз.
                </Alert>
              </Box>
            ) : !users ? (
              <Typography role="status" sx={{ p: 3 }}>
                Загружаем пользователей…
              </Typography>
            ) : (
              <TableContainer>
                <Table
                  aria-label="Пользователи"
                  sx={{
                    tableLayout: "fixed",
                    "& th, & td": {
                      px: { xs: 1.5, sm: 3 },
                      py: 2,
                      overflowWrap: "anywhere",
                    },
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: { xs: "36%", sm: "42%" } }}>
                        Пользователь
                      </TableCell>
                      <TableCell sx={{ width: { xs: "34%", sm: "38%" } }}>
                        Конфиги
                      </TableCell>
                      <TableCell>Трафик</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          sx={{ textAlign: "center", py: 5 }}
                        >
                          На этой странице пока нет пользователей.
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <UserOverviewRow key={user.id} user={user} />
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
          <Stack
            direction="row"
            sx={{ justifyContent: "space-between", gap: 2 }}
          >
            <Button
              variant="outlined"
              disabled={cursors.length === 1 || isFetching}
              onClick={() => setCursors((previous) => previous.slice(0, -1))}
              sx={{ minHeight: 44 }}
            >
              Назад
            </Button>
            <Button
              variant="outlined"
              disabled={isFetching || !!error || !resultPage?.hasNextPage}
              onClick={() => {
                const lastId = resultPage?.nextCursor ?? users?.at(-1)?.id;
                if (lastId && lastId !== cursor)
                  setCursors((previous) => [...previous, lastId]);
              }}
              sx={{ minHeight: 44 }}
            >
              Далее
            </Button>
          </Stack>
        </>
      )}
    </Stack>
  );
}

function SessionExpired() {
  const { data, error, isFetching } = useGetSessionQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  if (isFetching)
    return <Typography role="status">Проверяем сессию…</Typography>;
  if (data && !error)
    return (
      <Alert severity="error">
        Сервер отклонил запрос. Обновите страницу и повторите вход.
      </Alert>
    );
  return <Navigate to="/login" replace />;
}
