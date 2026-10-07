# Release verification

This file distinguishes local checks from checks that need an authenticated GitHub account.

## V1 candidate verification

The isolated version 1.0.0 candidate was checked on Windows with Node 24.19.0 and pnpm 11.19.0. The frozen-lockfile install, TypeScript check, production build and all 16 existing tests passed. Available dependency patches were applied; the retained full audit reported zero advisories at verification time.

Ordinary and native-browser journeys passed in Chrome for Testing 155.0.8059.12. They used a temporary local draft and a newly generated fictional public page, with no GitHub publication. Both public WebMCP tools were executed through the browser's real native API. The editor and generated page fit 1440, 390 and 320 pixel widths; desktop and mobile screenshots were inspected. No page runtime errors or unexpected editor network requests occurred.

The journeys exercised editing and reload, private notes, invalid project import, a controlled failed save followed by a corrected save, cancellation, all four material downloads, site ZIP generation, a complete server stop/restart, draft replacement and full project-backup restoration. Stored project fields and event identity matched exactly after restoration. Private-note sentinels were present in the full project backup and absent from public materials and native tool results.

A fresh extraction of the Windows candidate ZIP ran its included Node 24.19.0 and GitHub CLI 2.101.0. Its actual server entrypoint served the built editor, generated PDF/SVG/square PNG/story PNG/site ZIP outputs and retained the exact draft across a restart. All six real MCP stdio tools were called using the package's included SDK; replacement consent, public/private filtering and project restore passed.

The portable packaging step now includes the workspace override configuration, so a production-only frozen installation preserves the patched dependency set. The archive retains MIT source licensing, Node/GitHub CLI notices and bundled font notices.

Current publication tests use controlled GitHub responses. The authenticated October 2 Pages publication below is historical evidence for the unchanged publishing protocol, not a new v1 deployment. The excluded demonstration repository was not inspected or modified during these candidate checks. Physical printing, phone-camera scanning and recruited-organizer usability research remain untested.



## October 2, 2026 follow-up

On Windows with Node 24.19.0, a frozen-lockfile install, TypeScript check, production build and all 16 tests passed. Two added regressions first failed against the earlier implementation: a failed live-site check left QR-bearing downloads enabled, and fictional poster notices hid event status. The tests now cover mismatch/outage and subsequent recovery through real local SVG download handlers, plus cancelled, postponed and completed poster status. Live-site responses in the QR regression are controlled fixtures, not a new GitHub deployment.

The rebuilt local editor was exercised in Edge 154.0.4258.48 with fictional data: editing and reloading, private notes, guide dismissal with Escape, project backup/import, all four material downloads, cancellation preview and local site ZIP generation passed. The backup contained the private note sentinel; none of the nine public ZIP files contained it. The downloaded A4 PDF was rendered and visually inspected. Purpose, Details, Design and disconnected Publish screens fit 1440, 390 and 320 pixel widths, with no page runtime errors or unexpected external requests.

The existing public fictional example was checked read-only. Its HTML and calendar reported cancellation, the public JSON matched the repository, and its PDF/SVG/images/calendar/script assets returned successfully. Both native WebMCP tools were executed in Edge 154 with the experimental WebMCP and WebMCPTesting features enabled and returned the cancelled state. This is evidence for that browser configuration, not universal browser support. The page fit 1440, 390 and 320 pixel widths. Its old printable materials exposed the missing cancellation banner; corrected materials were regenerated locally for review.

A fresh extraction of the 0.1.1 Windows ZIP was tested using its bundled Node 24.19.0 and production dependencies. The actual server entrypoint served the built editor; PDF, SVG, square PNG, story PNG and site ZIP exports succeeded. Real MCP stdio calls exposed the six tools and returned the public draft without private notes. The bundled GitHub CLI was version 2.101.0. The original public 0.1.0 archive's checksum was verified and its source confirmed to contain both corrected defects.

The authenticated editor then updated the existing fictional example through its normal review and publish flow: [commit 27e9d0e](https://github.com/agammann/protest-example/commit/27e9d0e5fab5553e3a3ae2953fa817655ebd0431). The app verified the expected live revision before enabling QR-bearing downloads. The published HTML, JSON, calendar, PDF, SVG and images retained the fictional cancelled event and stable URL. Both native WebMCP tools were executed again on the updated page and returned its cancelled state. All ten repository files excluded the private note sentinel. A digital decoder recovered the expected URL from the newly downloaded PDF render and both published share images. Physical printing and phone camera scanning remain untested; the September 19 results below are historical.

## September 19, 2026 verification

### Local checks on Windows

TypeScript check and production Vite build pass. Fourteen automated tests pass, covering input validation, unfinished source links, daylight saving transitions, real PDF and PNG generation, HTML escaping, exclusion of private notes from public materials, calendar escaping and UTF8 folding, concurrent local saves, loopback API request protection, publication review expiry and content changes, repository ownership checks, occupied port recovery, cancelled and postponed calendar status, and real MCP stdio communication.

GitHub Actions run [35477726407](https://github.com/agammann/protest/actions/runs/35477726407) passed on Windows, macOS, and Linux for source commit `b156afd`. The GitHub publisher tests use a simulated GitHub API. They are not proof of a live deployment.

A fresh extraction of the Windows portable archive successfully starts its own local server, serves the editor, generates a PDF, and generates all nine public artifacts using the bundled Node.js and production dependencies. No developer node_modules directory is required.

### Browser verification

Checked with the Codex in app browser at 1536 by 1024 and 390 by 844. The editor saves changed details across reloads, switches poster themes and paper sizes, downloads a PDF, opens the guide, and dismisses it with Escape. Keyboard focus is bounded inside the guide. The editor and generated event page fit the phone viewport without horizontal scrolling.

The generated public page registered both WebMCP tools in the in app browser. Calling `get_participant_instructions` returned the expected public meeting point, access information, supplies, and status. This verifies this browser only; it does not imply universal browser support. The current draft is documented at [WebMCP](https://webmachinelearning.github.io/webmcp/).

### Design comparison

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

### Live publication

The Windows app signed into GitHub CLI through GitHub's browser flow and created `agammann/protest-example`, uploaded its reviewed files, and enabled Pages. The app verified the public revision for the first publication, commit `a27953e04975975321e92274d4a8793a66c15481`.

A second publication updated the same site with a cancellation notice, commit `61a4bc7fe48e9d860b773fe34742999605629a90`. The live HTML and WebMCP tool both showed the cancelled state. All ten repository files, including GitHub's initial README, were inspected for a private test sentinel; none contained it. The public artifacts exclude private planning notes.

[Live fictional demonstration](https://agammann.github.io/protest-example/). No actual event is advertised. Public site links, calendar, PDF, and image assets were checked independently of the editor. The current source check results are available in [GitHub Actions](https://github.com/agammann/protest/actions/workflows/check.yml).

Fixes made during real workflow verification: automatic recovery from an occupied local port; bundled font loading in PNG exports; reserved space around the QR code; full address and year on the flier; unfinished source link validation; restored login state after refresh; publication timeouts; Pages configuration checks before writing; generator and font fingerprinting in the published revision; and explicit calendar update limitations.

### Verification boundaries

The Windows portable archive is the locally tested desktop package. Source checks passed on macOS and Linux CI; native desktop use on those systems has not been tested. Physical printing and scanning with a phone camera have not been performed. This is an engineering end to end check using a clearly fictional event, not usability research with recruited organizers or attendees. GitHub account eligibility and hosting limits still apply.
