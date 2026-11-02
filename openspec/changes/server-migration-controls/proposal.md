# Proposal

## Why
Администратору нужно безопасно переключать выдачи между VPN-серверами и возвращаться на прежний сервер с сохранёнными ключами. Контракт backend передан 2026-11-02; новые API пока не реализованы.

## What Changes
- Подготовка сервера, discovery/resume, переключение одной командой и отдельный подтверждаемый отзыв.
- Async-операции: прогресс, постраничные результаты, retry и восстановление намерения после потери ответа.
- Совместимость со старым реестром и блокировка новых действий при 404 routing/features=false.
- Поддержка расширенной формы только при доступности нового контракта.

## Capabilities
### New Capabilities
- `server-migration-controls`: административное управление подготовкой, переключением и отзывом серверных выдач.
### Modified Capabilities
Нет.

## Impact
features/manage-vpn-servers, shared/api, session cleanup, сообщения глобального удаления, Vite/Nginx proxy. Backend/SSH/production не изменяются. Источник: backend openspec/changes/vpn-server-migration/frontend-handoff.md и api-contract.md.
