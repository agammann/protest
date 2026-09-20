# Release verification

This file distinguishes local checks from checks that need an authenticated GitHub account.

## Local checks on Windows

TypeScript check and production Vite build pass. Twelve automated tests pass, covering input validation, unfinished source links, daylight saving transitions, real PDF and PNG generation, HTML escaping, exclusion of private notes from public materials, calendar escaping and UTF8 folding, concurrent local saves, loopback API request protection, publication review expiry and content changes, repository ownership checks, and real MCP stdio communication.

The GitHub publisher tests use a simulated GitHub API. They are not proof of a live deployment.

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

## Remaining verification boundaries

Live GitHub Pages creation, updates, cancellation, revision verification, and public source release require the connected account's sign in. Check release notes for the final outcome. The Windows portable archive is the locally tested package. macOS and Linux results depend on the repository CI run. Physical printing and scanning a printed QR code have not been performed.
