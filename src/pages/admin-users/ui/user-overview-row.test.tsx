import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { Table, TableBody } from "@mui/material";
import type { UserOverview } from "../../../entities/user";
import { UserOverviewRow } from "./user-overview-row";
import { Provider } from "react-redux";
import { createAppStore } from "../../../app/store";

const user: UserOverview = {
  id: "example-user",
  display_name: "Иван",
  role: "user",
};

function renderRow(profile: UserOverview) {
  render(
    <Provider store={createAppStore()}>
      <Table>
        <TableBody>
          <UserOverviewRow user={profile} />
        </TableBody>
      </Table>
    </Provider>,
  );
}

it("для старого API показывает отсутствие статистики вместо нулей", async () => {
  const events = userEvent.setup();
  renderRow(user);
  expect(screen.getAllByText("Нет данных")).toHaveLength(2);
  expect(screen.queryByText("0 Б")).not.toBeInTheDocument();
  await events.click(screen.getByRole("button", { name: "Подробнее" }));
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Сервер пока не передаёт данные",
  );
});

it("показывает счётчики, направления трафика и список конфигов", async () => {
  const events = userEvent.setup();
  renderRow({
    ...user,
    vpn: {
      availability: "available",
      counts: { total: 2, active: 1, disabled: 1, pending: 0 },
      configs: [
        {
          id: "config-phone",
          name: "Телефон",
          status: "active",
          version: 2,
          source: "managed",
          file_available: true,
        },
        {
          id: "config-laptop",
          name: "Ноутбук",
          status: "deleted",
          version: 1,
          source: "discovered",
          file_available: false,
        },
      ],
      traffic: {
        upload_bytes: 1024,
        download_bytes: 2048,
        total_bytes: 3072,
        freshness: "stale",
        coverage: "partial",
        observed_since: "2026-10-15T12:00:00Z",
        updated_at: "2026-10-15T12:01:00Z",
      },
    },
  });
  expect(screen.getByText("3 КиБ")).toBeInTheDocument();
  expect(screen.getByText("↑ 1 КиБ")).toBeInTheDocument();
  expect(screen.getByText("↓ 2 КиБ")).toBeInTheDocument();
  expect(screen.getByText("Активных: 1")).toBeInTheDocument();
  expect(screen.getByText("Устаревшие данные")).toBeInTheDocument();
  expect(screen.getByText("Неполная история")).toBeInTheDocument();
  await events.click(screen.getByRole("button", { name: "Подробнее" }));
  expect(screen.getByText("Телефон")).toBeInTheDocument();
  expect(screen.getByText("Отключён")).toBeInTheDocument();
  expect(screen.getByText("Клиентский файл отсутствует")).toBeInTheDocument();
});

it("не подменяет недоступный сервис статистики нулём", async () => {
  const events = userEvent.setup();
  renderRow({
    ...user,
    vpn: {
      availability: "unavailable",
      counts: null,
      configs: null,
      traffic: null,
    },
  });
  expect(screen.queryByText("0 Б")).not.toBeInTheDocument();
  await events.click(screen.getByRole("button", { name: "Подробнее" }));
  expect(screen.getByRole("alert")).toHaveTextContent("временно недоступна");
});

it("показывает достоверный ноль и отсутствие выданных конфигов", async () => {
  const events = userEvent.setup();
  renderRow({
    ...user,
    vpn: {
      availability: "available",
      counts: { total: 0, active: 0, disabled: 0, pending: 0 },
      configs: [],
      traffic: {
        upload_bytes: 0,
        download_bytes: 0,
        total_bytes: 0,
        freshness: "fresh",
        coverage: "complete",
        observed_since: null,
        updated_at: null,
      },
    },
  });
  expect(screen.getByText("0 Б")).toBeInTheDocument();
  await events.click(screen.getByRole("button", { name: "Подробнее" }));
  expect(screen.getByText("Конфиги не выдавались.")).toBeInTheDocument();
});
