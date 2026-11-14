# PayTrail: архитектура (утверждена 14.11.2026, 14:40)

Команда ENUshniki. До сдачи (12:00, 15.11) около 21 часа, в команде 3 человека.

- **Часть A** — что строим к 12:00: прод, ссылка, репо. Финальная версия, по ней работаем.
- **Часть B** — целевая архитектура для дека (слайд «как это масштабируется») и `docs/ARCHITECTURE.md` в репо.

---

# Часть A. Хакатон: что строим к 12:00

## A1. Решения

| Вопрос | Решение |
|---|---|
| Приложение | Один репозиторий, **Next.js (TypeScript) на Node.js**: фронт и бэк в одном проекте |
| Запуск | **Один Docker-контейнер** (Next.js standalone, `node server.js`, порт 3000). Локально `docker compose up` |
| Хостинг | **Fly.io**, деплой из терминала: `fly deploy`. HTTPS даёт Fly |
| База данных | **SQLite** (`better-sqlite3`, режим WAL) на **Fly volume** `/data/paytrail.db`. Один экземпляр приложения |
| Шифрование | Чувствительные поля шифруются **AES-256-GCM**. Ключ собирается из секрета семьи (cookie) и мастер-ключа сервера |
| Файлы документов | **Не храним.** Файл живёт в памяти до ответа Claude, в базе остаются только подтверждённые поля |
| LLM | **Claude API** (`claude-opus-5-5`): только распознать документ и написать тексты. Все числа считает наш код |
| RAG | Не нужен: правила зашиты в код и `params/2026`, модель ничего не советует сама |
| Расчётное ядро | Чистый TypeScript-модуль `lib/engine`, без LLM, с тестами. Работает в браузере |
| Вход для жюри | Без регистрации: демо-персонажи + «попробовать со своим листком» (семья создаётся автоматически, ключ в cookie) |

## A2. Объём

| Берём | Зачем по критериям |
|---|---|
| Демо: 3 вымышленных персонажа, без регистрации | Pass/fail: жюри проходит продукт без логина |
| Загрузка листка (PDF или фото) → распознавание Claude → экран подтверждения полей | 40%: настоящее ядро, а не макет |
| Проверки ядра: арифметика и YTD, FICA, федеральное удержание по Pub 15-T, сверхурочные ×1,5 (FLSA), совпадающий взнос 401(k) | 40%: «ценность настоящая», «читаем репо» |
| Прогноз «долг или возврат в апреле» для семьи с 1–2 доходами + что вписать в W-4 Step 4(c) по каждой работе | 20%: за что платят |
| Находки с суммой в $ и готовым действием, тексты от Claude поверх чисел ядра | 20% + UX |
| **Январский режим (наше отличие):** переключатель «ноябрь → январь», чек-лист документов, загрузка W-2, сверка W-2 с листками, PDF-пакет для бухгалтера | 20% удержание + 10% новизна: у IRS Estimator, april/Gusto, WageWatch этого нет |
| Хранение данных семьи в зашифрованной SQLite, кнопка «Delete my data» | Приватность — аргумент на питче |
| Лендинг + тариф **$79 в год** + кнопка Stripe в test mode (Payment Link) | 15%: бизнес |

| Не берём (только на слайде roadmap) | Почему |
|---|---|
| Аккаунты, email, MFA, приглашение супруга | Жюри заходит без логина. Супруг — второй работодатель в той же семье |
| Хранение файлов документов | Приватность и время |
| Распознавание 1099/1098, входящая почта, антивирус | В чек-листе 1099/1098 — строки, «получен» отмечается вручную |
| Защищённая ссылка бухгалтеру со сроком и журналом | Вместо неё PDF-пакет «скачать» |
| Налоги штатов | Только штаты без подоходного налога (TX, FL, WA…), для остальных плашка «state tax: coming soon» |

**Точка решения в 23:00:** если ноябрьский сценарий не работает в проде целиком, январский режим режем до чек-листа на данных демо-персонажа, без загрузки W-2.

## A3. Общая схема

```
┌──────────────────────── БРАУЗЕР (фронт, Алдик) ─────────────────────────┐
│ Страницы: /  /demo  /check  /report  /january                           │
│ Расчётное ядро lib/engine (Макс): считает из данных, полученных с бэка  │
│ Cookie httpOnly: household_secret (32 случайных байта)                  │
│ PDF-пакет для бухгалтера рисуется здесь же                              │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ HTTPS (сертификат Fly)
                                ▼
┌────────────── FLY.IO: один Docker-контейнер (бэк, Макс) ────────────────┐
│ Next.js на Node.js: отдаёт страницы фронта + API                        │
│                                                                         │
│  /api/extract  ── файл в памяти ──▶ Claude API ──▶ поля документа        │
│  /api/explain  ── находки без PII ─▶ Claude API ──▶ тексты               │
│                                                                         │
│  /api/household, /api/employers, /api/documents, /api/checklist         │
│        │                                                                │
│        ▼                                                                │
│  lib/crypto: DEK = HKDF(secret ‖ MASTER_KEY), AES-256-GCM               │
│        │                     ▲ MASTER_KEY и ANTHROPIC_API_KEY            │
│        ▼                     │ из fly secrets, только в памяти           │
│  lib/db (better-sqlite3) ──▶ /data/paytrail.db                           │
└───────────────────────────────┬─────────────────────────────────────────┘
                                ▼
                 Fly volume paytrail_data (1 ГБ), переживает деплои

Демо: /demo/[persona] → mocks/*.json → тот же фронт и то же ядро (в БД не пишется)
Разработка: docker compose up → localhost:3000   Выкладка: fly deploy
CI: GitHub Actions — lint, typecheck, тесты ядра
```

## A4. Папки репо

```
paytrail/
├── app/
│   ├── page.tsx, demo/, check/, report/, january/   ФРОНТ   Алдик
│   └── api/                                         БЭК     Макс
│       ├── extract/, explain/
│       ├── household/, employers/, documents/, checklist/
├── components/                                      ФРОНТ   Алдик
├── lib/
│   ├── engine/      ядро + params/2026/*.json       ОБЩЕЕ   Макс
│   ├── types.ts     общие типы                      ОБЩЕЕ   Макс
│   ├── schemas.ts   JSON-схемы Paystub и W2         БЭК     Макс
│   ├── crypto.ts    шифрование                      БЭК     Макс
│   ├── db.ts        SQLite + migrations/*.sql       БЭК     Макс
│   └── api-client.ts вызовы API с фронта            ФРОНТ   Алдик
├── mocks/           демо-персонажи                  ОБЩЕЕ   Макс + Манс
├── tests/           тесты ядра и crypto             Макс
├── scripts/         генератор синтетики, eval       Макс
├── Dockerfile, docker-compose.yml, fly.toml, .env.example, .dockerignore
└── docs/ARCHITECTURE.md
```

Граница фронт/бэк: `lib/types.ts` + `mocks/`. Макс отдаёт их первыми, Алдик верстает, не дожидаясь бэка.

## A5. Безопасность

**Ключи**

| Ключ | Где живёт | Зачем |
|---|---|---|
| `MASTER_KEY` (32 байта) | `fly secrets`, только в памяти процесса | Половина ключа шифрования |
| `household_secret` (32 байта) | httpOnly + Secure + SameSite=Strict cookie у пользователя и ссылка восстановления | Вторая половина. В БД только `sha256` |
| `DEK` семьи | Нигде не хранится | `HKDF-SHA256(secret ‖ MASTER_KEY, salt = household_id, info = "paytrail-dek-v1")` на каждый запрос |
| `ANTHROPIC_API_KEY` | `fly secrets` | Вызовы Claude, в браузер не попадает |

**Шифрование полей:** AES-256-GCM (`node:crypto`), случайный nonce 12 байт на каждую запись. В колонке `version ‖ nonce ‖ ciphertext ‖ tag`. AAD = `таблица:id_строки:household_id`, поэтому шифртекст нельзя переставить в чужую строку.

| Что украли | Результат |
|---|---|
| Файл базы | Шифртекст и хэши |
| Мастер-ключ | Ничего без секретов семей |
| База и мастер-ключ | Нужен ещё секрет конкретной семьи из её cookie |
| Пользователь потерял cookie и ссылку | Данные не восстановить. Осознанно, честно пишем в UI |

**Остальное**
- В схемах извлечения нет SSN, адреса и номеров счетов: модель их не достаёт, мы их не храним.
- Файлы не сохраняются ни на диск, ни в БД.
- Проверки на входе: только pdf/jpg/png/heic, до 10 МБ и 5 страниц. Лимит запросов по IP на `/api/extract` и `/api/explain` (в памяти).
- Ссылка восстановления = пароль. Показываем один раз с предупреждением «сохраните, мы её не знаем».
- `audit_log` без личных данных: действие, время, хэш IP.
- Автоудаление семей без активности 30 дней, кнопка «Delete my data» удаляет всё каскадом.
- Ни один секрет не попадает в репо: `.env.example`, `.dockerignore`, `fly secrets`.

**Что честно говорим на питче**
- Документ обрабатывается через Claude API. По коммерческим условиям API данные не используются для обучения, но хранятся у Anthropic ограниченное время. **Формулировку сверить с актуальной политикой Anthropic** до дека.
- Шифрование диска на стороне Fly volumes — **проверить в документации Fly**, прежде чем упоминать.
- Не говорим «полностью безопасно». Говорим: «даже при утечке базы ваши данные не прочитать без вашего ключа».

## A6. Поток: ноябрь (проверка листка)

1. Пользователь жмёт «Try with my pay stub» → `POST /api/household` создаёт семью, ставит cookie, показывает ссылку восстановления. Дальше короткая анкета: статус подачи, штат, работодатели и правила 401(k).
2. Загрузка файла → `POST /api/extract`: файл в память → Claude (`document` для PDF, `image` для фото) со строгой JSON-схемой → проверка zod. Если `stop_reason` не `end_turn`, понятная ошибка «попробуйте другой файл».
3. Экран подтверждения: поля с low/medium и проваленной арифметикой подсвечены, пользователь правит.
4. «Looks right» → `POST /api/documents` → сервер шифрует и сохраняет.
5. Браузер: `GET /api/household` → ядро считает находки, прогноз на апрель и рекомендацию W-4.
6. `POST /api/explain` (только коды и суммы находок, без PII) → тексты к карточкам.

## A7. Поток: январь (налоговый сезон)

1. Демо: переключатель «ноябрь → январь» подгружает персонажу листки за весь год. Свой пользователь — кнопка «Tax season».
2. `engine.expectedDocs` строит чек-лист: каждый работодатель → W-2; HSA в листках → 1099-SA и 5498-SA; галочки «ипотека / банк / брокер» → 1098, 1099-INT, 1099-DIV/B. Статусы: ожидается / получен / расхождение / просрочен. Сохраняется через `PATCH /api/checklist/:id`.
3. W-2 загружается через тот же `/api/extract`, модель сама определяет тип документа.
4. `engine.reconcileW2` сверяет с последним листком года:
   - Box 1 ≈ YTD gross − доналоговые вычеты (401(k), здоровье, HSA, FSA);
   - Box 3 и 5 ≈ YTD gross − вычеты, освобождённые от FICA; Box 3 не выше SS wage base;
   - Box 2, 4, 6 ≈ удержанные налоги YTD;
   - Box 12 код D ≈ 401(k) YTD, код W ≈ HSA;
   - расхождение сверх допуска → находка с суммой и действием «попросить W-2c».
5. Прогноз года пересчитывается по фактическим W-2.
6. PDF-пакет для бухгалтера рисуется в браузере: сводка семьи, чек-лист, итоги сверки, открытые вопросы, прогноз. Без исходных документов.

## A8. База данных (SQLite)

```sql
households (
  id            TEXT PRIMARY KEY,          -- uuid
  token_hash    TEXT NOT NULL UNIQUE,      -- sha256(household_secret)
  enc_profile   BLOB NOT NULL,             -- статус подачи, штат, дети, флаги (ипотека, HSA, банк, брокер)
  created_at    TEXT NOT NULL,
  last_seen_at  TEXT NOT NULL
);
employers (
  id            TEXT PRIMARY KEY,
  household_id  TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  member        TEXT NOT NULL CHECK (member IN ('self','spouse')),
  enc_settings  BLOB NOT NULL,             -- название, оклад/ставка, право на сверхурочные, правило 401(k)
  created_at    TEXT NOT NULL
);
documents (
  id            TEXT PRIMARY KEY,
  household_id  TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  employer_id   TEXT REFERENCES employers(id) ON DELETE SET NULL,
  doc_type      TEXT NOT NULL CHECK (doc_type IN ('paystub','w2')),
  tax_year      INTEGER NOT NULL,
  enc_fields    BLOB NOT NULL,             -- подтверждённые поля Paystub или W2 (JSON)
  created_at    TEXT NOT NULL
);
CREATE INDEX idx_documents_household ON documents(household_id, doc_type, tax_year);
checklist_items (
  id            TEXT PRIMARY KEY,
  household_id  TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  form_type     TEXT NOT NULL,             -- W-2, 1099-INT, 1098, 5498-SA …
  enc_source    BLOB NOT NULL,             -- от кого ждём (работодатель, банк)
  status        TEXT NOT NULL CHECK (status IN ('expected','received','mismatch','overdue')),
  due_date      TEXT,
  updated_at    TEXT NOT NULL
);
audit_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  household_id  TEXT,                      -- без ON DELETE: след удаления остаётся
  action        TEXT NOT NULL,             -- create, read, add_document, delete_household …
  ip_hash       TEXT,                      -- sha256(ip + соль)
  at            TEXT NOT NULL
);
```

`PRAGMA foreign_keys = ON` и `journal_mode = WAL` при старте. Находки и прогноз не хранятся: ядро пересчитывает их из данных.

## A9. API

| Метод | Вход | Выход |
|---|---|---|
| `POST /api/household` | — | cookie + ссылка восстановления |
| `GET /api/household` | cookie | профиль, работодатели, документы, чек-лист (расшифрованные) |
| `PUT /api/household/profile` | профиль | ok |
| `POST /api/employers` | настройки работодателя | id |
| `POST /api/extract` | multipart: file | `{document_type: paystub \| w2 \| other, fields, confidence, warnings}` |
| `POST /api/documents` | подтверждённые поля | id |
| `PATCH /api/checklist/:id` | статус | ok |
| `POST /api/explain` | коды и суммы находок, без PII | `{texts}` |
| `DELETE /api/household` | cookie | всё удалено |

## A10. Расчётное ядро `lib/engine`

```
engine/
  params/2026/federal.json   # ставки, стандартный вычет, лимиты 401(k), SS wage base, Pub 15-T,
                             # OBBBA overtime. У каждого числа "source": URL IRS
  params/2026/states.json    # штаты без подоходного налога
  paystub.ts       # нормализация, арифметика, монотонность YTD
  fica.ts          # SS до wage base, Medicare (+ доп. 0,9% сверх порога)
  withholding.ts   # ожидаемое удержание за период по Pub 15-T (W-4 2020+)
  overtime.ts      # FLSA: часы > 40/нед × 1,5 × ставка
  match401k.ts     # правило «X% до Y%» → недобор $ в год
  projection.ts    # налог семьи за год vs удержано + прогноз до конца года
  w4.ts            # Step 4(c) = недобор / оставшиеся выплаты, по каждой работе
  findings.ts      # Finding {code, severity, amountUsd, inputs, action}
  expectedDocs.ts  # профиль дохода → ожидаемые формы и сроки
  reconcileW2.ts   # сверка W-2 с последним листком года
  packet.ts        # данные для PDF-пакета
```

- Ни одного налогового числа в коде, только из `params/<год>`. **Все цифры 2026 Макс сверяет с IRS**, ссылка рядом с числом.
- Дисклеймер в UI: «Estimates only. Not tax advice. Not affiliated with the IRS.»

## A11. JSON-схемы извлечения

Paystub:
```json
{
  "employer_name": "string",
  "pay_period_start": "YYYY-MM-DD", "pay_period_end": "YYYY-MM-DD", "pay_date": "YYYY-MM-DD",
  "pay_frequency": "weekly|biweekly|semimonthly|monthly|unknown",
  "earnings": [{"type": "regular|overtime|bonus|pto|holiday|other", "hours": "number|null",
                "rate": "number|null", "current": "number", "ytd": "number|null"}],
  "taxes": [{"type": "federal_income|social_security|medicare|state_income|local|other",
             "current": "number", "ytd": "number|null"}],
  "deductions": [{"type": "401k_pretax|401k_roth|health|dental|vision|hsa|fsa|other",
                  "pre_tax": "boolean", "current": "number", "ytd": "number|null"}],
  "employer_contributions": [{"type": "401k_match|hsa|other", "current": "number", "ytd": "number|null"}],
  "gross_current": "number", "net_current": "number", "gross_ytd": "number|null",
  "per_field_confidence": {"<path>": "high|medium|low"}
}
```

W2:
```json
{
  "tax_year": "number", "employer_name": "string",
  "box1_wages": "number", "box2_federal_withheld": "number",
  "box3_ss_wages": "number", "box4_ss_withheld": "number",
  "box5_medicare_wages": "number", "box6_medicare_withheld": "number",
  "box12": [{"code": "string", "amount": "number"}],
  "box13_retirement_plan": "boolean",
  "state": [{"state": "string", "box16_wages": "number", "box17_withheld": "number"}],
  "per_field_confidence": {"<path>": "high|medium|low"}
}
```

## A12. Демо, тесты, CI

- `scripts/gen-synthetic.ts`: генератор листков с **известными ответами** и вписанными ошибками.
- Персонажи (вымышленные):
  1. **Главный:** пара с двумя доходами. В ноябре недоудержание, в апреле придёт долг. В январе один W-2 сходится, во втором расхождение в Box 12 код D, 1099-INT ещё не пришёл.
  2. Почасовой работник в TX, недоплата сверхурочных.
  3. Сотрудник на окладе недобирает совпадающий взнос 401(k).
- W-2 для главного персонажа — на официальном бланке IRS с пометкой «SAMPLE — fictional data» (Манс).
- Vitest: ядро на кейсах с известным ответом + `crypto.ts` (расшифровка своим ключом, отказ чужим, отказ при подмене AAD).
- `scripts/eval-extract.ts`: точность распознавания на синтетике. На питче — только реально померенная цифра.
- GitHub Actions: lint, typecheck, тесты на каждый push.

## A13. План по часам (с 14:45)

| Время | Алдик (фронт, QA) | Макс (бэк, ядро, деплой, данные) | Манс (ресёрч, питч) |
|---|---|---|---|
| 14:45–16:00 | Каркас: Tailwind + shadcn/ui, страницы `/`, `/demo`, `/check`, `/report`, `/january` | Репо (публичный), Dockerfile, `fly launch` + volume + secrets, **первый деплой**; `types.ts` + `mocks/` | Цифры боли из IRS/DOL/Fed, цитаты с Reddit |
| 16:00–19:00 | Загрузка + экран подтверждения (на моках) | `/api/extract` + схемы; `crypto.ts` + `db.ts` + миграции; ядро: fica, withholding, match401k | Персонажи + бланки W-2, тексты лендинга |
| 19:00–23:00 | Отчёт: прогноз, находки, W-4; анкета семьи; демо-персонажи | API семьи и документов; overtime, projection, w4, findings; синтетика | Дек v1 (10 слайдов), слайд денег ($79, LTV/CAC) |
| **23:00** | **Решение по январскому режиму** | | |
| 23:00–03:00 | Январь: переключатель, чек-лист, сверка W-2, PDF-пакет | expectedDocs, reconcileW2, packet; `/api/explain`; тесты, CI | Сценарий питча, ответы на вопросы жюри |
| 03:00–07:00 | Сон / QA по очереди | Сон / баги по очереди | Сон |
| 07:00–10:30 | Полировка, финальный QA в инкогнито и с телефона | Баги, README, `docs/ARCHITECTURE.md` | Скриншоты прода в дек, 3 прогона питча |
| **10:30** | **Фриз кода** | Финальный `fly deploy` | PDF дека |
| **11:00** | | **Сдача (капитан).** До 12:00 буфер | |

---

# Часть B. Целевая архитектура (после хакатона)

## B1. Контейнеры

```
[Пользователь] ─ HTTPS ─▶ [Next.js на Fly.io, несколько машин]  ─▶ [Postgres (Fly или Supabase) + RLS]
[Бухгалтер]  ─ ссылка ─▶   (UI, API, вебхуки Stripe)              [Объектное хранилище, шифрование]
                               │ enqueue                          [KMS для ключей]
                               ▼
                    [Worker: Node или Python]
                     - предобработка фото (поворот, перспектива, PDF→img)
                     - закрашивание SSN до отправки в LLM
                     - Claude API: классификация + извлечение
                     - валидация, расчётное ядро (+ Tax-Calculator CC0 для полного налога)
                     - генерация пакета для бухгалтера
[Claude API] [Stripe] [Email: входящие и уведомления] [Антивирус в worker]
```

## B2. Что меняется относительно хакатона

| Хакатон | Целевая версия |
|---|---|
| SQLite на одном volume | Postgres с репликами, RLS, бэкапы |
| Ключ из cookie + мастер-ключ | Envelope encryption: ключи семей в KMS, ротация |
| Без аккаунтов | Email + MFA, приглашение супруга, роли |
| Файлы не храним | Опционально храним с шифрованием и сроком жизни |
| Синхронное распознавание | Очередь, повторы, dead-letter, статусы документа |
| PDF-пакет «скачать» | Ссылка бухгалтеру: токен 256 бит, срок, отзыв, журнал просмотров |
| W-2 | + 1099, 1098, 1095-A |
| Штаты без налога | 5 крупных штатов, потом все 50 |

## B3. Таблицы целевой версии

`users`, `households`, `household_members`, `employers`, `employment_settings`, `documents`, `extracted_fields`, `paystubs`, `tax_forms`, `income_sources`, `expected_documents`, `findings`, `tax_rule_sets`, `tax_projections`, `recommendations`, `share_links`, `share_link_views`, `subscriptions`, `audit_log`.

Доступ: строка видна только участникам семьи (RLS). Администратор по умолчанию не видит документы; доступ поддержки выдаёт сам пользователь, с записью в `audit_log`.

## B4. Версионирование налоговых правил

`tax_rule_sets(year, jurisdiction, version)`: параметры + ссылки на первоисточники. Каждый прогноз хранит версию правил, поэтому воспроизводим. Новая версия = регрессионные тесты + сверка с PolicyEngine (AGPL, только во внутреннем тест-сервисе).

## B5. Качество

- Синтетика с известными ответами → точность по полям, recall ошибок, доля ложных тревог.
- Каждый PR: тесты ядра + быстрый eval на 50 документах. Ночью — полный eval.
- Модель выбирается по eval: старт с `claude-opus-5-5`, более дешёвые модели сравниваются на тех же метриках, решение за командой.

## B6. Стоимость (оценка, допущения явные)

- Claude Opus 5.5 ($4 / $20 за 1M токенов), допущение ~4k входных и ~1,5k выходных токенов на документ → **~$0,05 за документ**. Проверить по `usage` на реальном eval.
- Пользователь в год: ~26 листков + ~5 форм + тексты ≈ 35 вызовов ≈ **$1,5–2**.
- 1 000 пользователей ≈ $1,5–2k в год на LLM, 10 000 ≈ $15–20k. Пик январь–апрель, переобработка вне пика через Batch API (−50%).
- Инфраструктура (цены сверить на сайтах): Fly.io машины + Postgres, хранилище, email, Stripe. Порядок — сотни $ в месяц на 10k пользователей. LLM и Stripe дороже инфраструктуры.

## B7. Риски и v2

| Риск | Мера |
|---|---|
| Ошибка в налоговой логике | Детерминированное ядро, версии правил, сверка с PolicyEngine, дисклеймеры, «показать расчёт» |
| Плохое распознавание фото | Экран подтверждения, confidence, eval по полям |
| Утечка PII | Шифрование полей, закрашивание SSN до LLM, минимальное хранение, аудит |
| Сезонный пик | Очередь + автомасштабирование worker, Batch API |
| Юр. статус «налоговый совет» | Только расчёты и пояснения, консультация юриста до запуска |

v2: Plaid / Argyle / Pinwheel (листки и W-2 напрямую из payroll), мобильное приложение, все 50 штатов, кабинет для бухгалтеров, импорт итогов декларации.
