# PayTrail — рабочая память проекта

Хакатон **Business Cup 2.0** (NU, 14–15.11.2026), команда **ENUshniki**. Дедлайн сдачи **12:00, 15.11**, сдаём в 11:00.
Отвечать команде по-русски. Код, комментарии в коде, UI и README — на английском.

## Что строим
B2C веб-продукт для работающих семей в США (W-2): проверка каждого расчётного листка (удержания, сверхурочные, 401(k)),
прогноз «долг или возврат в апреле» для семьи с двумя доходами, рекомендация по W-4, январский режим
(чек-лист налоговых документов, сверка W-2 с листками, PDF-пакет бухгалтеру). Цена $99/год.

## Документы (читать перед работой)
- `docs/CASE.md` — условия кейса, критерии и веса, что сдавать.
- `docs/FAQ-NOTES.md` — ответы организаторов (150 вопросов), что из них следует: пейвол обязателен, механика возврата в продукте, без мёртвых кнопок, дек ≤10 слайдов включая титул, ссылка жива до конца 15.11.
- `docs/ARCHITECTURE.md` — утверждённая архитектура. Часть A — что строим к 12:00, часть B — целевая.
- `docs/TASKS.md` — задачи по людям и точки синхронизации.
- `docs/RESEARCH-LOG.md` — выбор идеи, конкуренты, исследования, рынок и юнит-экономика (с источниками).

## Команда
- Макс (капитан) — продукт, бэкенд, ядро, деплой, данные, координация.
- Алдик — финальное решение, фронт, тесты/QA.
- Манс — ресёрч, дек, питч.

## Стек и запуск
- Next.js 15 (TypeScript) на Node.js, фронт и бэк в одном проекте, один Docker-контейнер, Fly.io.
- SQLite (`better-sqlite3`) на Fly volume `/data`. Локально `./data/paytrail.db`.
- Claude API (`claude-opus-5-5`, server-side refusal fallback) — только чтение документов и тексты.
- `npm run dev` · `npm run typecheck` · `npm test` · `docker compose up` · `fly deploy`.
- Секреты: `.env` локально (не коммитить), `fly secrets` в проде: `ANTHROPIC_API_KEY`, `MASTER_KEY` (32 байта base64).

## Правила, которые нельзя нарушать
1. **Все числа считает ядро `lib/engine`, не LLM.** Claude только извлекает поля и пишет тексты поверх готовых чисел.
2. **Ни одного налогового числа в коде:** только `lib/engine/params/<год>/*.json` со ссылкой на первоисточник IRS у каждого числа.
3. **Файлы документов не храним** ни на диске, ни в БД. В БД — только подтверждённые пользователем поля.
4. **Чувствительные поля шифруются** (`lib/crypto.ts`, AES-256-GCM, ключ = HKDF(секрет семьи ‖ MASTER_KEY), AAD = таблица:строка:семья). Открыто — только служебные поля для запросов.
5. **В LLM не уходят SSN, адреса, номера счетов, имена.** В схеме извлечения таких полей нет; `/api/explain` принимает только коды и числа.
6. **Жюри заходит без логина:** демо-персонажи из `mocks/` + «попробовать со своим листком» (семья создаётся автоматически, ключ в httpOnly cookie).
7. Не выдумывать метрики: в UI, README и деке только реально посчитанное или со ссылкой на источник.
8. Дисклеймер в UI: «Estimates only. Not tax advice. Not affiliated with the IRS.»
9. Коммиты — от имени автора, без приписок про Claude. Репо публичный: никаких секретов и реальных документов.

## Карта кода
- `lib/types.ts` — общий контракт фронт ↔ бэк. Менять только по договорённости.
- `lib/validation.ts` — zod-схемы входящих данных.
- `lib/crypto.ts`, `lib/db.ts` (миграции встроены, `PRAGMA user_version`), `lib/household.ts` (сессия по cookie, CRUD с шифрованием, аудит, автоочистка 30 дней).
- `lib/claude.ts`, `lib/extraction.ts` (схема и промпт извлечения листка/W-2), `lib/ratelimit.ts`.
- `app/api/*` — эндпоинты (таблица ниже). `instrumentation*.ts` — почасовая автоочистка.
- `mocks/couple.json` — главный демо-персонаж (цифры согласованы с Pub 15-T 2026). `lib/demo.ts` строит из него январь: листки на конец года + W-2 с подложенным расхождением в box 12 D у Jordan.
- `lib/engine/` — ядро (сверено: `tests/engine-crosscheck.test.ts`): `params/2026/federal.json`, `withholding.ts` (Worksheet 1A), `tax.ts` (ставки, CTC, вычет за сверхурочные, доп. Medicare), `checks.ts` (проверки листка), `projection.ts` (прогноз и W-4), `reconcileW2.ts`, `expectedDocs.ts`, `index.ts` (`runCheckup`).
- `components/CheckupView.tsx` — отрисовка результата ядра (демо и /report).
- `tests/` — Vitest.

## API
| Метод | Что делает |
|---|---|
| `POST /api/household` | Создать семью, cookie + ссылка восстановления (`/recover#<secret>`) |
| `GET /api/household` | Расшифрованные профиль, работодатели, документы, чек-лист |
| `PUT /api/household/profile` | Обновить профиль |
| `DELETE /api/household` | Удалить всё |
| `POST /api/household/recover` | Восстановить cookie по секрету из ссылки |
| `GET /api/household/recovery-link` | Ссылка восстановления для текущей cookie (no-store) |
| `POST /api/employers` | Добавить работодателя (настройки, правило 401(k), W-4), не больше 4 на семью |
| `PUT /api/employers/:id` | Заменить настройки работы своей семьи |
| `POST /api/extract` | multipart `file` → `{documentType, fields, confidence, warnings}`; файл только в памяти; лимит 15 / 10 мин на IP |
| `POST /api/documents` | Сохранить подтверждённые поля листка или W-2; 409 на дубль (та же работа и дата выплаты / год W-2) |
| `DELETE /api/documents/:id` | Удалить один документ своей семьи |
| `POST /api/checklist`, `PATCH /api/checklist/:id` | Чек-лист документов |
| `POST /api/explain` | Коды и числа находок → тексты (без PII) |
| `POST /api/billing/checkout` | Stripe Checkout (test mode) на Annual $99/год → `{url}`; живые ключи отклоняются без `ALLOW_LIVE_PAYMENTS=true` |
| `POST /api/billing/confirm` | `{sessionId}` → проверка сессии в Stripe (своя семья, оплачено) → тариф `annual` на год |
| `GET /api/health` | Проверка живости |

## Тарифы
- Free: 1 листок, находки, прогноз «долг или возврат». Annual ($99/год): все листки обоих супругов, точный Step 4(c) по каждой работе, январский режим (чек-лист, сверка W-2, пакет), напоминания в календарь.
- Лимиты — `lib/plan.ts` (`FREE_LIMITS`), проверка на сервере в `POST /api/documents` (402 `payment_required`), блокировка в UI — `CheckupView locked`. Демо без `plan` показывает всё.
- Секрет `STRIPE_SECRET_KEY` (`sk_test_...`) в `.env` и `fly secrets`. Тестовая карта 4242 4242 4242 4242.

## Статус (обновлять по ходу)
- [x] Хранилище: шифрование, SQLite, API семьи, тесты crypto (6/6), проверено end-to-end
- [x] `/api/extract`, `/api/explain` — проверены вживую в проде (sample, свой листок, не-документ)
- [x] Ядро `lib/engine` + `params/2026` (сверено с Pub 15-T, Rev. Proc. 2025-32, SSA, IRS 401(k)) + тесты (24/24), подключено к демо и /report
- [x] Фронт (Алдик): лендинг, демо, загрузка + подтверждение, отчёт, январь, пейвол
- [x] Деплой на Fly: автодеплой из main через GitHub Actions (typecheck, eslint, тесты), карта привязана, триал снят
- [x] Персонаж 1 (пара): ноябрь и январь считаются ядром (`lib/demo.ts`), сюжет закреплён в `tests/demo.test.ts`
- [x] Персонажи 2 и 3 (Манс): `mocks/hourly.json`, `mocks/salaried.json`, `tests/personas.test.ts`; страницы в /demo — Алдик
- [x] Аудит бэкенда (14.11): CSRF (`middleware.ts`), лимиты тела (`lib/http.ts`), потолок Claude `CLAUDE_HOURLY_CAP`=100/ч, правки ядра, ручной QA-прогон
- [x] Ночь 14→15.11: замер чтения (`docs/EVAL-EXTRACT.md`, 209/209 на синтетике), сверка ядра с Pub 15-T и PolicyEngine/Tax-Calculator (`docs/ENGINE-CROSSCHECK.md`), цена $99, экономика и CAC (`docs/research/unit-economics-99.*`, `cac-evidence.md`), Quick estimate на главной, Paycheck history, What we checked, превью документа, подсказки к терминам, страницы /privacy /accuracy /about, /account (Алдик), ссылка восстановления повторно
- [ ] Бланки W-2 для питча
- [ ] Январский режим (решение в 23:00)
