# Proposal

## Why

Шаблон CRA не соответствует выбранному стеку. Нужна чистая основа кабинета с пустой корневой страницей для дальнейшей разработки.

## What Changes

- Заменить react-scripts и Jest на Vite и Vitest, обновить TypeScript.
- Установить Redux Toolkit, React Redux, React Router, Zod, Material UI и Emotion.
- Удалить демонстрационные файлы CRA, создать слои FSD и подключить провайдеры.
- Настроить маршрут `/` с пустой страницей.

## Capabilities

### New Capabilities

- `application-shell`: запуск приложения и пустая корневая страница.

### Modified Capabilities

Нет.

## Impact

Меняются зависимости, lock-файл, сборка, тесты и структура src/public. API, авторизация, формы и загрузка конфигов не реализуются. Контракты бэкенда пока неизвестны и для этого этапа не нужны.
