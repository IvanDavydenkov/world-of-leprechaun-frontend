# Proposal

## Why
Авторизованный пользователь должен видеть собственные активные конфиги и скачивать текущий файл с главной страницы.

## What Changes
- Заменить заглушку на список /me/configs с названием, версией и датой.
- Скачать .conf через RTK Query mutation, не сохраняя файл в Redux.
- Обработать пустой список, недоступный файл, 401/404/503 и некорректные ответы.
- Подключить dev/Nginx proxy для списка и байтов файла.

## Capabilities
### New Capabilities
- `personal-configs`: список и скачивание собственных VPN-конфигураций.
### Modified Capabilities
Нет опубликованных main specs.

## Impact
entities/vpn-config, features/download-config, widgets/my-configs, pages/home, session/cache tags, proxy. Контракт сверён с backend user-config-download и реализованными users/own_configs.go и vpn-configs/own_configs.go. Backend в этом изменении не редактируется.
