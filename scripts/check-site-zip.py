from pathlib import Path
from zipfile import ZipFile
import sys

archive = Path(sys.argv[1])
expected = {
    "index.html", "flier.pdf", "flier.svg", "social.png", "story.png",
    "event.ics", "webmcp.js", ".nojekyll", "protest-public.json",
}
with ZipFile(archive) as site:
    names = site.namelist()
    assert len(names) == len(expected) and set(names) == expected, names
    assert site.testzip() is None, "corrupt archive member"
    for name in names:
        assert b"PRIVATE_PROTEST_V1_CANARY" not in site.read(name), name
    assert site.read("flier.pdf").startswith(b"%PDF")
    assert site.read("social.png").startswith(b"\x89PNG\r\n\x1a\n")
    assert b"CANCELLED" in site.read("index.html")
print(f"Verified public site ZIP: {archive}")
