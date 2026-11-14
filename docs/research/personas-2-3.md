# Персонажи 2 и 3: истории для данных (Максу)

14.11.2026, вечер. Всё вымышленное: в UI помечать как sample, как пару Alex & Jordan.
Данные уже собраны и прогнаны через ядро (раздел «Готовые данные» в конце). **Числа в UI и деке брать только из ядра.**

Чем персонажи отличаются от уже готового:
- Alex & Jordan: доплата в апреле плюс Jordan не вносит в 401(k) ничего (группа «не участвует», 16% у Vanguard).
- Sample-листок (Sam Rivera): сверхурочные есть отдельной строкой, но оплачены по обычной ставке (`OVERTIME_UNDERPAID`).
- Персонаж 2: **строки сверхурочных нет вообще**, все часы записаны как обычные (`POSSIBLE_UNPAID_OVERTIME`).
- Персонаж 3: **переплата** вместо долга, и взносы в 401(k) есть, но ниже порога match (группа «ниже порога», 26% у Vanguard).

---

## Персонаж 2. Rosa & Tom: часы сверх 40 записаны как обычные

**Карточка в /demo (EN):** "Rosa & Tom — hourly overtime, Texas"
**Подзаголовок (EN):** "Rosa worked 46 hours a week in peak season. Her pay stub paid every hour at the regular rate."

**История.** Роза — старшая смены на складе, почасовая оплата, в сезон работает по 46 часов в неделю. Расчётчик заводит все 92 часа за две недели строкой «Regular», без строки «Overtime». Роза видит в листке «92 hours» и считает, что всё оплачено. Том на окладе. Двое детей.

**Данные для ядра:**

| Поле | Значение |
|---|---|
| profile | `married_joint`, `TX`, `dependentsUnder17: 2`, `otherDependents: 0`, flags все `false` |
| Rosa (`self`) | `payType: "hourly"`, `hourlyRate: 22`, `overtimeEligible: true`, `match401k: { matchPercent: 50, upToPercentOfPay: 4 }`, W-4: `step2Checked: true`, остальное 0 |
| Tom (`spouse`) | `payType: "salary"`, `annualSalary: 58000`, `overtimeEligible: false`, без match, W-4: `step2Checked: true`, `step3Credits` по детям (на одной W-4), остальное 0 |
| Листок Rosa | biweekly, период 10/19–11/01/2026, выплата 11/06/2026; earnings: только `regular`, `hours: 92`, `rate: 22`, `current: 2024.00`; 401(k) 4% |
| Листок Tom | biweekly, обычный, без ошибок |

**Что нашло ядро** (`runCheckup` на 14.11.2026, код `origin/main`; данные — `docs/research/personas/rosa-tom.json`):
- `POSSIBLE_UNPAID_OVERTIME` у Rosa: **$132** за этот листок, то есть (92 − 80) × $22 × 0,5.
- Прогноз на апрель: баланс **−$0,21**, практически ноль. Других находок нет, фокус персонажа на сверхурочных.

**Опора на источники для питча:** DOL WHD за FY2025 взыскал $146 377 245 недоплат за сверхурочные для 110 551 работника ([таблица FLSA](https://www.dol.gov/agencies/whd/data/charts/fair-labor-standards-act)). Это только закрытые дела, а не доля всех недоплат.

**Опционально для питча (не для данных):** неоплаченная надбавка за сверхурочные ещё и уменьшает вычет «no tax on overtime», в который идёт только надбавка (half-time premium). Правило есть в `params/2026/federal.json` со ссылкой на IRS. Говорить, только если ядро это реально показывает.

---

## Персонаж 3. Nina & Marcus: возврат — не бонус

**Карточка в /demo (EN):** "Nina & Marcus — the refund that isn't a bonus"
**Подзаголовок (EN):** "Both checked the Step 2(c) box at very different pay. They lend the IRS money every paycheck — and Nina leaves part of her 401(k) match on the table."

**История.** Нина — аналитик на окладе, Маркус — администратор в школе на окладе, у него зарплата намного ниже. При найме оба отметили Step 2(c) («two jobs»), как советуют в интернете. Каждый апрель у них большой возврат, и они считают его премией. В 401(k) Нина вносит 3%: ей кажется, что этого достаточно, хотя работодатель докладывает 100% до 5%.

**Данные для ядра:**

| Поле | Значение |
|---|---|
| profile | `married_joint`, `TX`, `dependentsUnder17: 0`, `otherDependents: 0`, flags все `false` |
| Nina (`self`) | `payType: "salary"`, `annualSalary: 96000`, `overtimeEligible: false`, `match401k: { matchPercent: 100, upToPercentOfPay: 5 }`, W-4: `step2Checked: true`, остальное 0 |
| Marcus (`spouse`) | `payType: "salary"`, `annualSalary: 34000`, `overtimeEligible: false`, без match, W-4: `step2Checked: true`, остальное 0 |
| Листок Nina | biweekly, выплата 10/31/2026; 401(k) pre-tax **3%** от брутто; строка employer match = 3% (формула соблюдена, ошибки работодателя нет) |
| Листок Marcus | biweekly, без ошибок |

**Что нашло ядро** (`runCheckup` на 14.11.2026, код `origin/main`; данные — `docs/research/personas/nina-marcus.json`):
- `OVERWITHHOLDING`: переплата **$2 662** за год (налог $10 894,40, удержано $13 556,40). Это совпадает с тем, что пишет IRS: при Step 2(c) и сильно разной зарплате удерживается больше нужного (Form W-4 (2026), стр. 2).
- `MATCH_LEFT_ON_TABLE` у Нины: **$1 920** в год (2% от $96 000 при match 100%).
- Рекомендацию по W-4 ядро выдаёт в карточке переплаты; текст смотреть в UI.

**Опора на источники для питча:**
- Form W-4 (2026), стр. 2, Step 2(c): "This option is accurate for jobs with similar pay; otherwise, more tax than necessary may be withheld" ([PDF](https://www.irs.gov/pub/irs-pdf/fw4.pdf)).
- Vanguard, «Better match formulas for 401(k) plans» (July 2026), Figure 1b: 26% работников вносят меньше порога match, ещё 16% не вносят ничего ([PDF](https://corporate.vanguard.com/content/dam/corp/research/pdf/better_match_formulas_401k_plans.pdf)).
- Reddit R1 (r/IRS, молодожёны переплатили около $4 000) — живая цитата к этому сценарию.

---

## Готовые данные

`docs/research/personas/rosa-tom.json` и `nina-marcus.json` — в формате `mocks/couple.json` (`{ _note, household }`). Федеральный налог в листках посчитан функцией ядра `expectedWithholding` (Pub 15-T 2026, Worksheet 1A), SS 6,2%, Medicare 1,45%, YTD = прошлые обычные выплаты + текущая. Прогнаны через `runCheckup` 14.11.2026 на коде `origin/main`: находки ровно те, что выше, лишних (`WITHHOLDING_DIFFERS_FROM_W4`, `NET_PAY_MISMATCH`) нет.

## Что прошу от Макса

1. Положить JSON в `mocks/`, подключить в `lib/demo.ts` и `/demo`.
2. Закрепить сюжеты тестом, как `tests/demo.test.ts` ($132 и −$0,21; $2 662 и $1 920).
3. Если ядро до сдачи поменяется и суммы сдвинутся — правда за ядром, сообщи новые цифры для дека.
