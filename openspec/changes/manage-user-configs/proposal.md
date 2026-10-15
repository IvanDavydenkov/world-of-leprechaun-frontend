# Proposal

## Why
Администратору нужно управлять выдачами пользователя из таблицы, используя уже реализованные серверные методы.

## What Changes
- Модальное окно «Управлять» для добавления 1..20 новых конфигов и отзыва одного, выбранных или всех.
- Подтверждение отзыва, Zod-валидация, RTK Query mutations и запросы статуса операции.
- Сохранение ключа идемпотентности при повторе, отображение partial/failed и обновление каталога.

## Capabilities
### New Capabilities
- `config-management`: асинхронное управление конфигами пользователя.
### Modified Capabilities
Нет опубликованных main specs.

## Impact
features/manage-user-configs, страница admin-users, cache tags shared/api и users endpoint, dev/Nginx proxy. Backend не меняется. Контракт проверен по users/configs.go и vpn-configs/batches.go, а также admin-config-batch-api.
