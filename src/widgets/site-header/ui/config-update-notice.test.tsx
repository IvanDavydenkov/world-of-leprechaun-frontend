import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { ConfigUpdateNotice } from "./config-update-notice";

vi.mock("../../../entities/vpn-config", () => ({
  useGetMyConfigsQuery: () => ({ currentData: [{ id: "one" }, { id: "two" }] }),
}));

beforeEach(() => localStorage.clear());

it("закрытие сохраняется при повторном открытии, но не скрывает объявление другому пользователю", () => {
  const first = render(<ConfigUpdateNotice userId="first" />);
  expect(screen.getByRole("status")).toHaveTextContent("Конфиги обновлены");
  fireEvent.click(screen.getByRole("button", { name: "Скрыть уведомление" }));
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  first.unmount();
  const again = render(<ConfigUpdateNotice userId="first" />);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  again.unmount();
  render(<ConfigUpdateNotice userId="second" />);
  expect(screen.getByRole("status")).toBeInTheDocument();
});
