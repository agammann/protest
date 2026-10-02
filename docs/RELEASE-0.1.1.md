# Protest 0.1.1

This patch fixes cancellation notices on exported materials and QR eligibility after a failed live-site check.

- Fictional fliers and images retain both the fictional warning and the event status. Cancelled, postponed and completed draft exports no longer say “SHOW UP.”
- When a previously verified site becomes unavailable or serves a different revision, the app saves that verification change. New downloads omit the QR code until the expected revision is verified again.

Windows users: download `Protest-0.1.1-windows-x64.zip`, verify its accompanying SHA256 checksum, extract the entire folder, and open `Start Protest.cmd`. Node.js and GitHub CLI are included. Keep project backups private; they include planning notes. Existing drafts can be restored with **Open project**.

Sixteen automated tests, the TypeScript check and the production build passed on Windows. The local editor's save/reload, project backup/import, PDF/SVG/PNG downloads, cancelled preview and 320/390/1440 pixel layouts were exercised in Edge 154. The actual public example's two native WebMCP tools returned the cancelled state in that browser. The authenticated editor also updated the existing fictional example, verified its live revision and enabled QR downloads; digital decoding recovered the expected URL from the downloaded PDF and published share images. See [verification notes](VERIFICATION.md) for exact scope.

The Windows ZIP was tested from a fresh extraction with its bundled Node runtime, GitHub CLI and production dependencies. Its server, material exports, site ZIP and local MCP communication passed without using the source checkout's dependencies.

No new service or account is required. Publication still uses the organizer's GitHub account and requires review in the editor. Physical printing, phone camera scanning and browser support beyond the recorded checks are not certified by this release.
