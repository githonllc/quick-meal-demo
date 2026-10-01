# How we built this with AI

This page is for students who want to build a prototype or MVP with an AI coding assistant. It uses this repo's real history. Every claim links to something you can open.

## What we built

Quick Meal is a concept feature for a food delivery app. A student sets a budget, a time and a distance, and sees one meal per place whose estimated all-in price fits.

Live demo: https://quick-meal-demo.ioenv.workers.dev

## Step 1: Design with AI

We did not start with code. We started with a design page and argued about it.

The AI wrote a first proposal: phone mockups, product decisions and acceptance criteria. The team read it, pushed back, and the AI revised it. This went on for many rounds, up to version 26, before any code was written. You can read the result in [docs/design.html](design.html) (or the picture, [docs/design.png](design.png)).

Some human corrections that changed the design:

- **Results became meals, not restaurants.** The first draft listed restaurants. We said a hungry student picks a dish, so each card now shows one meal and its price (design P5).
- **The budget became an estimated all-in price.** A $10.75 dish is not a $10.75 meal. Fees, tax and tip are included, and a tap shows the breakdown (design P2 and screen 6).
- **Filters moved above the cuisine tabs.** Filters set the pool and the tab splits it, so the order on screen says what applies to what (design P2).
- **The target users changed.** An early draft was set in one city. We said our users are Bay Area students, so the demo location became San José State University.

The AI was fast at drafting. People decided. The product decisions (P1 to P8) are the team's. The AI proposed options and wrote them down.

## Step 2: Turn the design into refined issues

Next, the AI split the design into one epic, [#1](https://github.com/githonllc/quick-meal-demo/issues/1), and 13 sub-issues, #2 to #14. The epic holds the shared contract (types, constants, pricing formula, API) so every issue builds on the same definitions.

Each sub-issue has an **Implementation Refinement** section. It is written so a model can build the issue without guessing:

- **Location**: the files to create or change.
- **Key invariants**: the rules that must stay true, with the reason.
- **Exact changes**: numbered steps, including rejected options and why they were rejected.
- **Implementation constraints**: branch name, no new dependencies, what belongs to other issues.
- **Acceptance criteria (command level)**: commands and test cases, not prose.
- **Non-goals**: tempting extras, and which issue owns them.
- **Execution Tier**: `sonnet` for well-pinned work, `opus` where judgment is needed.

See [#4](https://github.com/githonllc/quick-meal-demo/issues/4) (the search engine) for a full example.

## Step 3: Build issue by issue

One issue, one branch, one pull request. The main AI session acted as an orchestrator. It handed each issue to a separate AI agent, then checked the work itself before merging.

- **Tests first for logic.** For #3 to #6 the first commit holds only failing tests, and the second makes them pass. For example, commit `2c7bea5` adds the pricing tests and `2f34a38` adds the code ([PR #16](https://github.com/githonllc/quick-meal-demo/pull/16)).
- **A Playwright test for every acceptance criterion.** AC-01 to AC-07 each map to an e2e test (see [docs/validation.md](validation.md)).
- **The orchestrator re-ran everything.** Before each merge it ran lint, typecheck, unit tests, build and e2e on its own, and looked at screenshots. An agent's "all green" was never taken on trust.
- **Rebase merges only.** The history reads as one line, one commit per step.

Good PRs to read: [#17](https://github.com/githonllc/quick-meal-demo/pull/17) (search engine), [#18](https://github.com/githonllc/quick-meal-demo/pull/18) (mock data tuned to the demo script), [#23](https://github.com/githonllc/quick-meal-demo/pull/23) (filter sheets and saved default).

PRs #15 to #27 were all merged on 2026-09-30. `git log` shows the times.

## Step 4: Validate

[#13](https://github.com/githonllc/quick-meal-demo/issues/13) deployed the app as one Cloudflare Worker and ran the full e2e suite against the live URL. [docs/validation.md](validation.md) lists each acceptance criterion, its result and the test that checks it, with five screenshots.

## What went wrong and what we changed

The AI made mistakes. So did the design. Most were caught by a check, not by luck.

- **Design numbers the data could not meet.** While writing the issues, a quick script checked the design's scenario counts against the restaurants it named, and some did not fit. We fixed the targets before any code.
- **Float rounding.** Computed in dollars, 15% of $11.50 is `1.7249999…`, and `toFixed(2)` shows $1.72, not $1.73. That would have shown "$0.52 over" instead of the design's "$0.54 over". All money is integer cents with half-up rounding ([#3](https://github.com/githonllc/quick-meal-demo/issues/3)).
- **A tie that would break the demo.** In the no-match scenario, a $17.00 dumpling total would score exactly like a nearby noodle bar, and the tie-break would put the wrong place first. The data test pins the total to $16.01 to $16.99 ([PR #18](https://github.com/githonllc/quick-meal-demo/pull/18)).
- **The mockup broke its own rule.** Once real data ran, the meal list put a dish at 91% likes above one at 88%. Version 26 of the design showed the opposite order, which broke its "best match" rule. The code was right, so we fixed the design ([PR #20](https://github.com/githonllc/quick-meal-demo/pull/20)).
- **A hidden folder.** A global git ignore rule for `data/` hid `worker/data/`, so the mock data would not have been committed. The repo's `.gitignore` now keeps it ([PR #18](https://github.com/githonllc/quick-meal-demo/pull/18)).
- **Two agents, one port.** Two agents ran e2e tests at the same time on the same port, and one run failed. The code was fine. Run parallel test servers on different ports.
- **Right after deploy.** The first e2e run against production started seconds after the first deploy and had 6 failures. Two runs a minute later passed 24 of 24. Wait a minute after a first deploy before you test it.
- **Small review catches.** On the menu page, the reused budget sheet said "Show N results", which counted places, not dishes. It now says "Apply" ([PR #25](https://github.com/githonllc/quick-meal-demo/pull/25)). The first "bowl" photo was a fruit acai bowl, shown next to a chicken rice bowl. It was swapped ([PR #26](https://github.com/githonllc/quick-meal-demo/pull/26)).

## Tips for your own MVP

1. **Design before code.** A design page with decisions and acceptance criteria is cheap to change. Code is not.
2. **Write acceptance criteria as numbers.** "Shows 6 results" can be tested. "Works well" cannot.
3. **Make the mock data serve the demo.** Hand-tune it to your demo script, and lock the counts with tests so an edit cannot break the live demo.
4. **Give the AI small, exact tasks.** One issue with files, rules and test cases beats one big request.
5. **Check, do not trust.** Re-run the tests yourself and look at the screen. An AI report of success is a claim, not proof.
6. **Keep a human on every decision.** Let the AI propose and draft. People choose what the product does.
7. **Write down what went wrong.** It is the most useful part for the next team.
