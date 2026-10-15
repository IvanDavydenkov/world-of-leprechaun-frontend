import { expect, it } from "vitest";
import { formatBytes } from "./format-usage";

it("форматирует байты, сохраняя разницу между нулём и отсутствием данных", () => {
  expect(formatBytes(null)).toBe("Нет данных");
  expect(formatBytes(0)).toBe("0 Б");
  expect(formatBytes(1024)).toBe("1 КиБ");
  expect(formatBytes(1024 ** 3)).toBe("1 ГиБ");
});
