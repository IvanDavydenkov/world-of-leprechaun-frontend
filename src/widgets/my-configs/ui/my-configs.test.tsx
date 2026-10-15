import { Blob as NodeBlob } from "node:buffer";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Provider } from "react-redux";
import { createAppStore } from "../../../app/store";
import { baseApi } from "../../../shared/api";
import { MyConfigs } from "./my-configs";

let appStore: ReturnType<typeof createAppStore>;
let listStatus: number;
let downloadStatus: number;
let missingFile: boolean;
let empty: boolean;
let maliciousUrl: boolean;
let wrongContentType: boolean;
const createObjectURL = vi.fn(() => "blob:test-config");
const revokeObjectURL = vi.fn();
const syntheticContent = "SYNTHETIC-FILE-CONTENT-NOT-A-REAL-CONFIG";
let filename: string;
const paths: string[] = [];

beforeEach(() => {
  appStore = createAppStore();
  listStatus = 200;
  downloadStatus = 200;
  missingFile = empty = maliciousUrl = wrongContentType = false;
  paths.length = 0;
  filename = "";
  createObjectURL.mockClear();
  vi.stubGlobal("Blob", NodeBlob);
  vi.stubGlobal(
    "URL",
    class extends URL {
      static createObjectURL = createObjectURL;
      static revokeObjectURL = revokeObjectURL;
    },
  );
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
    function (this: HTMLAnchorElement) {
      filename = this.download;
    },
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(async (request: Request) => {
      const path = new URL(request.url).pathname;
      paths.push(path);
      if (path.endsWith("/download"))
        return new Response(
          downloadStatus === 200 ? syntheticContent : '{"error":"not_found"}',
          {
            status: downloadStatus,
            headers: {
              "Content-Type":
                downloadStatus === 200 && !wrongContentType
                  ? "application/octet-stream"
                  : "application/json",
            },
          },
        );
      return new Response(
        JSON.stringify(
          listStatus !== 200
            ? { error: "service_unavailable" }
            : empty
              ? []
              : [
                  {
                    id: "phone",
                    name: "Телефон",
                    status: "active",
                    version: 2,
                    created_at: "2026-10-15T12:00:00Z",
                    download_available: !missingFile,
                    download_url: missingFile
                      ? null
                      : maliciousUrl
                        ? "https://example.invalid/file"
                        : "/me/configs/phone/download",
                  },
                ],
        ),
        { status: listStatus, headers: { "Content-Type": "application/json" } },
      );
    }),
  );
});

afterEach(() => {
  appStore.dispatch(baseApi.util.resetApiState());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function renderConfigs() {
  return render(
    <Provider store={appStore}>
      <MyConfigs />
    </Provider>,
  );
}

it("показывает собственные активные конфиги и запрашивает /me/configs без owner_id", async () => {
  renderConfigs();
  expect(
    await screen.findByRole("heading", { name: "Телефон" }),
  ).toBeInTheDocument();
  expect(paths).toEqual(["/me/configs"]);
  expect(screen.getByRole("button", { name: "Скачать Телефон" })).toBeEnabled();
});

it("скачивает через RTK hook и не сохраняет содержимое в Redux", async () => {
  const user = userEvent.setup();
  renderConfigs();
  await user.click(
    await screen.findByRole("button", { name: "Скачать Телефон" }),
  );
  expect(
    await screen.findByText("Файл передан браузеру для сохранения."),
  ).toBeInTheDocument();
  expect(paths).toContain("/me/configs/phone/download");
  expect(filename).toBe("config-phone.conf");
  expect(createObjectURL).toHaveBeenCalledOnce();
  expect(JSON.stringify(appStore.getState())).not.toContain(syntheticContent);
  expect(JSON.stringify(appStore.getState())).not.toContain("blob:test-config");
});

it("для пустого списка показывает объяснение", async () => {
  empty = true;
  renderConfigs();
  expect(
    await screen.findByText("Пока нет активных конфигов"),
  ).toBeInTheDocument();
});

it("отключает скачивание при отсутствии клиентского файла", async () => {
  missingFile = true;
  renderConfigs();
  expect(
    await screen.findByRole("button", { name: "Скачать Телефон" }),
  ).toBeDisabled();
  expect(
    screen.getByText("Клиентский файл пока недоступен."),
  ).toBeInTheDocument();
});

it("отклоняет внешний URL скачивания из ошибочного DTO", async () => {
  maliciousUrl = true;
  renderConfigs();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Не удалось загрузить конфиги",
  );
  expect(paths).toEqual(["/me/configs"]);
});

it("ошибка списка допускает повторную загрузку", async () => {
  listStatus = 503;
  const user = userEvent.setup();
  renderConfigs();
  await screen.findByRole("alert");
  listStatus = 200;
  await user.click(screen.getByRole("button", { name: "Повторить" }));
  expect(
    await screen.findByRole("heading", { name: "Телефон" }),
  ).toBeInTheDocument();
});

it.each([404, 503])("ошибка файла %s не создаёт скачивание", async (status) => {
  downloadStatus = status;
  const user = userEvent.setup();
  renderConfigs();
  await user.click(
    await screen.findByRole("button", { name: "Скачать Телефон" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    status === 404 ? "Конфиг больше недоступен" : "Не удалось скачать",
  );
  expect(createObjectURL).not.toHaveBeenCalled();
});

it("не сохраняет JSON/HTML как конфиг при некорректном успешном ответе", async () => {
  wrongContentType = true;
  const user = userEvent.setup();
  renderConfigs();
  await user.click(
    await screen.findByRole("button", { name: "Скачать Телефон" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Не удалось скачать",
  );
  expect(createObjectURL).not.toHaveBeenCalled();
});
