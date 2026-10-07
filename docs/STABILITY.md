# Protest v1 stability and recovery

The v1 contract covers a single local draft, version-1 project JSON, PDF/SVG/PNG/calendar/site exports, reviewed publication to the organizer's own GitHub Pages repository, six local MCP tools and two public read-only WebMCP tools. Local and public data stay separate. Version 1.0.0 does not change the project schema or the generated publication protocol.

Windows x64 has a portable distribution. Source builds have Windows, Linux and macOS checks; native desktop/browser checks on every operating system are not implied. Physical printing, phone-camera scanning and recruited-organizer usability studies are outside the tested contract.

## Data and backups

The default data directory is `.protest/` beside the app. `PROTEST_DATA_DIR` selects another absolute directory. It is outside the frontend build output, so rebuilding `dist/` does not erase drafts.

`project.json` is the full draft, including private notes and checklist state. `deployment.json`, when present, records the last publication and verification state. MCP exports can also exist below `exports/`. **Save project** backs up the draft only; it does not include GitHub credentials or publication verification state.

Save before replacing a draft. An imported project replaces the current draft after validation. New drafts have different event IDs; opening a saved project retains its ID and site name. Keep backups private.

## Upgrade and full recovery

1. Save a project backup and wait for the saved-state indicator.
2. Stop the editor terminal and disconnect any MCP client using that directory.
3. Copy the entire data folder to a safe backup location. Do not merge two running workspaces.
4. Extract the new application into a separate folder.
5. Either open the saved project in the new app, or copy the complete stopped data folder to the new app's `.protest/`. For a custom folder, keep the same absolute `PROTEST_DATA_DIR`.
6. Start the new app; check the title, private notes and export. Check the live site again before relying on QR-bearing downloads.

Keep the old application and untouched backup until the checks pass. To roll back, stop the new app and start the old one with its original data folder. Avoid writing the same folder from both versions.

Malformed JSON is reported instead of silently replaced. Stop all writers, keep a copy of the damaged folder, then restore the entire known-good stopped folder or a known-good `project.json`. Start the app again. A project backup does not contain GitHub login credentials; reconnect GitHub when needed.

## Publication boundaries

Publishing is separate from saving a draft. Public updates retain the stable Pages URL, but old printouts, calendar copies and repository history remain. QR eligibility requires the expected live revision. A mismatch or outage disables QR codes on new downloads; it cannot retract printed files.

A failed publication can leave a public repository or a Pages build in progress. Keep the local project, inspect the Publish status and review again. The publisher validates ownership, matching event identity and branch state; it refuses unrelated/private repositories and does not force-push.

The version-1 draft schema, six local tool names and two public tool names are the extension boundary. New schema migrations or tool changes require explicit compatibility notes. Public fields must continue to exclude private notes, checklist state and local repository configuration.

