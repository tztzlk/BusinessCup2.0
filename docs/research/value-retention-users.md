# Ценность, удержание и пользователь: доказательная база

Собрано 15.11.2026 (утро) под критерии «Что продаём» (20%) и «Кому продаём» (15%). Каждую страницу из таблицы источников я открывал сам (curl или WebFetch) и копировал цитаты из её текста. Цитаты даны на английском дословно, до 25 слов, многоточие означает пропуск. Пометка **расчёт** значит, что число посчитали мы из чисел источника и в самом источнике его нет.

Что уже есть в `docs/research/18-00-numbers.md`, здесь не повторяю, а ссылаюсь по номеру (например, «18-00 п. 2.7»).

**Ограничения доступа.** Reddit, census.gov и dol.gov (пресс-релизы) отдают 403 всем инструментам Claude, поэтому новых цитат с Reddit здесь нет. Вместо них взяты публичные посты TurboTax Community, которые я открыл сам. Цитаты R1–R6 из 18-00 переписывал Манс вручную, я их не открывал: в этом файле у них статус «проверено Мансом, мной не открывалось».

**Цена.** В коде сейчас $99/год (`lib/plan.ts`, `app/page.tsx`). В CLAUDE.md всё ещё указаны $79, и это надо поправить.

---

## Выжимка: 8 самых сильных фактов

| # | Факт | Источник (ID в таблице ниже) | Зачем нужен |
|---|---|---|---|
| 1 | IRS: «Check your withholding every January… also… when you have a major life change», а после изменения в течение года ещё раз «in late December» | S9, IRS Tax Withholding Estimator | Сам IRS задаёт ритм возврата: январь, жизненные события, декабрь. Это ответ на вопрос «почему подписка» |
| 2 | Pub 505 (2026): проверить удержание, когда придёт первый листок за полный период 2026 года; «The earlier in the year you check… the easier»; через работодателя удержание за прошлые выплаты задним числом доплатить нельзя. Плюс S2: «Check your withholding often» | S7, S2 | Через работодателя исправить можно только будущими зарплатами (иначе — самому платить estimated tax), поэтому выгодно проверять часто, а не раз в год (наш вывод) |
| 3 | Штраф за недоплату в течение года начисляется по ставке IRS за недоплату: **7% годовых** (IV кв. 2026), отдельно за каждый квартальный срок. Обычно ("Generally", S1) он не грозит, если доплата при подаче меньше $1 000 или уплачено ≥ 90% налога текущего года либо 100% (110% при AGI > $150 тыс.) налога прошлого года | S1, S2, S3, S4 | Ответ на «счёт — не экономия»: экономим штраф и проценты, сам налог не уменьшаем |
| 4 | Не можешь заплатить в апреле: пеня 0,5% в месяц (0,25% в рассрочке), установка рассрочки **$69–178** (онлайн с автосписанием $29) плюс проценты. За FY2025 IRS открыл **3 160 047** новых рассрочек | S5, S6, S16 | Цена апрельского сюрприза в деньгах |
| 5 | Biweekly — самая частая частота выплат (43,0% частных предприятий, 66,6% среди предприятий на 1 000+ работников); при такой частоте это 26 листков в год на человека и **52 на пару**, если biweekly у обоих (расчёт) | S10, S11 | Регулярная точка возврата в продукт: 26 раз в год у каждого |
| 6 | **20,6%** наёмных работников проработали у текущего работодателя год или меньше (январь 2026) | S12 | Каждая смена работы означает новую W-4 и новый риск недоудержания |
| 7 | 2026: в W-2 появился код TT (сверхурочные), но с них «still generally subject to federal income tax withholding». Учесть вычет в удержании работник может через W-4 Step 4(b), где в рабочем листе есть строка 1b про сверхурочные | S8, S14, S15 | Почему именно в 2026 году нужна новая W-4 и сверка W-2 в январе |
| 8 | Посты в TurboTax Community от семей, где работают оба: «Ever since we were married 4 years ago, we end up having to pay about $4k in taxes each year», «surprise tax bill of about $17,000» | F1–F3, F6, F8, F9 | Проблема повторяется каждый год, это голос пользователя (форум, без интервью) |

---

## A. Ценность: что даёт избежать апрельского сюрприза

Честная позиция: **PayTrail не уменьшает налог.** Налог тот же. Семья выигрывает в четырёх местах: (1) штраф за недоплату в течение года, (2) пеня и проценты, если сразу заплатить нечем, (3) деньги распределяются по зарплатам вместо разового платежа, (4) находки в листках, которые и есть деньги: неоплаченные сверхурочные, недобранный match.

### A.1. Штраф за недоплату (estimated tax penalty): правила

| # | Утверждение | Число | Источник | Дословно | Для слайда |
|---|---|---|---|---|---|
| A1.1 | Налог платится по мере заработка. Недоплата в течение года ведёт к штрафу | — | S1, IRS Topic no. 306, обновлено 24.09.2026 | "If you didn't pay enough tax throughout the year, either through withholding or by making estimated tax payments, you may have to pay a penalty" | Как есть |
| A1.2 | Порог $1 000 и правило 90% / 100% | $1 000; 90%; 100% | S1 | "owe less than $1,000 in tax after subtracting their withholding and refundable credits, or if they paid … at least 90% … or 100%" | Как есть |
| A1.3 | При AGI выше $150 тыс. ($75 тыс. при раздельной подаче) вместо 100% берётся 110% | 110%; $150 000 | S3, Instructions for Form 2210 (2025), стр. 1, «Higher income taxpayers»; то же на S2 | "If your adjusted gross income (AGI) for 2024 was more than $150,000 … substitute 110% for 100% in (2) above." | Для Q&A. Важно для пар с $150 тыс. и выше |
| A1.4 | Штраф считается отдельно по каждому сроку и может начисляться, даже если в итоге положен возврат | — | S3, стр. 1, «Penalty figured separately for each required payment» | "you may owe the penalty for an earlier due date even if you paid enough tax later to make up the underpayment" | Для Q&A |
| A1.5 | **Удержание из зарплаты по умолчанию считается уплаченным равномерно**: по ¼ на каждый срок | — | S3, стр. 4, Part III, Section A | "you are considered to have paid one-fourth of these amounts on each payment due date unless you can show otherwise." | **Ключевой довод:** работник W-2, который в ноябре или декабре увеличил удержание, закрывает недоплату и за прошлые кварталы. Поэтому PayTrail полезен и в конце года |
| A1.6 | Ставка в расчёте штрафа равна ставке IRS за недоплату. В рабочем листе к 2210 это множитель 0.07 | 7% | S3, Penalty Worksheet (Worksheet for Form 2210, Part III, Section B), Rate Periods 1–4 | "Underpayment on line 1a × Number of days on line 3 / 365 × 0.07" (строка 4 рабочего листа, стр. 7 PDF) | Для Q&A |
| A1.7 | Ставка IRS по недоплате для физлиц в 2026 году: 7% (I кв.), 6% (II кв.), 7% (III кв.), 7% (IV кв.) | 7% | S4a, IRS Quarterly interest rates, таблица «2026 interest rates by category», обновлено 10.09.2026 | "Underpayment (corporate and non-corporate) 7% 7% 6% 7%" (столбцы: IV, III, II, I кв.) | Как есть |
| A1.8 | IV квартал 2026 года: 7% годовых с ежедневной капитализацией | 7% | S4b, IR-2026-98, 21.08.2026 | "For individuals, the rate for overpayments and underpayments will be 7% per year, compounded daily." | Как есть |
| A1.9 | IRS сам советует часто проверять удержание | — | S2, IRS «Underpayment of estimated tax by individuals penalty», обновлено 20.08.2026 | "Check your withholding often and adjust it when your situation changes." | **Как есть.** Цитата для слайда про удержание |

Ставку на I квартал 2027 года IRS на 15.11.2026 ещё не объявил (по прошлым годам релиз выходит в середине ноября). На слайде писать «7% (IRS, Q4 2026)».

### A.2. Сколько людей платят штраф (из 18-00, не дублирую)

- 15 025 409 деклараций со штрафом, $5,27 млрд, в среднем ~$351 (**расчёт**), налоговый год 2023: 18-00 п. 2.7 (SOI Table 3.3). В группе AGI $100–200 тыс. таких 4 530 001 (16,4%, расчёт).
- 41,3% деклараций с AGI $100–200 тыс. доплачивали при подаче, в среднем ~$4 374 (**расчёт**): 18-00 п. 2.6.
- 15 734 656 начисленных штрафов «Estimated tax» за FY2025: 18-00 п. 2.8.

Оговорка из 18-00 остаётся в силе: в эти числа входят самозанятые.

### A.3. Если заплатить в апреле нечем: пеня, проценты, рассрочка

| # | Утверждение | Число | Источник | Дословно | Для слайда |
|---|---|---|---|---|---|
| A3.1 | Пеня за неуплату: 0,5% в месяц, не больше 25% | 0,5% / мес. | S5, IRS Failure to pay penalty, обновлено 23.10.2026 | "The failure to pay penalty is 0.5% of the unpaid taxes for each month or part of a month the tax remains unpaid." | Как есть |
| A3.2 | В одобренной рассрочке при вовремя поданной декларации пеня 0,25% в месяц | 0,25% / мес. | S5 | "the failure to pay penalty is reduced to 0.25% per month (or partial month) during your approved payment plan." | Как есть |
| A3.3 | Плата за оформление долгосрочной рассрочки: автосписание — $29 онлайн / $107 иначе; без автосписания — $69 онлайн / $178 иначе; плюс пени и проценты | $29–178 | S6, IRS Payment plans, раздел «What are payment plan costs and fees? (updated March 3, 2026)»; страница обновлена 13.08.2026 | "Apply online: $69 setup fee / Apply by phone, mail, or in-person: $178 setup fee … Plus accrued penalties and interest" | Как есть. Короткая рассрочка до 180 дней бесплатна, но пени и проценты идут |
| A3.4 | Новых рассрочек за FY2025 | 3 160 047 | S16, IRS Data Book 2025, Table 4-1, стр. 61 | "Number of new agreements established [11] 3,403,214 3,160,047" (FY2024, FY2025) | С оговоркой: физлица и бизнес вместе, любые долги, не только апрельские доплаты. Как фон, не как наш рынок |
| A3.5 | Иллюстрация: доплата $4 374 (средняя в группе $100–200 тыс., 18-00 п. 2.6) в онлайн-рассрочке на 12 равных платежей без автосписания | ≈ $306 сверху (**расчёт**): $69 установка + ≈ $71 пени (0,25% × сумма остатков) + ≈ $166 процентов (7%/12 × сумма остатков) | Расчёт по S5, S6, S4a | — | Только для Q&A, с пометкой «упрощённый расчёт: простые проценты, остаток на начало месяца» |

### A.4. Как сюрприз бьёт по бюджету

| # | Утверждение | Число | Источник | Дословно | Сила |
|---|---|---|---|---|---|
| A4.1 | 37% взрослых не покроют $400 наличными или эквивалентом | 63% / 37% | 18-00 п. 6.1 (Fed SHED 2025) | — | Сильный (Fed) |
| A4.2 | Pub 505 прямо называет поводом проверить удержание доплату, которую «некомфортно» платить | — | S7, Pub 505 (2026), стр. 5, «When Should You Check Your Withholding?» | "Balance due that is: i. More than you can comfortably pay, or ii. Subject to a penalty." | Сильный (IRS) |
| A4.3 | Из тех, кто ждёт доплату, средняя ожидаемая сумма $2 587; ждут доплату 21% | $2 587; 21% | S17, NerdWallet 2024 Tax Report (Harris Poll, 2–4.01.2024, n = 2 058, ±2,7 п.п.) | "For filers who expect to owe the IRS money, the average estimated bill is $2,587." | **Средний/слабый:** коммерческий опрос, ожидания, а не факт; данные 2024 года |
| A4.4 | 34% получателей возврата собираются погасить им счета | 34% | S17 | "A similar percentage of refund recipients (34%) say they plan to catch up on bills." | Средний/слабый. Довод: возврат — часть бюджета, а неожиданная доплата его ломает |

Свежих исследований Bankrate или NerdWallet за 2025–2026 годы с методологией по теме «неожиданная доплата» найти не удалось (см. «Не подтверждено»).

### A.5. Обратная сторона: переудержание

Тот же расчёт показывает и переплату. IRS (S9): "This helps you prevent an unexpected tax bill, avoid penalties, and maximize your take-home pay." Средний возврат $3 366 (18-00 п. 2.1) — это беспроцентный заём государству. Говорить осторожно: многие любят возврат (в R6 из 18-00 обратная позиция: "I don't even want a refund").

---

## B. Повторная ценность: почему возвращаются каждую выплату

### B.1. IRS сам задаёт ритм проверок

| # | Когда проверять (по IRS) | Источник | Дословно |
|---|---|---|---|
| B1.1 | Когда придёт листок за полный период 2026 года с удержанием по ставкам 2026 года (то есть в начале года, а не «на каждом листке») | S7, Pub 505 (2026), стр. 5 | "You receive a paycheck stub (statement) covering a full pay period in 2026 showing tax withheld based on 2026 tax rates." |
| B1.2 | Чем раньше, тем легче | S7, стр. 5 | "The earlier in the year you check your withholding, the easier it is to get the right amount of tax withheld." |
| B1.3 | Задним числом через работодателя не доплатить | S7, стр. 5, Note | "You can't give your employer a payment to cover federal income tax withholding on salaries and wages for past pay periods" |
| B1.4 | Каждый январь | S9, Tax Withholding Estimator, обновлено 27.06.2026 | "Check your withholding every January to make sure it's correct for the year." |
| B1.5 | При жизненных событиях: новая работа, изменение дохода, брак или развод, рождение ребёнка, покупка дома | S9; S7, Table 1-1, стр. 5 | "You should also check your withholding when you have a major life change, including:" |
| B1.6 | В конце декабря ещё раз, если меняли в течение года | S9 | "If you change your withholding during the year, you may need to update it again in late December" |
| B1.7 | Каждый раз при изменениях | S7, стр. 6 | "You should go through this same process each time your life situation changes" |
| B1.7a | Часто | S2 | "Check your withholding often and adjust it when your situation changes." |
| B1.8 | Новая W-4 при изменениях; в начале следующего года пересчитать | S8, Form W-4 (2026), стр. 2 | "Complete a new Form W-4 when changes to your personal or financial situation would change the entries on the form." / "At the beginning of next year, use the estimator again to recheck your withholding." |
| B1.9 | Калькулятор IRS занимает около 25 минут и ничего не сохраняет | S9 | "This should take about 25 minutes." / "Your information won't be saved or shared with the IRS." |

Вывод для питча (наш, не цитата): IRS советует проверять удержание «often»: когда придёт первый полный листок года, в январе, после жизненных событий и в конце декабря, если меняли W-4. Его калькулятор каждый раз начинает с нуля за 25 минут. PayTrail хранит историю листков обоих супругов и пересчитывает прогноз при каждом новом листке.

### B.2. Сколько листков в году

| # | Утверждение | Число | Источник | Дословно | Оговорка |
|---|---|---|---|---|---|
| B2.1 | Biweekly — самая частая частота выплат | 43,0% частных предприятий; weekly 27,0%, semimonthly 19,8%, monthly 10,3% | S10, BLS CES, «Length of pay periods in the Current Employment Statistics survey», Table 1, февраль 2023 (страница изменена 04.08.2023) | "In February 2023, biweekly was the most common length of pay period, with an estimated 43.0 percent" | Доля **предприятий**, а не работников. Срез, не временной ряд |
| B2.2 | У крупных работодателей biweekly встречается ещё чаще | 1 000+ работников: biweekly 66,6%, weekly 26,3%; 100–249: 59,4% | S10, Table 2 «Frequency of pay periods by size class» | (значения из таблицы) | Довод, что для работников доля biweekly выше 43% — наш вывод, взвешенных по занятости данных BLS не даёт |
| B2.3 | Выплат в год: weekly 52, biweekly 26, semimonthly 24, monthly 12 | 26 | S11, IRS Pub 15-T (2026), Worksheet 1A, Table 3 | "Semimonthly Biweekly Weekly … 24 26 52" (строка таблицы) | — |
| B2.4 | Пара, где оба получают biweekly | **52 листка в год** (**расчёт**: 26 × 2) | — | — | Расчёт |

### B.3. Как часто в листках ошибки (слабые источники)

| # | Утверждение | Число | Источник | Дословно | Сила |
|---|---|---|---|---|---|
| B3.1 | Ошибки есть в каждой пятой расчётной ведомости в США | 1 из 5; $291 за ошибку | S18, пресс-релиз Paycom «EY survey: Payroll errors average $291 each», 22.12.2022. Опрос EY по заказу Paycom: 508 человек, работающих с расчётом зарплаты в компаниях на 250–10 000 работников со штаб-квартирой в США | "One in five payrolls in the United States contains errors, each costing an average of $291" | **Слабый:** заказ вендора, опрос работодателей, а не сверка листков. Ошибки бывают любые, не только в пользу работодателя |
| B3.2 | В той же таблице: ошибки при изменении W-4 и налоговых настроек — 229 на 1 000 работников в год | 229 / 1 000 | S18, таблица категорий | "W4 and tax allocation changes 229 $135,000" | Слабый, тот же опрос. Довод: смена W-4 сама по себе даёт ошибки, поэтому листок после неё стоит проверить |
| B3.3 | 63% работников говорят, что им хотя бы раз недоплачивали; 20% — что это происходит всегда или часто | 63%; 20% | S19, ADP Research Institute, People at Work 2021 (инфографика «payroll accuracy»), 32 000+ работников в 17 странах | "More than three in five (63%) say they have been underpaid at some point, with one in five (20%) saying it always or often happens." | **Слабый:** глобальный опрос, самооценка, маркетинговый материал ADP, 2021 год. Отдельных данных по США нет |
| B3.4 | Недоплаченные сверхурочные: $146,4 млн для 110 551 работника (FY2025) | — | 18-00 п. 3.1 (DOL WHD) | — | Сильный, но это только закрытые дела |

На слайд ставить только B3.4. B3.1 годится для Q&A с оговоркой «по данным опроса EY по заказу Paycom».

### B.4. Жизненные события в течение года

| # | Событие | Число | Источник | Дословно | Оговорка |
|---|---|---|---|---|---|
| B4.1 | Год или меньше у текущего работодателя | **20,6%** наёмных работников (январь 2026; в январе 2024 было 22,2%) | S12, BLS «Employee Tenure in 2026», USDL-26-1532, 24.09.2026 | "In January 2026, the share of wage and salary workers with a year or less of tenure with their current employer was 20.6 percent" | Сюда входят и подростки (16–19 лет: 74,1%). Медианный стаж 4,1 года, у 25–34 лет — 3,0 года |
| B4.2 | Рождений в США | 3 628 934 (2024) | S13a, CDC NCHS FastStats «Births and Natality», последний пересмотр 29.09.2026; источник: «Births: Final Data for 2024» | "Number of births: 3,628,934" | — |
| B4.3 | Браков в США | 2 041 926; 6,1 на 1 000 человек (предварительные данные за 2023) | S13b, CDC NCHS FastStats «Marriage and Divorce», последний пересмотр 17.03.2025 | "Number of marriages: 2,041,926" | Данные за 2023 год, предварительные |
| B4.4 | Все три события IRS перечисляет как повод проверить удержание | — | S9; S7, Table 1-1 | Table 1-1: "Marriage / Divorce / Birth or adoption of child … You or your spouse start or stop working or start or stop a second job" | — |

Как связать (наш вывод): у пары два работодателя, а каждый пятый наёмный работник (20,6%) работает на текущем месте год или меньше (B4.1). Это доля по стажу, а не вероятность смены работы за год, так что использовать только как грубый ориентир. Кроме того, в США за год около 2 млн браков (2023, предв.) и 3,6 млн рождений (2024). Для каждого такого события IRS просит пересчитать W-4.

### B.5. 2026 год: OBBBA, сверхурочные и новая W-4

| # | Утверждение | Число | Источник | Дословно |
|---|---|---|---|---|
| B5.1 | Вычет на сверхурочные: только «половинка» полуторной ставки, 2025–2028, до $12 500 ($25 000 при совместной подаче), сокращается при MAGI выше $150 тыс. / $300 тыс. | $12 500 / $25 000 | S14, IRS Fact Sheet FS-2025-03 (14.07.2025, обн. 25.07.2025) | "Maximum annual deduction is $12,500 ($25,000 for joint filers)." |
| B5.2 | Супругам вычет доступен только при совместной подаче | — | S14 | "file jointly if married, to claim the deduction." |
| B5.3 | Новый код W-2 Box 12 TT — квалифицированные сверхурочные | — | S15, General Instructions for Forms W-2 and W-3 (2026), стр. 23 (Code TT), What's New, стр. 2 | "only the "half" portion of "time-and-a-half" compensation would be reported using code TT." |
| B5.4 | Со сверхурочных по-прежнему удерживается подоходный налог | — | S15, стр. 23 | "Overtime compensation is still generally subject to federal income tax withholding" |
| B5.5 | В W-4 (2026) в Step 4(b) появилась строка про квалифицированные сверхурочные, до $12 500 ($25 000 при MFJ) | — | S8, Form W-4 (2026), стр. 4, «Step 4(b)—Deductions Worksheet», строка 1b | "Qualified overtime compensation. If your total income is less than $150,000 ($300,000 if married filing jointly), enter an estimate" |
| B5.6 | Step 4(b) нужен, чтобы уменьшить удержание с учётом этих вычетов | — | S8, стр. 2, Step 4(b) | "want to reduce your withholding to account for these deductions. This includes … qualified tips, overtime compensation" |

Вывод (наш, сформулирован по B5.4–B5.6): пока работник не подаст новую W-4 с Step 4(b), работодатель удерживает налог со сверхурочных как раньше, и вычет сработает только при подаче декларации в следующем году (больше возврат или меньше доплата). Это не нарушение, а выбор: деньги сейчас или возврат потом. PayTrail показывает обе цифры. В январе W-2 с кодом TT можно сверить со строками сверхурочных в листках за год. Это и есть январский режим.

---

## C. Пользователь: кто он

### C.1. Демография (новое, в дополнение к 18-00 п. 5)

| # | Утверждение | Число | Источник | Дословно / как получено | Оговорка |
|---|---|---|---|---|---|
| C1.1 | Семьи в браке, где работают оба: 30,7 млн (49,1%); с детьми — 15,0 млн (66,3%) | — | 18-00 п. 5.1–5.2 (BLS) | — | Повтор, для связки |
| C1.2 | Медианная недельная зарплата при полной занятости, III кв. 2026: $1 232 → ≈ $64 064 в год; на двоих ≈ **$128 128** (**расчёт**: × 52, × 2) | $1 232 | S20, BLS «Usual Weekly Earnings of Wage and Salary Workers, Third Quarter 2026», USDL-26-1604, 21.10.2026 | "Median weekly earnings of the nation's 122.2 million full-time wage and salary workers were $1,232" | Сумма двух медиан — расчёт, а не медиана пар |
| C1.3 | Возраст 35–44: мужчины $1 536, женщины $1 263 в неделю → пара ≈ **$145 548** в год (**расчёт**) | $1 536; $1 263 | S20 | "Median weekly earnings were $1,536 for men ages 35 to 44" | Расчёт; это зарплата, а не AGI |
| C1.4 | Совместных деклараций (MFJ и вдовцы) — 54 568 939, налоговый год 2023 | 54,6 млн | S21, IRS SOI Table 1.2, Tax Year 2023 («Publication 1304, March 2026»), строка «All returns, total» | Столбец "Returns of married persons filing jointly and returns of surviving spouses", "Number of returns" | — |
| C1.5 | Доля совместных среди деклараций супругов | **92,9%** (**расчёт**: 54 568 939 / (54 568 939 + 4 139 858 MFS)) | S21 | — | По числу деклараций; при раздельной подаче одна пара подаёт две, так что по парам доля ещё выше |
| C1.6 | В группе AGI $100–200 тыс. совместных деклараций 18 900 024 из 27 602 755 | **68,5%** (**расчёт**) | S21, строка "$100,000 under $200,000" | — | Связка с 18-00 п. 2.6: в этой группе 41,3% доплачивают при подаче. Разреза «доплачивают × совместные» в публичных таблицах нет |
| C1.7 | Совместных деклараций с AGI $75–200 тыс. | **25 868 931** (**расчёт**: 6 968 907 + 18 900 024), 47,4% всех совместных | S21 | — | Ориентир масштаба ниши, не все из них пары с двумя доходами |
| C1.8 | Сезон 2026: 90 095 000 из 158 093 000 электронных деклараций подали профессионалы | **57,0%** (**расчёт**) | S22, IRS Filing season statistics, неделя до 16.10.2026 | "E-filing returns received from tax professionals 86,758,000 90,095,000 3.8" (2025, 2026, %) | Только e-file. Довод для канала «бухгалтеры» и для PDF-пакета бухгалтеру |
| C1.9 | Доходные группы пар с двумя доходами (Census CPS ASEC, F-13 и т. п.) | — | — | — | **Не подтверждено:** census.gov отдаёт 403. Заменено на C1.2–C1.7 |

**Портрет (собран из цифр выше, без выдуманных людей).** Супруги 30–45 лет, оба на W-2 у разных работодателей, получают biweekly, вместе зарабатывают около $130–150 тыс. (C1.2–C1.3), подают совместно (C1.5). Попадают в группу AGI $100–200 тыс., где 41% деклараций доплачивают при подаче, в среднем ~$4 374 (**расчёт**, 18-00 п. 2.6). Среди всех электронных деклараций 57% подают профессионалы (C1.8; по нашей группе отдельно данных нет). Учесть вторую работу в W-4 можно через Step 2 (или доплату в Step 4(c)); про старую W-4 IRS писал, что инструкции для нескольких работ многие работники «may have overlooked» (18-00 п. 1.5, предположение IRS, а не измерение).

### C.2. Голос пользователя: посты на форумах

**TurboTax Community (ttlc.intuit.com).** Публичный форум Intuit, все страницы открывал сам, текст взят из поста (og:description и WebFetch). Даты — отметка сайта в UTC. Ники не приводим. **Оговорка о выборке:** F1–F7 опубликованы 28.05.2025 в рамках события форума «Ask the Experts — W4 — May 2025» (метка на странице). Это люди, которые сами пришли с вопросом про W-4, а не случайная выборка. F9 тоже из события форума («Ask the Experts — Refund II — April 2024»). В F4 не сказано прямо, что работают оба, поэтому в выжимку он не идёт.

| # | Тема | Дата | Ссылка | Дословно (≤ 25 слов) | Оговорка |
|---|---|---|---|---|---|
| F1 | Оба на W-2, неожиданная доплата около $17 000, хотят избежать повтора | 28.05.2025 | [пост](https://ttlc.intuit.com/community/taxes/discussion/w-4-guidance-for-dual-income-household-avoiding-another-17k-tax-bill/00/3686418) | "my spouse and I ended up with a surprise tax bill of about $17,000, despite being W-2 employees with what we thought were sufficient withholdings." | Доход около $210K + $110K, бонусы и аренда: выше типичной пары. В тот год купили дом |
| F2 | Оба работают, доплата почти $2 600, удержание у жены около 10% | 28.05.2025 | [пост](https://ttlc.intuit.com/community/taxes/discussion/married-filed-jointly-for-ty2024-owed-much-more-than-we-expected/00/3686487) | "We both work full-time, and we ended up owing much more than we expected, nearly $2600." | Типичная сумма; механизм (низкое удержание у второго супруга) совпадает с нашим |
| F3 | Оба работают, доплата около $4k **каждый год** с самой свадьбы | 28.05.2025 | [пост](https://ttlc.intuit.com/community/taxes/discussion/why-am-i-owing-each-year/00/3686818) | "Ever since we were married 4 years ago, we end up having to pay about $4k in taxes each year." | **Лучшая цитата для удержания:** проблема повторяется ежегодно |
| F4 | Совместно 3 года, доплата около $3k каждый год | 28.05.2025 | [пост](https://ttlc.intuit.com/community/taxes/discussion/w4/00/3686779) | "Every year we end up owing a lot of money around 3 k." | Короткий пост, оба ли работают — не сказано прямо |
| F5 | Совместно, ребёнок 1 год, каждый год недоплата и штраф | 28.05.2025 | [пост](https://ttlc.intuit.com/community/taxes/discussion/w-4-question/00/3686654) | "every year it seems we are not putting enough of our paychecks towards our taxes, and get penalized." | Спрашивает про «allowances», которых в W-4 нет с 2020 года: путаница с формой |
| F6 | Оба работают, ребёнок родился в 2024, «owed a lot» | 28.05.2025 | [пост](https://ttlc.intuit.com/community/taxes/discussion/w4-help/00/3686737) | "My husband and I both work, I make slightly more. We have 1 child born in 2024." | Сумма не названа; есть жизненное событие (рождение) |
| F7 | Совместно $240k, доплата почти $14k, цель — ноль | 28.05.2025 | [пост](https://ttlc.intuit.com/community/taxes/discussion/w-4-update/00/3686602) | "we still owed almost $14k after filing taxes. What's the best route to take to ensure we owe nothing (or close to nothing" | Доход выше медианы. Цель «ноль в апреле» совпадает с позиционированием PayTrail |
| F8 | Оба работают, похожие доходы; у жены в федеральной W-4 стоял «Single» | 10.04.2023 | [пост](https://ttlc.intuit.com/community/tax-credits-deductions/discussion/owed-money-confused-on-w-4-status/00/3016931) | "My wife and I both work. We make roughly the same amount, have no children, and we file jointly. This year we owed a lot" | Пост 2023 года, не из майского события 2025 |
| F9 | Оба на полной ставке, $244 732 на двоих, доплата $11K | 24.04.2024 | [пост](https://ttlc.intuit.com/community/taxes/discussion/spousal-federal-withholdings-on-our-w4-both-earn-full-time-wages/00/3349798) | "We owed $11K in Federal Taxes because we did not pay enough Federal Taxes in 2023." | Доход выше типичного |

**Reddit (из 18-00 п. 7, мной не открывались, проверены Мансом).** Для слайда «User» по-прежнему лучшие R6 ("We didn't change our W4 withholdings so were both single… owe nearly $10K.") и R5 ("I can't afford to pay taxes at the end of the year…"). Перед вставкой в дек нужна сверка Манса по оригиналу, как и указано в 18-00.

**Не найдено с открытой ссылкой:** посты про неоплаченные сверхурочные и недобранный 401(k) match. Reddit закрыт, пресс-релизы DOL по отдельным делам закрыты (403). На слайдах эту тему закрывают цифры DOL и Vanguard (18-00 пп. 3–4).

---

## D. Черновики для дека (EN) и ответы на вопросы

### D.1. Слайд «Why they pay and come back»

**Заголовок:** Why families pay — and come back every paycheck

- **Check often, not once a year.** The IRS says to check withholding "often": when the first full pay stub of the year arrives, every January, after life changes, and again in late December if you changed it. Biweekly pay means 26 stubs per spouse a year. *(IRS Pub 505 2026 p.5; IRS underpayment penalty page; IRS Tax Withholding Estimator; Pub 15-T 2026)*
- **The earlier you fix it, the cheaper.** Your employer can't take a payment for past paychecks, so the fix is more withholding on the paychecks left. Waiting can cost an underpayment penalty at the IRS rate (7%/yr in Q4 2026), 0.5%/month if the tax stays unpaid, and a $29–$178 payment plan setup fee. *(Pub 505 p.5; IR-2026-98; IRS Failure to pay penalty; IRS Payment plans)*
- **Life keeps changing the math.** 20.6% of workers have been at their job a year or less, and a new job means a new W-4. In 2026, getting the overtime deduction into your paycheck (not just at filing) also takes a new W-4, Step 4(b). *(BLS Employee Tenure 2026; Form W-4 2026)*

Сноска: "A penalty may apply if you owe $1,000+ after withholding and paid less than 90% of this year's tax or 100% of last year's (110% if prior-year AGI was over $150K) (IRS Topic 306; Form 2210 instructions). No retention data of our own yet: launched Nov 14, 2026."

**Подводка, 20 секунд (RU):**
«Почему подписка, а не разовая покупка? Потому что IRS сам советует проверять удержание часто: с первым полным листком года, каждый январь, после свадьбы, рождения ребёнка или новой работы и ещё раз в конце декабря. Через работодателя задним числом не доплатишь, поправить можно только оставшимися зарплатами, и чем раньше, тем легче. А опоздание может стоить штрафа по ставке IRS 7% годовых, пени и платы за рассрочку. Если оба супруга получают раз в две недели, это 52 листка в год, и каждый — повод открыть PayTrail.»

### D.2. Слайд «User»

**Заголовок:** Two W-2 jobs, one tax return, one April surprise

- **Family:** married, both on W-2 at different employers, paid biweekly, ~$130K–$145K combined, filing jointly. *(BLS Usual Weekly Earnings Q3 2026: medians $1,232/week; ages 35–44 $1,536 men / $1,263 women — our ×52 sum of two individual medians)*
- **Quote:** "Ever since we were married 4 years ago, we end up having to pay about $4k in taxes each year." *(TurboTax Community, May 2025)*
- **Scale:** 30.7M married-couple families where both spouses work. *(BLS 2025)* In the $100K–$200K AGI band, 41% of returns owe at filing. *(IRS SOI TY2023, our calc)*

Вместо F3 можно поставить R6 из 18-00 ("We didn't change our W4 withholdings so were both single…"), если Манс подтвердит дословность. F3 сильнее для удержания (каждый год), R6 — для механизма (Single в W-4).

**Подводка, 20 секунд (RU):**
«Наш пользователь — пара, где оба работают на W-2 у разных работодателей. Вместе около ста тридцати–ста сорока пяти тысяч, подают совместно. Если в W-4 не учтена вторая работа, каждый работодатель удерживает налог так, будто это единственный доход в семье, и в апреле приходит счёт. Семей, где работают оба супруга, в США 30,7 миллиона. В доходной группе $100–200 тысяч 41% деклараций доплачивают при подаче. Вот что пишет одна такая семья: "каждый год с самой свадьбы мы доплачиваем около четырёх тысяч".»

### D.3. Честные ответы на вопросы жюри

**1. «Зачем годовая подписка на проблему раз в год?»**
- RU: Проблема только кажется ежегодной: через работодателя удержание можно поправить лишь оставшимися зарплатами, и чем раньше, тем легче. Поэтому IRS советует проверять его часто: с первым полным листком года, в январе, после жизненных событий и в конце декабря. Если оба супруга получают раз в две недели, у пары 52 листка в год; каждый пятый работник работает на текущем месте год или меньше; а в январе нужно сверить W-2 с листками. Своих данных об удержании клиентов у нас пока нет: мы запустились вчера, а в юнит-экономике заложены чужие бенчмарки (28–50%).
- EN: The problem looks yearly, but through your employer withholding can only be fixed on the paychecks left, and the earlier the easier. That's why the IRS says to check it often: with the first full pay stub of the year, every January, after life changes and again in late December. If both spouses are paid biweekly, that's 52 stubs a year; one in five workers has been at their job a year or less; and January brings the W-2-vs-stubs check. We don't have our own retention data yet: we launched yesterday, and the model uses outside benchmarks (28–50%).

**2. «Счёт за налог — не экономия. Что я реально получаю?»**
- RU: Верно, налог мы не уменьшаем. Мы помогаем в трёх местах. Первое: избежать штрафа за недоплату (ставка IRS 7% годовых; в среднем ~$351 на декларацию со штрафом, наш расчёт по IRS за 2023 год, включая самозанятых), а если в апреле нечем платить — пени 0,5% в месяц и $29–178 за оформление рассрочки. Второе: доплата расходится по оставшимся зарплатам, а не падает одной суммой. Третье: проверка листков может найти деньги, которые реально ваши: неоплаченные сверхурочные и недобранный match (в демо-семьях: $132 сверхурочных в одном листке, $1 920 match в год). Если семья и так укладывается в safe harbor и спокойно платит в апреле, выигрыш от прогноза небольшой, и мы так прямо и говорим.
- EN: Right, we don't lower your tax. We help in three places. One: avoiding the underpayment penalty (IRS rate 7%/yr; about $351 on average per penalized return, our calc from IRS data for 2023, self-employed included), and if you can't pay in April, the 0.5%/month late-payment penalty and a $29–$178 plan setup fee. Two: the balance is spread over your remaining paychecks instead of one lump sum. Three: the pay stub check can find money that is actually yours, like unpaid overtime and a missed 401(k) match (in our demo households: $132 of overtime in one paycheck, $1,920 a year of match). If a family is already inside the safe harbor and can pay in April comfortably, the forecast alone is worth little, and we say so.

**3. «Почему вы, если вы не в США?»**
- RU: Продукт опирается на публичные правила IRS (Pub 15-T, W-4, Pub 505), а они одинаковы для всех. Ядро воспроизводит все 4 350 значений таблиц Pub 15-T 2026, а годовой федеральный налог совпадает до цента с открытой моделью PolicyEngine-US на 18 из 18 тестовых семей и с Tax-Calculator на 17 из 18 (одно расхождение объяснимо различием в методике); отчёт лежит в `docs/ENGINE-CROSSCHECK.md`. Интервью с американскими семьями у нас пока нет, голос пользователя — только публичные посты, и это первое, что мы сделаем после хакатона.
- EN: The product rests on public IRS rules (Pub 15-T, W-4, Pub 505) that are the same for everyone. Our engine reproduces all 4,350 amounts in the 2026 Pub 15-T wage-bracket tables, and its annual federal tax matches the open-source model PolicyEngine-US within $0.01 on 18 of 18 test households and Tax-Calculator on 17 of 18 (the other differs by design); the report is in the repo. We haven't interviewed US families yet, and the user voice is public posts only, so that is our first step after the hackathon.

---

## Таблица источников

Все страницы открыты 15.11.2026.

| ID | Документ | Год / дата | URL | Где именно |
|---|---|---|---|---|
| S1 | IRS, Topic no. 306, Penalty for underpayment of estimated tax | обн. 24.09.2026 | https://www.irs.gov/taxtopics/tc306 | 1-й абзац |
| S2 | IRS, Underpayment of estimated tax by individuals penalty | обн. 20.08.2026 | https://www.irs.gov/payments/underpayment-of-estimated-tax-by-individuals-penalty | разделы «Avoid a penalty», «Check your withholding» |
| S3 | IRS, Instructions for Form 2210 (2025) | 2025 (действует для налогового года 2025, подача 2026) | https://www.irs.gov/pub/irs-pdf/i2210.pdf | стр. 1 (General Instructions), стр. 4 (Part III, Section A), Penalty Worksheet |
| S4a | IRS, Quarterly interest rates | обн. 10.09.2026 | https://www.irs.gov/payments/quarterly-interest-rates | таблица «2026 interest rates by category» |
| S4b | IRS, IR-2026-98, «Interest rates remain the same for the fourth quarter of 2026» | 21.08.2026 | https://www.irs.gov/newsroom/interest-rates-remain-the-same-for-the-fourth-quarter-of-2026 | 2-й абзац |
| S5 | IRS, Failure to pay penalty | обн. 23.10.2026 | https://www.irs.gov/payments/failure-to-pay-penalty | разделы «How we calculate», «Payment plan» |
| S6 | IRS, Payment plans, installment agreements | обн. 13.08.2026; блок о сборах от 03.03.2026 | https://www.irs.gov/payments/payment-plans-installment-agreements | «What are payment plan costs and fees?» |
| S7 | IRS, Publication 505 (2026), Tax Withholding and Estimated Tax | 2026 | https://www.irs.gov/pub/irs-pdf/p505.pdf | гл. 1, стр. 5 («When Should You Check Your Withholding?», Table 1-1, Note), стр. 6 |
| S8 | IRS, Form W-4 (2026) | создана 08.12.2025 | https://www.irs.gov/pub/irs-pdf/fw4.pdf | стр. 2 (Purpose of Form, TIP, Step 4(b)), стр. 4 (Deductions Worksheet, строка 1b) |
| S9 | IRS, Tax Withholding Estimator | обн. 27.06.2026 | https://www.irs.gov/individuals/tax-withholding-estimator | разделы «What to have ready», «When to check» |
| S10 | BLS CES, Length of pay periods in the Current Employment Statistics survey | данные 02.2023; изм. 04.08.2023 | https://www.bls.gov/ces/publications/length-pay-period.htm | Table 1, Table 2 |
| S11 | IRS, Publication 15-T (2026) | 2026 | https://www.irs.gov/pub/irs-pdf/p15t.pdf | Worksheet 1A, Table 3 |
| S12 | BLS, Employee Tenure in 2026, USDL-26-1532 | 24.09.2026 | https://www.bls.gov/news.release/tenure.nr0.htm | текст релиза |
| S13a | CDC NCHS, FastStats: Births and Natality | пересм. 29.09.2026 (данные 2024) | https://www.cdc.gov/nchs/fastats/births.htm | блок «Data are for the U.S.» |
| S13b | CDC NCHS, FastStats: Marriage and Divorce | пересм. 17.03.2025 (данные 2023, предв.) | https://www.cdc.gov/nchs/fastats/marriage-divorce.htm | блок «Data are for the U.S.» |
| S14 | IRS, FS-2025-03, «Working Families Tax Cuts: Tax deductions for working Americans and seniors» | 14.07.2025, обн. 25.07.2025 | https://www.irs.gov/newsroom/one-big-beautiful-bill-act-tax-deductions-for-working-americans-and-seniors | раздел «No Tax on Overtime» |
| S15 | IRS, General Instructions for Forms W-2 and W-3 (2026) | 2026 | https://www.irs.gov/pub/irs-pdf/iw2w3.pdf | What's New (стр. 2), Code TT (стр. 23) |
| S16 | IRS Data Book 2025 (Pub 55-B) | FY2025 | https://www.irs.gov/pub/irs-pdf/p55b.pdf | Table 4-1, стр. 61 |
| S17 | NerdWallet 2024 Tax Report (Harris Poll) | опрос 2–4.01.2024 | https://www.nerdwallet.com/article/taxes/taxes-study-2024 | основной текст, Methodology |
| S18 | Paycom, «EY survey: Payroll errors average $291 each, impacting the economy» | 22.12.2022 | https://s201.q4cdn.com/761236765/files/doc_news/EY-survey-Payroll-errors-average-291-each-impacting-the-economy-2022.pdf | стр. 1–2 |
| S19 | ADP, payroll accuracy infographic (ADP Research Institute, People at Work 2021) | 2021 | https://www.adp.com/-/media/adp/resourcehub/pdf/adpri/payroll-accuracy-infographic.pdf | вся инфографика |
| S20 | BLS, Usual Weekly Earnings, Q3 2026, USDL-26-1604 | 21.10.2026 | https://www.bls.gov/news.release/wkyeng.nr0.htm | текст релиза |
| S21 | IRS SOI, Table 1.2, Tax Year 2023 (Pub 1304, March 2026) | 03.2026 | https://www.irs.gov/pub/irs-soi/23in12ms.xls | столбцы «All returns», «married filing jointly…», «married filing separately» |
| S22 | IRS, Filing season statistics for week ending Oct. 16, 2026 | обн. 13.11.2026 | https://www.irs.gov/newsroom/filing-season-statistics-for-week-ending-oct-16-2026 | таблица 2026 |
| F1–F9 | TurboTax Community (ttlc.intuit.com) | 2023–2025 | ссылки в разделе C.2 | текст поста |

---

## Не подтверждено

1. **Доходные группы пар с двумя доходами (Census CPS ASEC, таблицы F-12 / F-13).** census.gov отдаёт 403. Заменено на BLS (C1.2–C1.3) и SOI (C1.4–C1.7).
2. **Ставка IRS на I квартал 2027 года.** На 15.11.2026 релиза нет (адрес по шаблону отдаёт 404).
3. **Доля работников (а не предприятий) на biweekly.** У BLS нет данных, взвешенных по занятости.
4. **Новые цитаты с Reddit** (r/personalfinance, r/tax про «both working, owe», «W-4 two jobs», «missed match», «overtime not paid»). Reddit закрыт для всех инструментов Claude (403, «unable to fetch»). Обходить через зеркала я не стал.
5. **Цитаты R1–R6 из 18-00** я сам не открывал. Статус прежний: «проверено Мансом по скриншотам и тексту».
6. **Пресс-релизы DOL WHD по отдельным делам 2026 года** (например, whd20260309, оплата сверхурочных по обычной ставке). Видны только в выдаче поиска, страница отдаёт 403. В дек не ставить.
7. **Свежие (2025–2026) опросы NerdWallet или Bankrate** с методологией о доле неожиданных доплат и способах оплаты. Не найдены. Есть только NerdWallet 2024 (A4.3), и это ожидания, а не факт.
8. **Данные по США о частоте ошибок в листках из независимого источника** (не от вендора). Не найдены. Есть только EY по заказу Paycom (опрос работодателей) и глобальный ADP 2021.
9. **Сколько работников меняют W-4 в течение года.** Публичной статистики IRS не нашёл. Косвенно: 229 ошибок на 1 000 работников в год при изменении W-4 (S18, слабый источник).
10. **Число пар с двумя W-2, которые доплачивают в апреле.** IRS такого разреза не публикует (как и в 18-00).

---

## Независимая проверка (15.11.2026)

Второй проход: все страницы S1–S22 и F1–F9 открыты заново (curl, pdftotext, WebFetch для BLS, CDC и ADP), цитаты сверены с текстом страниц, производные числа пересчитаны.

**Подтверждено дословно:** S1, S2 (обн. 20.08.2026), S3 (стр. 1, 4; множитель 0.07 на стр. 7 PDF), S4a (обн. 10.09.2026), S4b (IR-2026-98, 21.08.2026), S5 (обн. 23.10.2026), S6 ($29 / $107 / $69 / $178, блок от 03.03.2026, страница 13.08.2026), S7 (стр. 5 и 6), S8 (стр. 2, 4; Created 12/8/25), S9 (обн. 27.06.2026), S10 (Table 1–2, изм. 04.08.2023), S11 (Table 3), S12, S13a, S13b, S14, S15 (Code TT, стр. 23), S16 (Table 4-1, стр. 61), S17, S18, S19, S20, S21, S22, SOI Table 3.3 из 18-00 (11 387 118 / 27 602 755; 15 025 409; $5 268 943 тыс.), F1–F9 (текст и даты UTC).

**Пересчитано:** 92,9%; 68,5%; 25 868 931 и 47,4%; 57,0%; $64 064 / $128 128 / $145 548; 41,3% и ~$4 374; ~$351; 16,4%; иллюстрация рассрочки ≈ $306 ($69 + $71 + $166). Всё сходится и помечено как расчёт.

**Исправлено по смыслу:**
1. Pub 505 не говорит «проверять на каждом листке»: поводом названо получение листка за полный период 2026 года по ставкам 2026 года (по сути, первого в году). «Часто» говорит S2 («Check your withholding often»). Исправлены выжимка п. 2, B1.1, вывод B.1, оба черновика и ответ 1.
2. Note в Pub 505 запрещает только платёж работодателю за прошлые периоды; заплатить estimated tax напрямую в IRS можно. Убраны «Fixing it early is the only fix» и «исправить можно только будущими зарплатами» без оговорки «через работодателя».
3. Штраф, пеня и плата за рассрочку — возможные, а не обязательные расходы: «costs» → «can cost», в сноске «applies» → «may apply». 110% взято из инструкций к Form 2210 и S2, в Topic 306 только упомянуты «special rules», поэтому источник в сноске дополнен.
4. Плата за рассрочку на слайде: $69–178 → $29–178 (онлайн с автосписанием — $29).
5. Выжимка п. 8: F4 не говорит, что работают оба, поэтому заменён на F3.
6. «С вероятностью 1/5 сменится работа» — это не вывод из доли по стажу; «3,6 млн семей рожают» → «3,6 млн рождений».
7. Портрет: 57% относится ко всем e-file декларациям, а не к нашей группе; «Step 2 многие пропускают» не подтверждено (18-00 п. 1.5 говорит о старой W-4 и «may have overlooked»).
8. Ответ 3: «совпадает с двумя моделями» → 18/18 PolicyEngine-US и 17/18 Tax-Calculator, как в `docs/ENGINE-CROSSCHECK.md`.
9. Цитата из Table 1-1: «start or stop a second job»; цитата из рабочего листа 2210 приведена полностью.
