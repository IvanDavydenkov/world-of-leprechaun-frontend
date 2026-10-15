# Мир лепреконов — VPN

Frontend личного кабинета VPN для домена `worldofleprechaun.ru`.
Цель — предоставить пользователю доступ к своим VPN-конфигурациям и их загрузке.
Сейчас реализованы основа приложения, адаптивная шапка с мобильным меню,
основной layout и стартовый экран кабинета по маршруту `/`.

## Запуск

Требуется Node.js 22.12+ (ветка 22) или 24+ и npm.

```sh
npm ci
npm run dev
```

Адрес dev-сервера выводится в терминале (по умолчанию http://localhost:5173).
`npm start` также запускает Vite.

## Проверки и сборка

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

`npm run test:watch` запускает Vitest в watch-режиме. Production-файлы находятся
в `dist`. При хостинге SPA нужно настроить fallback на `index.html` для маршрутов
приложения. DNS, хостинг и API ещё не настроены.

## Авторизация через Яндекс

Кабинет доступен после проверки серверной сессии. Гость попадает на `/login`.
Кнопка входа переводит на `/auth/yandex/login`; callback обрабатывает backend,
frontend не получает токен Яндекса и не читает HttpOnly-cookie.
Профиль (`GET /me`) и выход (`POST /auth/logout`) выполняются через хуки RTK Query.
Zod проверяет профиль. Отказ/ошибка OAuth возвращают на страницу входа с повтором;
при закрытии вкладки следующий вход заново проверяет сессию. Ошибка сети/5xx
показывается отдельно, 401 требует повторного входа.

Для локальной разработки запустите users API из backend-проекта на порту 8080.
Vite проксирует `/me` и `/auth/*`, его фиксированный адрес — `http://127.0.0.1:5173`.
В настройках Яндекс OAuth и **в backend `.env`** задайте одинаковый redirect URL:

```dotenv
YANDEX_REDIRECT_URL=http://127.0.0.1:5173/auth/yandex/callback
```

Хост страницы с кнопкой в Яндексе: `http://127.0.0.1:5173`. Если используете localhost,
везде используйте `http://localhost:5173`, включая адрес открытого сайта. Не смешивайте
localhost и 127.0.0.1. Перезапустите backend после изменения его конфигурации.
Client ID/Secret задаются только в backend. Для другого адреса API задайте
`USERS_API_ORIGIN` в frontend `.env` (шаблон — `.env.example`). Это серверная настройка
прокси, а не браузерная VITE-переменная.

В production callback должен быть `https://worldofleprechaun.ru/auth/yandex/callback`,
а хост кнопки — `https://worldofleprechaun.ru`. HTTPS завершает внешний reverse proxy;
он должен сохранять исходный Host и Origin. Backend проверяет Origin выхода по
YANDEX_REDIRECT_URL либо по явно заданному backend `FRONTEND_ORIGIN`.
Для локального фронта с сохранённым callback Яндекса на 8080 задайте в backend `.env`
`FRONTEND_ORIGIN=http://localhost:5173` и перезапустите users. На сервере задайте
`FRONTEND_ORIGIN=https://worldofleprechaun.ru`; это внешний origin сайта, а не адрес
контейнера `http://users:8080`. Отдельный origin API для браузера не используется.
Ошибки callback отображаются безопасным общим сообщением; детали остаются на backend.

## Развёртывание через Docker

На сервере нужны только Docker Engine и Docker Compose v2. Node.js и Nginx
устанавливаются внутри образа. Сначала в backend-проекте запустите необходимые сервисы:

```sh
docker compose up -d --build mongodb users
```

Затем из корня frontend-проекта выполните:

```sh
docker compose up -d --build
docker compose ps
```

Приложение доступно по `http://IP_СЕРВЕРА` на порту 80. Перед запуском убедитесь,
что порт свободен и разрешён в firewall сервера. Для домена `worldofleprechaun.ru`
направьте DNS-запись A на IPv4 сервера; AAAA добавляйте только при настроенном IPv6.
Этот Compose запускает HTTP; сертификат и HTTPS настраиваются отдельно на reverse proxy.

Порт и адрес привязки можно изменить в файле `.env` рядом с `compose.yaml`:

```dotenv
HTTP_PORT=8080
HTTP_BIND_ADDRESS=127.0.0.1
BACKEND_NETWORK=backend-word-of-leprechaun_default
USERS_API_ORIGIN=http://users:8080
```

Такой вариант подходит для уже установленного на сервере reverse proxy:
он направляет запросы на `http://127.0.0.1:8080`. По умолчанию контейнер доступен
на всех интерфейсах на порту 80. После изменения `.env` повторите команду запуска.
`BACKEND_NETWORK` — существующая сеть Compose backend (смотрите `docker network ls`);
frontend подключается к ней и обращается к сервису `users:8080`. Если имя проекта
backend переопределено, скорректируйте имя сети. Сеть должна существовать до запуска frontend.
Прокси Nginx применяет USERS_API_ORIGIN при старте контейнера; пересборка для смены
адреса backend не нужна. На HTTP production OAuth не работает по требованиям backend.

Обновление после получения нового кода, просмотр логов и остановка:

```sh
docker compose up -d --build
docker compose logs -f --tail=100 frontend
docker compose down
```

Сборка выполняет `npm ci` по lock-файлу и production-сборку Vite с проверкой типов.
В финальном образе остаются Nginx и готовые статические файлы.
Nginx поддерживает прямое открытие маршрутов SPA; отсутствующие файлы `/assets/`
возвращают 404. HTML перепроверяется при загрузке, хешированные assets кешируются.
Healthcheck проверяет `/healthz`; после перезапуска Docker сервис запускается снова,
если не был остановлен вручную. Статус unhealthy сам по себе контейнер не перезапускает.
Исходники не монтируются: для применения изменений требуется пересборка.
Секреты и локальные `.env` исключены из контекста сборки; настройки Compose
не становятся переменными frontend. Браузерные Vite-настройки задаются при сборке
и не должны содержать секретов.

## Стек

React, TypeScript, Vite, Redux Toolkit / React Redux, RTK Query (в составе
Redux Toolkit), React Router (`react-router-dom`), Zod, Material UI / Emotion.
Тесты: Vitest, jsdom, React Testing Library.

Redux Provider, тема MUI, авторизация и каталог пользователей администратора подключены.
Главная подключена к контракту личных VPN-конфигов; приватные данные не сохраняются в localStorage.

## Личные конфиги

На `/` авторизованный user и admin видят только список из `GET /me/configs`.
Frontend не передаёт owner_id/user_id — принадлежность проверяет backend по сессии.
Показываются название, версия, дата и доступность текущего .conf. Скачивание выполняет
RTK Query mutation через `GET /me/configs/{id}/download`. Blob не попадает в Redux/cache;
временный object URL освобождается, произвольные внешние download_url отклоняются.
Список обновляется по фокусу, восстановлению сети и вручную. Ошибка 401 перепроверяет
сессию; 404 файла обновляет список. Nginx не кеширует и не буферизует файловый ответ.
Отключённые/pending записи backend не должен включать в список.

Контракт сверён с реализованными методами backend `user-config-download`.
Frontend проверяется на синтетическом API/файле; полноценное скачивание с рабочей
пользовательской сессией проверяется в настроенном окружении.

## Пользователи администратора

Роль `admin` в `/me` открывает пункт «Пользователи» в шапке и мобильном меню.
У обычного пользователя нет навигации и бургера: в шапке остаются бренд и выход.
Админское меню содержит «Личный кабинет» и «Пользователи», без якорных ссылок на разделы.
Страница `/admin/users-list` показывает ID, имя и роль из `GET /admin/users` через
RTK Query. Имя страницы отличается от API URL, чтобы прямое открытие не возвращало JSON.
Пагинация — по 50 записей с cursor `after`; API не возвращает общее число пользователей.
Если последняя страница содержит ровно 50 записей, следующая может оказаться пустой.
Количество и список выписанных конфигов текущий HTTP endpoint не возвращает.
Frontend подготовлен под черновой контракт `admin-user-overview` из backend-проекта:
опциональные `vpn.counts`, `vpn.configs`, `vpn.traffic`, `yandex_id`, `created_at`.
Таблица показывает число активных/отключённых/промежуточных конфигов и общий трафик,
upload/download. «Подробнее» раскрывает конфиги, версии, состояния и время показаний.
Старый API продолжает работать: отсутствие статистики помечается как «Нет данных».
Неполная история и устаревшие показания отмечаются отдельно. Ноль выводится только
при полученном измеренном нуле. Бэкенд реализуется в другом чате; после него нужно
сверить итоговый DTO с `user-overview-schema.ts`. Поддержан `X-Next-Cursor` нового API;
для старого ответа сохраняется прежняя пагинация по размеру страницы.
Обычному пользователю пункт скрыт, прямой маршрут закрыт; права также проверяет сервер.

### Управление конфигами

Кнопка «Управлять» в строке пользователя открывает модальное окно.
Можно добавить от 1 до 20 **новых** конфигов или отключить один, выбранные (до 100)
и все конфиги пользователя. Это не изменение квоты. Отзыв требует подтверждения;
записи и история расхода сохраняются на backend.

Запросы идут через хуки RTK Query на users API:
`POST /admin/users/{id}/configs`, `DELETE /admin/users/{id}/configs/{configId}`,
`POST /admin/users/{id}/configs/bulk-delete`, `DELETE /admin/users/{id}/configs`.
Каждое новое намерение получает `Idempotency-Key`; повтор после потери ответа или
частичного результата использует прежний ключ и payload. HTTP 202 означает принятие,
а результат отображается из `GET /admin/users/{id}/config-operations/{operationId}`.
Статус опрашивается раз в 2 секунды до завершения либо ошибки, после которой доступна
повторная проверка. Каталог обновляется по серверному результату, без оптимистической выдачи.
При partial/failed видны неподтверждённые элементы и доступен безопасный повтор.
Закрытие окна не отменяет операцию на сервере; при открытии снова в рамках текущей
страницы статус проверяется заново. После перезагрузки локальный ключ/состояние окна
теряются: перед новой выдачей при неизвестном результате нужна проверка backend-операции.
Отключённые записи не активируются повторно этим UI: соответствующий HTTP-метод
в текущем batch API не предоставлен. Если список конфигов ещё не возвращается API,
отдельный и групповой выбор недоступны; отзыв всех доступен после явного подтверждения.

## Структура FSD

Администратору доступна кнопка «Серверы» в шапке: список реестра, добавление (POST)
и изменение (PATCH с expected_revision). Пустой пароль при редактировании сохраняет
прежний. После конфликта требуется явно загрузить актуальную запись. Пароль
не сохраняется в Redux/storage и очищается после отправки и закрытия формы.
Контракт сверён с backend vpn-server-registry. Сохранение записи не устанавливает
VPN и не переключает сервер: PUT/default и проверка подключения пока не реализованы
в проверенной версии backend. Все запросы используют общую конфигурацию API.

```text
src/
  app/        # композиция приложения, провайдеры, store, router, тема
  pages/      # страницы; home — стартовый экран кабинета
  widgets/    # составные блоки интерфейса
  features/   # пользовательские действия
  entities/   # бизнес-сущности
  shared/     # переиспользуемый код
  main.tsx    # точка входа
```

Импорты направлены вниз по слоям, доступ к слайсам — через публичные `index.ts`.
Имена файлов и папок — `kebab-case`, включая React-компоненты (`home-page.tsx`).
Стандартные имена `README.md`, `AGENTS.md`, `SKILL.md` сохраняются.
Пустые слои сохранены через `.gitkeep`; сегменты добавляются по необходимости.
Ограничения и процесс разработки описаны в `openspec/config.yaml` и `AGENTS.md`.

## Production: frontend + API subdomain
Frontend: https://worldofleprechauns.ru; API: https://api.worldofleprechauns.ru.
Copy production.env.example to a local .env for Docker. Build with docker compose --env-file .env up -d --build.
VITE_API_ORIGIN is a public build-time value: rebuild after changing it. Never place secrets into VITE_*.
Host Nginx terminates TLS and proxies the frontend to 127.0.0.1:8082 and users API to 127.0.0.1:8080.
Set BACKEND_NETWORK to the actual backend Compose network name. Production does not use Vite.
Backend must allow FRONTEND_ORIGIN=https://worldofleprechauns.ru and use Yandex callback https://api.worldofleprechauns.ru/auth/yandex/callback.
Requests include HttpOnly cookies (credentials: include), OAuth navigates to the API, JSON logout returns 204.
For development leave VITE_API_ORIGIN empty and run npm run dev (localhost:5173, Vite proxy -> 127.0.0.1:8080).
Do not set production values in your development .env. Templates do not configure DNS/certificates or deploy services.
