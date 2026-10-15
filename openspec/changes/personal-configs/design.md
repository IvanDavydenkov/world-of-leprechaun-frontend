# Design

## Context
Backend-спецификация определяет GET /me/configs с массивом active-конфигов и GET /me/configs/{id}/download с application/octet-stream и attachment config-ID.conf. Владельца определяет backend из cookie, admin не получает исключения.

## Goals / Non-Goals
Реализовать frontend списка и скачивания. Не запрашивать owner_id, не читать cookie JavaScript-кодом, не выдавать чужие конфиги и не создавать локальное постоянное хранилище файлов.

## Decisions
- entities/vpn-config использует baseApi и Zod. download_url проверяется на соответствие exact same-origin path; запрос скачивания строится из encodeURIComponent(id).
- Widget my-configs собирает список и feature скачивания; pages/home сохраняет общий стиль и инструкцию. На телефоне кнопки на отдельной строке, длинные значения переносятся.
- Download mutation делает GET через baseQuery responseHandler blob, сохраняет через временный object URL и anchor, возвращает только undefined. Blob и URL не передаются в Redux; URL освобождается через 1с, anchor удаляется сразу.
- MIME и непустое содержимое проверяются, JSON/HTML не сохраняются как .conf. Имя формируется из безопасных символов ID, произвольные значения заголовка не используются.
- При уходе со страницы загрузка отменяется; queryFn проверяет signal перед передачей файла браузеру. После уже начатого сохранения отозвать файл невозможно.
- 401 обновляет Session tag для перепроверки доступа; 404 файла обновляет список. Остальные ошибки допускают повтор. Logout очищает весь baseApi cache.
- Nginx не буферизует и не кеширует файловый маршрут; no-store/nosniff. Прокси только передаёт cookie в users API, сервисных токенов во frontend нет.

## Risks / Trade-offs
Методы backend реализованы и DTO сверён с кодом. Frontend проверяется синтетическим API без скачивания реальных секретных файлов. Полный вход и скачивание с рабочей серверной сессией требуют настроенного окружения. Docker runtime недоступен.
