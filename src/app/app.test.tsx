import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { App } from "./app";
import userEvent from "@testing-library/user-event";

it("открывает кабинет с шапкой, содержимым и подвалом", () => {
  window.history.replaceState(null, "", "/");
  render(<App />);

  expect(screen.getByRole("banner")).toBeInTheDocument();
  expect(screen.getByRole("main")).toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
    "Личный кабинет",
  );
  expect(screen.getByRole("contentinfo")).toBeInTheDocument();
});

it("открывает и закрывает мобильное меню", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole("button", { name: "Открыть меню" }));
  expect(
    screen.getByRole("navigation", { name: "Мобильная навигация" }),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Закрыть меню" }));
  expect(
    await screen.findByRole("button", { name: "Открыть меню" }),
  ).toHaveAttribute("aria-expanded", "false");
});
