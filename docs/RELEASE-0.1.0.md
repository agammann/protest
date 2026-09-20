# Protest 0.1.0

Create a protest flier and an event website, then publish to your own GitHub Pages account. Protest runs locally and is free software under the MIT license.

## Download

Windows users: download `Protest-0.1.0-windows-x64.zip`, extract the entire folder, then double click `Start Protest.cmd`. Node.js and GitHub CLI are bundled. Keep the terminal window open while using the app. A SHA256 checksum is supplied alongside the archive.

## Included

* Four step editor with local project backups and private planning notes.
* Letter and A4 PDF, editable SVG, square and story PNG, and calendar file.
* Public event page with exact meeting point, sources, accessibility information, status, and updates.
* Reviewed publishing to the organizer's own public repository and GitHub Pages URL.
* QR code downloads after the published page is verified.
* Optional local MCP tools and read only WebMCP tools on the public page.

## Verified

The app created a real GitHub repository and Pages deployment, then published and verified a cancellation at the same URL. The demonstration is fictional and clearly labelled. Private test notes were absent from the public files. Fourteen automated tests pass; Windows, macOS, and Linux source CI is configured. The Windows portable app was tested from a fresh extraction. PDF and image QR codes were decoded successfully from rendered output.

See the [live fictional demonstration](https://agammann.github.io/protest-example/) and [detailed verification](https://github.com/agammann/protest/blob/main/docs/VERIFICATION.md).

## Limits

Native desktop use is verified on Windows. macOS and Linux have source CI coverage. Physical printing and phone camera scanning have not been tested. This release has engineering workflow verification, not usability research with recruited organizers. WebMCP depends on browser support; the regular website works without it. Calendar imports do not automatically track later changes.
