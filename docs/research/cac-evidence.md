# CAC: публичные данные для PayTrail

Собрано 15.11.2026. Каждое число открыто и проверено в первоисточнике: формы 10-K и 424B4 скачаны с SEC EDGAR и прочитаны по тексту, остальные страницы открыты через WebFetch. Если число не удалось открыть или оно не нашлось, оно стоит в разделе 5 с пометкой «не подтверждено».

**Не дублирую** (это у другого агента): тарифы Stripe, число пользователей TurboTax, партнёрские выплаты налоговых программ, удержание по RevenueCat в категории Finance, CPC по ключам W-4 и налогов, W-4 2026 и OBBBA.

**Уже есть в `unit-economics-99.md`** и здесь не повторяется, только уточняется: Dave $16–20 за участника, Chime $109 / $91, CPM Meta по рекламе Keeper, CTR и CPC Meta по WordStream 2025, CPC и конверсия Google в финансах (SEL / Focus Digital), CPC Reddit.

**Главная оговорка.** «Маркетинг ÷ клиенты» — это не CAC новых клиентов. В знаменатель попадают и чистый прирост, и вернувшиеся клиенты, а в числитель бренд, персонал и удержание. Наглядный пример с Chime: раскрытый CAC за 2024 год $109, а реклама 2025 года, делённая на чистый прирост активных, даёт $340 (таблица 2).

---

## 1. Источники и числа

Релевантность: **высокая** — платная потребительская налоговая или финансовая услуга, покупатель похож на нашего; **средняя** — тот же покупатель, но бесплатный банк или брокер либо мобильное приложение вместо веба; **низкая** — другой продукт или другая метрика.

| # | Источник (документ, раздел) | Компания / бенчмарк | Метрика | Значение | Год | Релевантность | Цитата (дословно, ≤ 25 слов) | URL |
|---|---|---|---|---|---|---|---|---|
| 1 | Пресс-релиз «Dave Reports Third Quarter 2026 Financial Results», Q3 2026 Operating Highlights | Dave | CAC нового участника | **$22** (+14% г/г); 1 135 000 новых участников | Q3 2026 | Высокая для дна платного CAC: тот же W-2-покупатель с низким доходом, продукт — подписка ($3 в месяц) с авансом зарплаты. Но «участник» ≠ платящий подписчик | "New members increased 35% to 1,135,000, at a customer acquisition cost of $22" | https://finviz.com/news/415993/dave-reports-third-quarter-2026-financial-results |
| 2 | Тот же релиз, таблица операционных расходов | Dave | Advertising and activation costs | $28,0 млн (Q3 2026); $18,9 млн (Q3 2025) | 2026 | Высокая (сверка с п. 1) | "Advertising and activation costs … 28.0, 18.9, 62.6, 46.3" (Q3 2026, Q3 2025, 9 мес. 2026, 9 мес. 2025, $ млн) | то же |
| 3 | Dave, Form 10-K за 2025, Item 1, «Our Growth Strategy» | Dave | CAC и окупаемость | ≈ **$19**, окупаемость < 4 месяцев | 2025 | Высокая | "Our customer acquisition cost (CAC) has remained stable at approximately $19 while payback periods have improved to under four months" | https://www.sec.gov/Archives/edgar/data/1841408/000119312526085370/dave-20251231.htm |
| 4 | Dave, 10-K 2025, Item 1 | Dave | Повышение цены подписки | $1 → $3 в месяц для новых участников, конверсия «существенно не изменилась» | 2025 | Средняя: единственный публичный пример, как повышение цены в потребительской финансовой подписке сказалось на конверсии; масштаб цены другой | "increasing the monthly membership fee from $1 to $3 for new Members … without materially impacting conversion or retention rates" | то же |
| 5 | H&R Block, Form 10-K FY2026 (год до 30.06.2026), Item 1 | H&R Block | Платные декларации | 11,3 млн assisted + 3,6 млн платных DIY online = **14,9 млн** | FY2026 | Высокая: потребительская налоговая услуга, наш покупатель | "we prepared 11.3 million U.S. assisted tax returns (1) and our clients filed 3.6 million DIY online paid tax returns" | https://www.sec.gov/Archives/edgar/data/12659/000001265926000026/hrb-20260630.htm |
| 6 | H&R Block, 10-K FY2026, MD&A, таблица операционных расходов | H&R Block | Marketing and advertising | **$277,8 млн** (FY2026); $285,8 млн (FY2025) | FY2026 | Высокая (числитель для таблицы 2) | "Marketing and advertising 277,811 285,800" ($ тыс.) | то же |
| 7 | H&R Block, 10-K FY2026, MD&A | H&R Block | Состав маркетинга | включает customer incentives (скидки и бонусы клиентам) | FY2026 | Высокая: стимулы клиентам учтены в маркетинге | "Marketing and advertising expense decreased $8.0 million, or 2.8%, primarily due to lower customer incentive expenses and lower online and television advertising" | то же |
| 8 | Intuit, Form 10-K FY2026, Note 1 «Advertising» | Intuit (вся компания) | Расходы на рекламу | **$2,2 млрд** (FY2026); $2,1 млрд (FY2025) | FY2026 | Низкая для расчёта на клиента: сюда входят QuickBooks, Credit Karma, Mailchimp; маркетинг сегмента Consumer отдельно не раскрыт | "We recorded advertising expense of approximately $ 2.2 billion for the twelve months ended July 31, 2026" | https://www.sec.gov/Archives/edgar/data/896878/000089687826000037/intu-20260731.htm |
| 9 | Intuit, 10-K FY2026, MD&A, сегмент Consumer | Intuit Consumer (TurboTax, Credit Karma, ProTax) | Рост маркетинга сегмента | +$191 млн г/г | FY2026 | Средняя: лидер рынка наращивает маркетинг, конкуренция за то же внимание | "partially offset by an increase in marketing expenses of $191 million and sales-related expenses of $44 million" | то же |
| 10 | Robinhood, Form 10-K 2025, MD&A, сноска к Funded Customers | Robinhood | Новые фондированные клиенты (брутто) | **2,5 млн** (2025); 2,2 млн (2024) | 2025 | Средняя: брокер, но редкий случай раскрытия брутто-притока | "New Funded Customers 2.2 2.5 Resurrected Customers 0.5 0.4 Acquired customers — 0.6 Churned Customers (0.9) (1.7)" | https://www.sec.gov/Archives/edgar/data/1783879/000178387926000023/hood-20251231.htm |
| 11 | Robinhood, 10-K 2025, отчёт о прибылях и Note «Marketing» | Robinhood | Marketing / реклама | Маркетинг $399 млн; реклама **$274 млн** | 2025 | Средняя | "Advertising costs are expensed as incurred and were $ 74 million, $ 179 million, and $ 274 million in the years ended December 31, 2023, 2024, and 2025" | то же |
| 12 | SoFi, Form 10-K 2025, Key Business Metrics | SoFi | Участники | 13 651 002 (2025) против 10 127 323 (2024): **+3 523 679** | 2025 | Средняя: кредиты, банк, инвестиции; ценность клиента выше, чем у нас | "Members 13,651,002 10,127,323 7,541,860 3,523,679 35 %" | https://www.sec.gov/Archives/edgar/data/1818874/000181887426000013/sofi-20251231.htm |
| 13 | SoFi, 10-K 2025, MD&A и учётная политика | SoFi | Sales & marketing / реклама | S&M **$1 095,4 млн**; реклама **$426,2 млн** | 2025 | Средняя | "Sales and marketing 1,095,412 796,293 719,400"; "advertising totaled $ 426,233 , $ 321,951 and $ 284,176" ($ тыс.) | то же |
| 14 | Chime, Form 10-K 2025, Key Metrics | Chime | Active Members | 9,5 млн (2025); 8,0 млн (2024) | 2025 | Средняя: бесплатный банк | "Active Members (1) 9.5 8.0 6.6" | https://www.sec.gov/Archives/edgar/data/1795586/000179558626000013/chym-20251231.htm |
| 15 | Chime, 10-K 2025, учётная политика | Chime | Реклама | **$509,8 млн** (2025); $456,6 млн (2024) | 2025 | Средняя | "Advertising costs are expensed as incurred and were $ 509.8 million, $ 456.6 million, and $ 394.7 million" | то же |
| 16 | Chime, проспект 424B4 (июнь 2025), Prospectus Summary | Chime | Главный канал привлечения | Рефералы — канал №1 с 2022 года | 2025 | Высокая как довод за реферальный канал | "since 2022, member referrals have been the single largest channel of new Active Member growth at Chime." | https://www.sec.gov/Archives/edgar/data/1795586/000162828025030855/chimefinancialinc-finalpro.htm |
| 17 | Chime, 424B4, определения | Chime | Что входит в acquisition cost | реклама, бренд, реферальные бонусы, стимулы | 2025 | Высокая для методики: реферальные бонусы — часть CAC | "\"acquisition cost\" refers to the total amount of the following expenses: advertising, brand marketing, referral bonuses" | то же |
| 18 | MoneyLion, Form 10-K 2024, Key Metrics и отчёт о прибылях | MoneyLion | Total Customers / маркетинг | 20,4 млн против 14,0 млн; маркетинг $49,0 млн | 2024 | Низкая: «клиент» включает пользователей маркетплейса (клик по кредитному офферу) | "Total Customers were 20.4 million and 14.0 million as of December 31, 2024 and 2023, respectively." / "Marketing 49,017 28,125" | https://www.sec.gov/Archives/edgar/data/1807846/000095017025026108/ml-20241231.htm |
| 19 | NerdWallet, Form 10-K 2025, Sales and marketing | NerdWallet | Performance marketing | $416,9 млн из $584,7 млн S&M | 2025 | Низкая для CAC: NerdWallet сам продаёт лидов финкомпаниям. Показывает, что посредники готовы платить за финансовый трафик | "Performance marketing $ 416.9 $ 297.4 $ 206.5" | https://www.sec.gov/Archives/edgar/data/1625278/000162527826000014/nrds-20251231.htm |
| 20 | LocaliQ, «Search Advertising Benchmarks», данные 2026 (обновлено 01.06.2026) | Google Ads + Microsoft Ads, Finance & Insurance | CTR / CPC / конверсия / CPL | 9,83% / **$3,39** / **2,64%** / **$74,44** | 2026 | Средняя: «лид» в отрасли (страховка, кредит) — не наша бесплатная проверка; ключи W-4 могут стоить иначе | Значения из строки Finance & Insurance; определение: "The conversion rate for search advertising is determined by the number of leads you get divided by clicks." | https://localiq.com/blog/search-advertising-benchmarks/ |
| 21 | LocaliQ / WordStream, «Facebook Advertising Benchmarks», данные 2026 (обновлено 23.09.2026) | Meta, Finance & Insurance, кампании на трафик | CTR / CPC | 1,46% / **$0,86** | 2026 | Средняя-высокая: свежее, чем WordStream 2025 ($1,22, CTR 0,85–0,98%) в unit-economics | Значения из строки Finance & Insurance таблицы traffic campaigns | https://localiq.com/blog/facebook-advertising-benchmarks/ |
| 22 | Там же | Meta, все отрасли, лид-кампании | Конверсия / CPL | **8,54%** / $27,39 | 2026 | Средняя: Finance & Insurance в таблице лид-кампаний нет | "8.54%," (рост с 7,72%); "The average click-through rate in Facebook ads for lead campaigns across all industries is 2.70%" | то же |
| 23 | Adjust, «The finance app insights report: 2025 edition», с. 26 | Финансовые приложения, Северная Америка | CPI (цена установки) | **$2,92** (1-е полугодие 2025); $7,03 (2024) | 2025 | Низкая-средняя: приложение и установка, а не веб и регистрация | "CPI in North America decreased the most in H1 2025, from $7.03 in 2024 to $2.92." | https://a.storyblok.com/f/47007/x/43a6386c4b/finance-app-insights-report-2025.pdf |
| 24 | Liftoff, «2022 Mobile Finance Apps Report», с. 6 | Финансовые приложения, весь мир | Цена регистрации / активации | **$10,87** / $18,08 | 2022 | Средняя: регистрация ≈ наша «бесплатная проверка», но данные старые и глобальные | "Registration costs rose by nearly $3 to $10.87 since last year ($7.95), while CPA-Activation nearly doubled from $9.78 to $18.08." | https://content.liftoff.io/hubfs/2022/Reports/2022%20Mobile%20Finance%20Apps%20Report/2022%20Finance%20Apps%20Report%20-%20EN.pdf |
| 25 | Kyle Poyar (Growth Unhinged) для ChartMogul, «The SaaS Conversion Report», 04.02.2026 | Конверсия free → paid, опрос | B2C или гибрид | good **5–7%**, great **8–12%**; медиана по всем 8% | 2026 | Высокая для c, но выборка — софт (200 продуктов), не налоги | "B2C or hybrid at 5-7% and 8-12%"; "The median free-to-paid conversion rate across all products is 8%." | https://chartmogul.com/reports/saas-conversion-report/ |
| 26 | Там же, методика | — | Выборка и окно | 200 продуктов, январь 2026, окно 6 месяцев | 2026 | — | "The study was conducted in January 2026 and included 200 software products." | то же |
| 27 | Lenny Rachitsky и Kyle Poyar, «What is good free-to-paid conversion», 01.08.2023 (бенчмарки открыты, остальное платно) | Free → paid, 1000+ продуктов | Freemium self-serve / free trial | Freemium: good 3–5%, great 6–8%. Trial: good 8–12%, great 15–25% | 2023 | Средняя-высокая; в основном B2B SaaS | "On average, 3%-5% is a GOOD conversion rate for a freemium self-serve product, and 6%-8% is GREAT." | https://www.lennysnewsletter.com/p/what-is-a-good-free-to-paid-conversion |
| 28 | RevenueCat, «Subscription app trends & benchmarks 2026» | Мобильные подписки, 115 000+ приложений | Download → paid за 35 дней (медиана) | Hard paywall **10,7%**, freemium **2,1%** | 2026 (данные за 2025) | Средняя: мобильные приложения; знаменатель — установка, а не загруженный листок | Медианы на D35: 10,7% hard paywall и 2,1% freemium; страница сама путает «trial-to-paid» и «download-to-paid» в подписях | https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026 |
| 29 | RevenueCat, «State of Subscription Apps 2026 — Business» и «— Utilities» | Business; Utilities (сюда входит Finance) | D35 download → paid; download → trial | Business: D35 **2,6%**, download → trial 9,1%. Utilities: download → trial 6,5%. Медиана D35 по всем: 2,0% | 2026 | Средняя. Отдельной категории Finance нет | "Business median: 2.6% (top quartile above 5.0%)"; "Utilities: includes Weather, Reference, Utilities, Finance, Tools"; "Globally, median lands at 2.0%." | https://www.revenuecat.com/state-of-subscription-apps-2026-business ; https://www.revenuecat.com/state-of-subscription-apps-2026-utilities/ |
| 30 | TurboTax, страница Referral и условия программы (обновлено 27.10.2025) | TurboTax | Плата за реферала | **$25** подарочная карта рефереру (до $500), другу **20%** скидки; только новые клиенты | 2025–2026 | Высокая: прямой аналог для налогового продукта | "you get a $25 gift card"; "Friends will receive 20% off"; "capped at $500" | https://turbotax.intuit.com/referral ; https://turbotax.intuit.com/referral/terms/ |
| 31 | Chime, «Invite Friends Terms and Conditions (January 2026)» | Chime | Бонус приглашённому | **$100** при зарплатном депозите от $200 за 45 дней | 2026 | Средняя: банк, ценность клиента выше | "the $100.00 referral reward"; "$200.00 or more by Automated Clearing House" | https://www.chime.com/invite-friends-terms-and-conditions-referred-100-jan-2026/ |
| 32 | Chime, блог «Chime referral program», 11.08.2026 | Chime | Лимит рефералов | 10 в год; сумма «зависит от промо» | 2026 | Средняя | "You can refer up to 10 people per calendar year." | https://www.chime.com/blog/chime-referral-program/ |
| 33 | Robinhood, справка «Invite friends, pick stock» (с 01.09.2026) | Robinhood | Награда за реферала | **$50** за первого, $150 за 3, $800 за 10; до $15 000 в год | 2026 | Средняя | "fund it with a successful deposit greater than $0"; "can earn up to $15,000 in bonus stock rewards per year" | https://robinhood.com/us/en/support/articles/invite-friends-get-free-stock |
| 34 | Dave, условия «Get $15. Gift $15.» (обновлено 09.08.2023) | Dave | Награда за реферала | **$15** рефереру + $15 другу (до $75), если друг взял аванс от $25 | 2023 (устарело) | Средняя: наш покупатель, но условия 2023 года | "referral bonus $15.00 for the maximum combined total of $75.00 for this promotion" | https://dave.com/invite/get-15-gift-15/terms |

---

## 2. Производные «CAC» (маркетинг ÷ клиенты)

Все входы — из таблицы 1. **Это не CAC новых клиентов.** В числитель попадают бренд, удержание, персонал и стимулы, а знаменатель там, где раскрыт только чистый прирост, занижен на отток. Поэтому такие числа — верхняя граница для платных каналов зрелой компании, а не наша цель.

| Компания | Формула | Входы (№ строки табл. 1) | Результат | Что это на самом деле |
|---|---|---|---|---|
| H&R Block FY2026 | Marketing & advertising ÷ платные декларации | $277,8 млн (6) ÷ 14,9 млн (5) | **$18,64** на платную декларацию | Смешанное число: большинство клиентов возвращаются каждый год, поэтому CAC нового клиента заметно выше. FY2025 с декларациями FY2026 дал бы $19,18, но декларации FY2025 в этой сессии не проверены |
| Robinhood 2025 | Маркетинг ÷ новые фондированные клиенты (брутто) | $399 млн (11) ÷ 2,5 млн (10) | **$159,60** | Ближе всех к настоящему CAC: знаменатель брутто, без приобретённых 0,6 млн. Но маркетинг включает персонал и бренд |
| Robinhood 2025 | Реклама ÷ новые фондированные | $274 млн (11) ÷ 2,5 млн (10) | **$109,60** | Только платные медиа. В 2024: $179 млн ÷ 2,2 млн = $81,36 |
| SoFi 2025 | S&M ÷ чистый прирост участников | $1 095,4 млн (13) ÷ 3,52 млн (12) | **$310,87** | Отток не раскрыт; в S&M входят персонал и партнёрские выплаты; продукт — кредиты |
| SoFi 2025 | Реклама ÷ чистый прирост | $426,2 млн (13) ÷ 3,52 млн (12) | **$120,96** | Только реклама |
| Chime 2025 | Реклама ÷ чистый прирост Active Members | $509,8 млн (15) ÷ (9,5 − 8,0) млн (14) | **$339,87** | Против раскрытого $109 за 2024 год (S-1, см. unit-economics). Разница примерно в 3 раза — это цена оттока в знаменателе: так выглядит ошибка метода |
| Dave Q3 2026 | Advertising & activation ÷ новые участники | $28,0 млн (2) ÷ 1,135 млн (1) | **$24,67** | Сверка с раскрытым CAC $22 (1): метод сходится, если брать брутто-приток |
| MoneyLion 2024 | Маркетинг ÷ чистый прирост Total Customers | $49,0 млн (18) ÷ 6,4 млн (18) | **$7,66** | Почти бессмысленно: «клиент» маркетплейса ≠ платящий |
| Intuit | — | — | **не рассчитано** | Реклама $2,2 млрд (8) на всю компанию; маркетинг сегмента Consumer не раскрыт, число клиентов TurboTax — у другого агента |

**Вывод из таблицы 2.** Там, где компания раскрывает брутто-приток (Dave, Robinhood, Chime в S-1), CAC финансового продукта для массового потребителя лежит в диапазоне **$20–160**. Нижний край — продукт со входом за минуты и сильной органикой (Dave), верхний — брокер с полной загрузкой маркетинга. Все эти компании получают клиента бесплатно и зарабатывают на нём потом. У нас клиент платит $99 сразу, поэтому платящий обойдётся дороже, чем «участник» Dave.

---

## 3. Что это значит для PayTrail

Модель та же, что в `unit-economics-99.md`: **CAC = цена бесплатной проверки ÷ c**, где c — конверсия «бесплатная проверка → оплата». Ниже: какие входы подтверждены, а какие остаются допущением.

### (a) Платные соцсети (Meta)

- **Факт:** CPC в Finance & Insurance на Meta **$0,86** (LocaliQ 2026, № 21). В unit-economics стоит $1,22–1,27 по данным 2025 года.
- **Факт:** конверсия лид-кампаний Meta по всем отраслям **8,54%** (№ 22), было 7,72%.
- **Факт, кросс-проверка:** цена регистрации в финансовом приложении $10,87 (Liftoff 2022, № 24); Dave — **$18–22** за нового участника (№ 1, 3).
- **Допущение:** «клик → бесплатная проверка» = 7,7–8,5%, как у лид-формы. Загрузить листок труднее, так что это скорее оптимистично.
- **Цена бесплатной проверки:** $0,86 / 0,0854 = **$10,07** (лучший случай) … $1,27 / 0,0772 = **$16,45** (как в unit-economics). Совпадает по порядку с Liftoff ($10,87) и ниже Dave ($18–22).
- **CAC = $10–16,5 / c:**

| c | $10,07 | $16,45 |
|---|---|---|
| 5% | $201 | $329 |
| 8% | $126 | $206 |
| 12% | $84 | $137 |

- **Защитимый диапазон: $125–205 при c = 8%** (база), $85–140 только при c = 12%. Для сравнения: раскрытый CAC бесплатных финпродуктов — Chime $109 (S-1), Robinhood $110–160 (табл. 2). CAC ниже $80 в платных соцсетях из данных не следует.

### (b) Платный поиск (Google)

- **Факт:** Finance & Insurance — CPL **$74,44**, конверсия 2,64%, CPC $3,39 (LocaliQ 2026, № 20). Свежее и дешевле, чем «CPC > $7» в unit-economics.
- **Допущение:** «лид» = бесплатная проверка. В бенчмарке лид — это заявка на страховку или кредит, а у нас загрузка листка.
- **CAC = $74,44 / c:** при 8% — **$931**, при 12% — **$620**, при 15% — **$496**.
- **Защитимый диапазон: $500–930.** Канал не окупается при LTV $125–180. Отраслевой CPL — это в основном страховки и кредиты. Если узкие ключи («W-4 married filing jointly», «paycheck checker») окажутся дешевле, это покажут данные другого агента по CPC ключей W-4; пересчёт: CAC = CPC / (клик → проверка) / c.

### (c) Рефералы

- **Факт:** TurboTax платит **$25** подарочной картой рефереру и даёт другу **20%** скидки, только новым клиентам (№ 30). Dave — $15 + $15 (2023, № 34). Robinhood — $50 за первого (№ 33). Chime — $100 приглашённому (№ 31), и рефералы у Chime — канал №1 с 2022 года (№ 16).
- Награду в таких программах платят только после целевого действия. Если у нас это оплата, делить на c не нужно.
- **Расчёт по схеме TurboTax** (допущение — наша программа копирует её): $25 рефереру + 20% от $99 = $19,80 скидки другу = **$44,80** на платящего. Если скидка выручку не снижает, остаётся **$25**. Без скидки, по типу Dave: **$15–20**.
- **Защитимый диапазон: $20–45** на платящего. Сейчас в unit-economics стоит $10–20, и это ниже любой найденной публичной программы, кроме Dave 2023. Доля рефералов в миксе — допущение: Chime показывает, что канал может стать главным, но у бесплатного банка с бонусом $100.

### (d) Партнёры (бухгалтеры, CPA)

- **Публичных данных о выплатах бухгалтерам за привод клиента в потребительский налоговый или зарплатный продукт не найдено** (раздел 5).
- **Косвенно (факт):** H&R Block тратит **$18,64** маркетинга на платную декларацию (табл. 2), но это смешанное число по клиентской базе, а не цена партнёрского канала.
- **Допущение:** выплата бухгалтеру 20–30% от $99 = **$20–30** на платящего. Ориентир по ставкам налоговых партнёрок — у другого агента. Добавлять сюда затраты на работу с партнёрами (поддержку и привлечение самих бухгалтеров) пока не на чем.
- **Защитимый диапазон: $20–30, и это допущение, а не факт.**

### Итог по каналам

| Канал | Диапазон CAC | Опора | Что допущение |
|---|---|---|---|
| Meta | **$125–205** (c = 8%); $85–140 (c = 12%) | CPC $0,86 (LocaliQ 2026), лид-конверсия 7,7–8,5%, Liftoff $10,87, Dave $18–22 | клик → проверка, c |
| Google | **$500–930** | CPL Finance & Insurance $74,44 (LocaliQ 2026) | лид = проверка, c |
| Рефералы | **$20–45** | TurboTax $25 + 20%, Dave $15, Robinhood $50 | наша схема награды, доля канала |
| Партнёры | **$20–30** | нет прямых данных | всё |

---

## 4. Конверсия «бесплатно → платно»: лучшие опоры

1. **ChartMogul / Kyle Poyar, 2026 (№ 25–26):** для B2C и гибридных продуктов good — **5–7%**, great — **8–12%**; медиана по всем продуктам 8%. Самый свежий источник с методикой (200 продуктов, январь 2026, окно 6 месяцев) и единственный с отдельной строкой B2C. Оговорка: это софт, в основном SaaS; в абсолютных цифрах выборка B2C мала и не раскрыта.
2. **Lenny / OpenView, 2023 (№ 27):** freemium self-serve good — 3–5%, great — 6–8%; free trial good — 8–12%, great — 15–25%. Оговорка: в основном B2B, 2023 год.
3. **RevenueCat 2026 (№ 28–29):** мобильные подписки; freemium за 35 дней — **2,1%**, hard paywall — **10,7%**, Business — 2,6%. Знаменатель — установка, а не загруженный листок, поэтому это нижняя граница: у нас человек уже потратил усилие и увидел результат.
4. **Dave (№ 4):** рост цены с $1 до $3 в месяц «существенно не изменил» конверсию. Слабый довод, что при переходе с $79 на $99 конверсия не обязательно рухнет; масштаб цен другой.

**Рекомендация для модели.** **c = 5–8% как база** (good и порог great для B2C по ChartMogul), **12% как оптимистичный** (верх great). **15%** выше great для freemium и B2C и сопоставимо только с good/great для free trial, а наш продукт — не trial. Поэтому 15% без собственного теста защищать нельзя. Наша «бесплатная проверка» ближе к trial (человек видит ценность на своих данных), что частично оправдывает 8–12%, но это допущение.

---

## 5. Не подтверждено

| Что | Почему |
|---|---|
| Chime $109 / $91 за нового активного клиента | Уже есть в `unit-economics-99.md`. В этой сессии в тексте 424B4 числа не нашлись: WebFetch прочитал файл частями, нужный раздел не попал. Подтверждены только определение acquisition cost и «рефералы — канал №1» |
| Dave CAC Q4 2025 ($20), Q1 2026 ($18), Q2 2026 ($19) | Видел только в сниппетах поиска; страница Q2 2026 (barchart) открылась пустой. Подтверждены Q3 2026 ($22) и «≈ $19» за 2025 год из 10-K |
| H&R Block, реферальная программа в США («до $20 за клиента») | hrblock.com/offers/saf вернул 403; число только у третьих сайтов |
| SoFi, реферальные бонусы ($75 / $25 по счёту, $50 / $25 по инвестициям, $300 по кредитам) | sofi.com/page/2299 вернул 403; суммы только у третьих сайтов |
| Credit Karma, Acorns: CAC | Не раскрыты (Credit Karma внутри Intuit без отдельного маркетинга, Acorns частная) |
| NerdWallet: число пользователей за 2025 | В 10-K за 2025 метрики MUU в тексте не нашлось, поэтому «маркетинг ÷ пользователи» не считал |
| Intuit Consumer / TurboTax: маркетинг на клиента | Маркетинг сегмента не раскрыт; Credit Karma перенесена в корпоративные расходы |
| Цена регистрации финансового приложения за 2024–2026 (Liftoff, AppsFlyer) | Свежих открытых отчётов Liftoff по финансам не нашёл; Adjust 2025 даёт только CPI |
| First Page Sage, «B2C fintech CAC $202» | На первоисточнике открылась только B2B-версия (Fintech SaaS $1 450); B2C-цифра — только в пересказах |
| Fintel Connect, «2025 CPA Benchmarking Guide» | За формой регистрации, чисел в открытом виде нет |
| RevenueCat: конверсия по категории Finance | Отдельной категории нет (Finance внутри Utilities); разбивка — в платном PDF |
| WordStream / LocaliQ Meta: CPL и конверсия лид-кампаний в Finance & Insurance | В таблице лид-кампаний 2026 года строки Finance & Insurance нет |
| Выплаты бухгалтерам / CPA за привод клиента в потребительский налоговый продукт | Публичных программ с суммами не нашёл |
| Statista по CAC финтеха | За пейволом, не проверено |
