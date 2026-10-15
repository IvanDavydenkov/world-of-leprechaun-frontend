# Proposal

## Why

Администратору нужен доступ к готовому реестру VPN-серверов из кабинета: создание записи и изменение параметров подключения.

## What Changes

- Кнопка «Серверы» только у admin в шапке, модальное окно со списком и формой.
- GET списка/записи, POST создания, PATCH изменения с expected_revision через хуки RTK Query.
- Zod-валидация, состояния загрузки/ошибки/конфликта, очистка пароля.
- PUT выбора default и установка сервера не подключаются: в текущем backend реализован только реестр, что подтверждено routes и vpn-server-registry/design.md.

## Capabilities

### New Capabilities
- `admin-server-settings`: управление реестром VPN-серверов администратором.

### Modified Capabilities
Нет.

## Impact

features/manage-vpn-servers, widgets/site-header, shared/api. Новых зависимостей нет. Backend не изменяется. Проверка реального SSH или смена рабочего сервера не выполняется.
