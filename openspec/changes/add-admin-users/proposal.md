# Proposal

## Why
Администратору нужен каталог пользователей, уже реализованный backend, с отдельным пунктом навигации.

## What Changes
- Страница /admin/users-list и пункт «Пользователи» для роли admin.
- Таблица ID, имени и роли из GET /admin/users, пагинация limit/after.
- RTK Query и проверка DTO через Zod, состояния загрузки, пустого списка и ошибок.
- Подготовка трафика и конфигов под опциональный vpn из backend-плана admin-user-overview; подробности по пользователю.

## Capabilities
### New Capabilities
- `admin-users`: просмотр каталога пользователей администратором.
### Modified Capabilities
Нет опубликованных main specs.

## Impact
entities/user, pages/admin-users, app/router, widgets/site-header и прокси. Backend реализуется отдельно и не меняется здесь. Текущий API не возвращает VPN-сводку; UI поддерживает черновой контракт admin-user-overview и показывает отсутствие данных до его реализации. После завершения backend контракт необходимо сверить.
