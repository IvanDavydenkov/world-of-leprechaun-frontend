# Проверка реализации

- `npm run typecheck` — успешно.
- `npm test` — 95 тестов в 16 файлах, успешно.
- `npm run build` — успешно, сохраняется существующее предупреждение размера bundle.
- `openspec validate server-migration-controls --strict` — успешно.
- Browser: изолированные Vite :5176 и синтетический API :18082. Проверены admin-кнопка, старые и новые карточки, switch → running → succeeded, routing default, per-page результаты и reused. 202 не отображался как успех. Desktop и viewport 320×740: нет горизонтального scroll; у Dialog scrollWidth/clientWidth 304/304, у document 320/320. Скриншоты сохранены отдельно в visualizations как migration-desktop.png и migration-mobile.png.
- RTL/API: legacy routing 404 сохраняет CRUD и старую форму; switch без source/revoke; lost-response → remount без autoPOST → явный повтор с прежним ключом; отдельное подтверждение server revoke; default защищён; needs_input выбирает обнаруженные candidate/port и новый resume key; partial/reused/retry с новым ключом; nullable counts/DTO; отсутствие секретов и очистка actor/logout.
- Docker CLI недоступен: compose config и nginx/container runtime не проверены. Добавлены proxy для новых routes в Vite и Nginx.
- Реальные backend/SSH/helper/production не вызывались и не изменялись. Новые backend API пока отсутствуют по переданному контракту; успешные UI-тесты не доказывают реальную подготовку или миграцию VPN.
