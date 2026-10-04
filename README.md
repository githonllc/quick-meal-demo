# Quick Meal Demo

Quick Meal is a demo of a fast meal ordering app for university students. It runs as a React app with a Cloudflare Worker.

Concept demo for a CMU course. Not affiliated with DoorDash.

Live demo: https://quick-meal-demo.ioenv.workers.dev

Add it to your Home Screen to open it full screen like an app. iPhone: open it in Safari, tap Share, then Add to Home Screen. Android: open it in Chrome, tap the menu, then Add to Home screen (or Install app).

## Demo settings

For the research team, not for students. The gear at the top right of Quick Meal opens `/demo-settings`. There you can:

- pick the card layout: Dish first (the default) or Restaurant first. A link with `?layout=meals` or `?layout=places` sets it too.
- set the time range (default 15 to 45 min, 1 min steps) and the distance range (default 0.5 to 5 mi, 0.5 mi steps). Changing a range clears the saved filters, and old links with other values may not work.
- turn Save filters on or off (on by default).
- turn on the Study timer: it records the time from opening Quick Meal to the first Add to cart, per try, and copies the results as CSV.
- add a network delay or make every request fail.
- reset the demo state, or restore the default settings.

The settings live in the browser's local storage. See D6 in the design page.

## Scripts

- `npm run dev`: start the dev server
- `npm test`: run unit tests
- `npm run e2e`: run Playwright end-to-end tests
- `npm run lint`: run the linter
- `npm run typecheck`: run the TypeScript check
- `npm run build`: build the app
- `npm run deploy`: build and deploy to Cloudflare

## Design

The full design page has the screens, product decisions and acceptance criteria.

- [Live design page](https://quick-meal-demo.ioenv.workers.dev/design): open it in a browser.
- [docs/design.png](docs/design.png): the whole page as one image. GitHub shows it directly.
- [docs/design.html](docs/design.html): the source. GitHub shows it as code.

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
