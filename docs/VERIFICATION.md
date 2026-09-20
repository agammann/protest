# Release verification

Verified on 2026-09-19. This file distinguishes local checks from checks that need an authenticated GitHub account.

## Local checks on Windows

TypeScript check and production Vite build pass. Fourteen automated tests pass, covering input validation, unfinished source links, daylight saving transitions, real PDF and PNG generation, HTML escaping, exclusion of private notes from public materials, calendar escaping and UTF8 folding, concurrent local saves, loopback API request protection, publication review expiry and content changes, repository ownership checks, occupied port recovery, cancelled and postponed calendar status, and real MCP stdio communication.

GitHub Actions run [35477726407](https://github.com/agammann/protest/actions/runs/35477726407) passed on Windows, macOS, and Linux for source commit `b156afd`. The GitHub publisher tests use a simulated GitHub API. They are not proof of a live deployment.

A fresh extraction of the Windows portable archive successfully starts its own local server, serves the editor, generates a PDF, and generates all nine public artifacts using the bundled Node.js and production dependencies. No developer node_modules directory is required.

## Browser verification

Checked with the Codex in app browser at 1536 by 1024 and 390 by 844. The editor saves changed details across reloads, switches poster themes and paper sizes, downloads a PDF, opens the guide, and dismisses it with Escape. Keyboard focus is bounded inside the guide. The editor and generated event page fit the phone viewport without horizontal scrolling.

The generated public page registered both WebMCP tools in the in app browser. Calling `get_participant_instructions` returned the expected public meeting point, access information, supplies, and status. This verifies this browser only; it does not imply universal browser support. The current draft is documented at [WebMCP](https://webmachinelearning.github.io/webmcp/).

## Design comparison

Reference: [selected concept](design-concept.png). Implementation: [editor screenshot](protest-editor.png). Both were inspected directly with the image viewer after browser capture.

| Point | Reference and implementation | Resolution |
| --- | --- | --- |
| Copy | Masthead, hero, four steps, editor labels, preview tabs | Primary wording and order retained |
| Layout | Large heading, four column step strip, 44/56 editor and preview | Implemented; phone layout stacks the panels |
| Typography | Condensed display and UI text | Bundled Anton and Barlow Condensed; desktop headline width and step height tuned against the reference |
| Palette | Warm paper, ink, lime, orange | Shared exact tokens across the editor and generated materials |
| Poster | Tilted poster in a dark preview | Live SVG retains the treatment; text wraps dynamically for real content |
| Practical details | Concept omits some publishing and draft state | Added local save state, explicit fictional banner, year, time zone, address, and publication review |

The above the fold copy matches the design vocabulary. Intentional functional differences are the fictional warning on the flier, a full date and address, the concrete request on the flier, live text fitting, local save controls, and the footer. Printed output is crisp vector artwork instead of simulated paper grain. These differences make exported materials usable and keep the example unambiguous.

The printable Letter PDF was rendered with Poppler and visually inspected. A barcode decoder recovered the expected URL from the PDF render, square PNG, and story PNG. This is a digital decode check, not a physical phone camera or printer test.

## Live publication

The Windows app signed into GitHub CLI through GitHub's browser flow and created `agammann/protest-example`, uploaded its reviewed files, and enabled Pages. The app verified the public revision for the first publication, commit `a27953e04975975321e92274d4a8793a66c15481`.

A second publication updated the same site with a cancellation notice, commit `61a4bc7fe48e9d860b773fe34742999605629a90`. The live HTML and WebMCP tool both showed the cancelled state. All ten repository files, including GitHub's initial README, were inspected for a private test sentinel; none contained it. The public artifacts exclude private planning notes.

[Live fictional demonstration](https://agammann.github.io/protest-example/). No actual event is advertised. Public site links, calendar, PDF, and image assets were checked independently of the editor. The current source check results are available in [GitHub Actions](https://github.com/agammann/protest/actions/workflows/check.yml).

Fixes made during real workflow verification: automatic recovery from an occupied local port; bundled font loading in PNG exports; reserved space around the QR code; full address and year on the flier; unfinished source link validation; restored login state after refresh; publication timeouts; Pages configuration checks before writing; generator and font fingerprinting in the published revision; and explicit calendar update limitations.

## Verification boundaries

The Windows portable archive is the locally tested desktop package. Source checks passed on macOS and Linux CI; native desktop use on those systems has not been tested. Physical printing and scanning with a phone camera have not been performed. This is an engineering end to end check using a clearly fictional event, not usability research with recruited organizers or attendees. GitHub account eligibility and hosting limits still apply.
