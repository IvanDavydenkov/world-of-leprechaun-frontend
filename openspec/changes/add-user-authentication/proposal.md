# Proposal

## Why
Кабинет должен открываться только пользователю с действующей серверной сессией. Нужно подключить существующий вход через Яндекс и учесть отказ, прерывание и ошибки сервиса.

## What Changes
- Страница входа, проверка сессии и защита кабинета.
- Профиль и выход через хуки RTK Query; Zod проверяет ответ профиля.
- Same-origin proxy для существующих /me и /auth/* в Vite и Nginx.
- OAuth redirects/error responses адаптируются на прокси без изменений backend.

## Capabilities
### New Capabilities
- `user-authentication`: вход, сессия, ошибки и выход пользователя.
### Modified Capabilities
Нет опубликованных main specs.

## Impact
shared/api, entities/session, features/sign-out, pages/login, app/router/store, header, Vite и Docker. Контракт изучен в backend services/users/internal/transport/http/auth.go. Парольные формы, регистрация и админка вне объёма.
