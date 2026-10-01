# Data examples

Real values computed from `worker/data/restaurants.ts`.
Regenerate with `npx tsx scripts/data-examples.ts > docs/data-examples.md`.

## No-match scenario: budget $15, time 15 min, distance 0.5 mi

Exact results: 0. Near cards, in order:

| # | Restaurant | Item | Total | Miss | Score |
|---|---|---|---|---|---|
| 1 | Taylor St. Dumplings | Pork Dumplings (12) | $16.32 | $1.32 over budget | 0.264 |
| 2 | 4th St. Noodle Bar | Wonton Soup | $14.37 | 4 min slower | 0.400 |
| 3 | Paseo Rice Bowl | Spam Musubi Plate | $15.65 | $0.65 over budget, 3 min slower | 0.430 |
| 4 | Santa Clara Taco Co. | Chicken Tacos (2) | $12.86 | 1 min slower, 0.4 mi farther | 0.500 |
| 5 | St. James Dim Sum | Siu Mai (8) | $20.83 | $5.83 over budget, 6 min slower, 0.2 mi farther | 1.966 |

Relax chips: "Budget up to $17 · 1 result", "Time up to 20 min · 1 result"

## Pinned item totals

| Restaurant | Item | Total |
|---|---|---|
| 4th St. Noodle Bar | Dan Dan Noodles | $17.94 |
| 4th St. Noodle Bar | Wonton Soup | $14.37 |
| Santa Clara Taco Co. | Chicken Tacos (2) | $12.86 |
| Taylor St. Dumplings | Pork Dumplings (12) | $16.32 |

