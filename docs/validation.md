# Validation

- Date: 2026-09-30
- Live URL: https://quick-meal-demo.ioenv.workers.dev
- Deployed commit: `96522f6`
- Worker version: `d786eb98-ef5b-4ca8-bd01-a83f14c77c60`

Every acceptance criterion from the "Validation" section of [design.html](design.html) was run as an automated Playwright test against the live URL.

## Results

| ID | Feature | Result | Note |
|---|---|---|---|
| AC-01 | **Quick Meal entry.** Given the Home screen, when the user taps Quick Meal in the category row, then the Quick Meal screen opens with the chip row (Filters, Budget, Time, Distance), the cuisine tabs below it (All selected) and a list of meal cards, with no Restaurant or Grocery tabs. | Pass | `e2e/list.spec.ts`: "AC-01: Home opens Quick Meal with chips, tabs and meal cards" |
| AC-02 | **All-in budget.** Given a budget of $20, when results load, then every card shows a meal with an estimated all-in price of $20.00 or less, and the breakdown behind any price (item, delivery fee, small-order fee, service fee, tax, tip) adds up to that price to the cent, and the small-order fee appears only when the item costs less than $12. | Pass | `e2e/list.spec.ts`: "AC-02: every price fits the budget and each breakdown adds up" |
| AC-03 | **Filters sheet.** Given the Filters sheet, opened from either the top-right icon or the Filters chip, when the user sets the budget to $20 and time to 30 min, then the button reads "Show 6 results" before applying, and after applying the list shows 6 meal cards from 6 different places, the chips read "Up to $20" and "30 min", and the Filters badge shows 2. | Pass | `e2e/filters.spec.ts`: "AC-03: the Filters sheet opens from the chip and the top-right icon" |
| AC-04 | **Combined filters.** Given budget $20, time 20 min and distance 1 mi are on, when the user taps the Chinese tab, then every card is a Chinese place that passes all three filters, and the count (2) is lower than on the All tab (4). | Pass | `e2e/list.spec.ts`: "AC-04: a cuisine tab splits the filtered meals and keeps the chips" |
| AC-05 | **No match and relax.** Given budget $15, time 15 min and distance 0.5 mi, when results load, then the screen shows "No exact matches", up to 5 closest meals each labeled with how it misses (for example "$1.32 over budget"), and relax chips with result counts. When the user taps "Budget up to $17 · 1 result", the list shows exactly 1 meal and the slider moves to $17, while the saved default budget stays at $15. | Pass | `e2e/no-match.spec.ts`: "AC-05: no exact match shows the message, relax chips and near cards", "a relax chip loosens the view" and "a relax chip does not change the saved default" |
| AC-06 | **Menu in budget view.** Given a budget of $20, when the user taps "+2 more" on the Paseo Rice Bowl card, then the menu opens with "Under your budget (3)" listing the Chicken Rice Bowl first (the card's meal), then the Tofu Rice Bowl and Spam Musubi Plate, and the Veggie Bowl shows "$0.54 over". | Pass | `e2e/menu.spec.ts`: "AC-06: the menu shows what fits first, then what is just over" |
| AC-07 | **Saved default.** Given the user applied budget $20 and time 30 min and is on the Chinese tab, when they leave Quick Meal and come back, including after closing the browser tab, then budget $20 and time 30 min are on, the All tab is selected, and the 6 meal cards for $20 · 30 min show. | Pass | `e2e/filters.spec.ts`: "AC-07: applied filters come back next visit, the cuisine tab does not" |

We ran the full suite three times. The first run started seconds after the first deploy and had 6 failures (the first API call got a 404), most likely because the new Worker had not yet reached every edge location. Runs 2 and 3, a minute later, both passed 24 of 24.

## How to re-run

Run all e2e tests against the live demo:

```sh
BASE_URL=https://quick-meal-demo.ioenv.workers.dev npm run e2e
```

Save the screenshots below again (they are skipped in a normal run):

```sh
SCREENSHOTS=1 BASE_URL=https://quick-meal-demo.ioenv.workers.dev npx playwright test e2e/screenshots.spec.ts
```

## Screenshots

All shots are 390x844 at 3x, taken from the live URL.

**1. Home.** Must-have feature: Quick Meal entry.

![Home with Quick Meal first in the category row](screenshots/1-home.png)

**2. Quick Meal list at $20 and 30 min.** Must-have features: meal list with all-in prices, cuisine tabs and chip row. Also saved default (these are the filters that come back next visit).

![Quick Meal list with 6 meals that fit](screenshots/2-list.png)

**3. Filters sheet.** Must-have feature: Filters sheet. Also saved default (applying saves the filters).

![Filters sheet open with Show 6 results](screenshots/3-filters.png)

**4. No match at $15, 15 min and 0.5 mi.** Must-have feature: no-match results with relax chips.

![No exact matches with relax chips and the closest meals](screenshots/4-no-match.png)

**5. Paseo Rice Bowl menu at $20 with the Tofu Rice Bowl breakdown.** Must-have features: menu in budget view and price breakdown.

![Paseo Rice Bowl menu with the price breakdown open](screenshots/5-menu-breakdown.png)

## Manual walkthrough

The team also walks through the demo once on a real phone and notes anything found here.

Manual walkthrough notes:

-
