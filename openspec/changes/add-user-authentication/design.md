# Design

## Context
Backend предоставляет GET /auth/yandex/login, GET /auth/yandex/callback, GET /me и POST /auth/logout. Cookie HttpOnly/SameSite=Lax, Secure на HTTPS. Callback перенаправляет на /me; ошибки возвращаются JSON. Logout проверяет Origin, затем перенаправляет на /.

## Goals / Non-Goals
Вход через Яндекс без чтения cookie JavaScript-кодом, защита кабинета, понятные ошибки и восстановление. Не менять backend, не запрашивать пароль и не сохранять токены.

## Decisions
- shared/api содержит RTK Query base API с credentials и timeout. entities/session добавляет getSession и Zod-схему; features/sign-out — logout mutation. Все API-вызовы UI выполняются через сгенерированные хуки.
- API cache — единственный источник профиля. Store содержит reducer/middleware API и setupListeners. При выходе кеш сбрасывается; 401 отправляет на /login, 5xx и сеть показывают повтор, а не считаются выходом.
- app guard проверяет профиль перед рендером приватных widgets/pages. Refetch при фокусе, восстановлении сети и периодически обнаруживает истёкшую сессию.
- Mobile-first /login: бренд, карточка с одной кнопкой «Войти через Яндекс», объяснение и inline error. OAuth запускается навигацией, не fetch-запросом.
- Все auth URLs доступны на origin frontend. Proxy callback переписывает Location /me на /, а HTTP-ошибки login/callback переводит на /login?auth_error=1. На странице сообщается, что вход отменён, прерван или не завершён, с повторной попыткой. Если пользователь закрыл вкладку у Яндекса, состояние не считается успешным; следующее открытие снова проверяет серверную сессию.
- Logout RTK mutation принимает redirect с HTML как text; после успешного POST сбрасывает API cache. Ошибки выхода отображаются без ложного подтверждения успеха.
- Docker frontend подключается к внешней сети backend и обращается к users:8080. Native dev использует Vite proxy на 127.0.0.1:8080. YANDEX_REDIRECT_URL и настройки Яндекса должны указывать origin frontend с /auth/yandex/callback, иначе Origin/logout и cookie не согласованы.

## Risks / Trade-offs
- Исправление invalid_origin: backend поддерживает отдельный строгий FRONTEND_ORIGIN для выхода; локально http://localhost:5173, в production https://worldofleprechaun.ru. Внутренний users:8080 не является origin браузера. Пустая настройка сохраняет проверку по callback origin.
- Ошибки OAuth редиректов сведены к безопасному общему сообщению; backend не меняется.
- Реальное согласие Яндекса требует пользовательского аккаунта и корректной OAuth-конфигурации; автоматические тесты используют моки API.
- TLS обязателен в production по контракту backend. Docker недоступен в среде, проверка контейнера выполняется отдельно.
