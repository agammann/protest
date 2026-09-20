# Privacy and security

The editor binds only to `127.0.0.1`. Its API checks the Host and Origin headers and requires a random session token for writes. There is no hosted Protest backend. Drafts are unencrypted files on your computer, so anyone who can read that directory can read your notes.

GitHub authentication belongs to GitHub CLI. Protest does not ask for passwords or put tokens into project files. GitHub CLI controls credential storage and permissions. Only connect an account you intend to use for publication.

Publication uploads a fixed set of generated files to a public repository in the connected account. The review shows the destination and public event fields. Private notes, local checklist state, and the private project backup are excluded. A downloaded **project backup does include private notes** and should be kept private.

Published event content, addresses, organizer contacts, sources, and images can be copied by anyone. Git commits retain older content. Updating or cancelling an event does not erase previously published information. GitHub can see activity on its infrastructure. A free GitHub Pages address is not anonymous hosting.

Source links accept HTTPS only. User text is escaped in the HTML and SVG outputs. The publisher refuses unrelated or private repositories, checks the branch before writing, preserves other files in a matching event repository, and does not force push. Publication review expires after ten minutes and becomes invalid when the draft changes.

There is no visitor data collection added by Protest. Following map and source links visits third party sites. WebMCP exposes only information already present in the public event page.

For a suspected vulnerability, use the repository's private vulnerability reporting feature if available. Otherwise open an issue containing only a high level description and ask for a private reporting channel. Do not post credentials, private drafts, or exploitable personal information.
