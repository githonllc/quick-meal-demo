# Quick Meal Demo

Quick Meal is a demo of a fast meal ordering app for university students. It runs as a React app with a Cloudflare Worker.

Concept demo for a CMU course. Not affiliated with DoorDash.

Live demo: https://quick-meal-demo.ioenv.workers.dev

## Scripts

- `npm run dev`: start the dev server
- `npm test`: run unit tests
- `npm run e2e`: run Playwright end-to-end tests
- `npm run lint`: run the linter
- `npm run typecheck`: run the TypeScript check
- `npm run build`: build the app
- `npm run deploy`: build and deploy to Cloudflare

## Design

See the [live design page](https://quick-meal-demo.ioenv.workers.dev/design.html) or [docs/design.html](docs/design.html).

<table>
  <tr>
    <td align="center"><img src="docs/design/1-home.png" width="240" alt="Home"><br>1 Home</td>
    <td align="center"><img src="docs/design/2-meal-list.png" width="240" alt="Meal list"><br>2 Meal list</td>
    <td align="center"><img src="docs/design/3-filters.png" width="240" alt="Filters sheet"><br>3 Filters sheet</td>
  </tr>
  <tr>
    <td align="center"><img src="docs/design/4-no-match.png" width="240" alt="No match"><br>4 No match</td>
    <td align="center"><img src="docs/design/5-menu.png" width="240" alt="Menu in budget view"><br>5 Menu in budget view</td>
    <td align="center"><img src="docs/design/6-breakdown.png" width="240" alt="Price breakdown"><br>6 Price breakdown</td>
  </tr>
</table>

## How we built this

How we built this with AI: [docs/how-we-built-this.md](docs/how-we-built-this.md)

## Validation

See [docs/validation.md](docs/validation.md) for the acceptance test results on the live demo and the screenshots.
