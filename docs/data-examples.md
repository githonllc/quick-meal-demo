# Data examples

Real values computed from `worker/data/restaurants.ts`.
Regenerate with `npx tsx scripts/data-examples.ts > docs/data-examples.md`.

## No-match scenario: budget $15, time 15 min

Exact results: 0. Near cards, in order:

| # | Restaurant | Item | Total | Miss | Score |
|---|---|---|---|---|---|
| 1 | Santa Clara Taco Co. | Chicken Tacos (2) | $12.86 | 1 min slower | 0.100 |
| 2 | Taylor St. Dumplings | Pork Dumplings (12) | $16.32 | $1.32 over budget | 0.264 |
| 3 | 4th St. Noodle Bar | Wonton Soup | $14.37 | 4 min slower | 0.400 |
| 4 | Paseo Rice Bowl | Spam Musubi Plate | $15.65 | $0.65 over budget, 3 min slower | 0.430 |
| 5 | Diridon Sushi Bar | California Roll Combo | $21.45 | $6.45 over budget | 1.290 |

Relax chips: "Budget up to $17 · 1 result", "Time up to 20 min · 2 results"

## Pinned item totals

| Restaurant | Item | Total |
|---|---|---|
| 4th St. Noodle Bar | Dan Dan Noodles | $17.94 |
| 4th St. Noodle Bar | Wonton Soup | $14.37 |
| Santa Clara Taco Co. | Chicken Tacos (2) | $12.86 |
| Taylor St. Dumplings | Pork Dumplings (12) | $16.32 |

