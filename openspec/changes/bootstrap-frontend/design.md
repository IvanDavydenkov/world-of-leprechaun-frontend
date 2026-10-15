# Design

## Context

Сейчас используется CRA: react-scripts, Jest, TypeScript 4.9, демонстрационные App и assets. Мотивация описана в proposal.md.

## Goals / Non-Goals

**Goals:** воспроизводимые npm install/build/test, пустой маршрут `/`, базовые слои FSD.

**Non-Goals:** endpoints, бизнес-слайсы, формы, пользовательское содержимое и авторизация.

## Decisions

- Перейти на Vite с React plugin и современным TypeScript вместо сохранения CRA: это соответствует выбранному стеку. index.html находится в корне, точка входа — src/main.tsx.
- app собирает Redux Provider, MUI ThemeProvider/CssBaseline и BrowserRouter. Routes сопоставляет `/` со слайсом pages/home, экспортируемым через index.ts. Альтернатива с data router избыточна без loaders/actions.
- Создать app, pages, widgets, features, entities, shared; пустые слои сохранить через .gitkeep по прямому запросу пользователя. Не создавать фиктивные доменные слайсы.
- Создать store без бизнес-состояния с пустым reducer; RTK Query уже входит в Redux Toolkit. Base API отложить до определения base URL, чтобы не вводить фиктивный контракт.
- Zod установить без искусственной формы. ThemeProvider подготовить с базовой темой MUI.
- Vitest использовать с jsdom и Testing Library; проверить монтирование маршрута и отсутствие демонстрационного контента. Типы и Vite-конфигурация проверяются tsc.
- Сохранить npm start как алиас Vite и добавить dev, build, preview, typecheck, test и test:watch. Выход сборки — dist.

## Risks / Trade-offs

- SPA history требует fallback на index.html при хостинге → указать это в README; деплой вне этапа.
- Обновление tooling требует современной Node.js → зафиксировать поддерживаемую версию в package.json и README.
- Пустая страница визуально неотличима от сбоя → smoke-тест проверяет корневой main и успешный рендер.

## Migration Plan

Обновить manifest и lock-файл, заменить CRA-файлы, проверить tsc/Vitest/build. При откате восстанавливать согласованную версию исходников и lock-файла из Git и выполнять npm ci.
