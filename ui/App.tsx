import { useEffect, useRef, useState } from "react";
import { api, download, setSession } from "./api";
import type { Guide, Project } from "./types";
import { Purpose, Details, Design, Arrow, Field } from "./Fields";
import { Publish } from "./Publish";
export default function App() {
  const [p, setP] = useState<Project | null>(null),
    [guide, setGuide] = useState<Guide[]>([]),
    [step, setStep] = useState(0),
    [view, setView] = useState("flier"),
    [showGuide, setShowGuide] = useState(false),
    [error, setError] = useState(""),
    [saving, setSaving] = useState("Saved on this computer"),
    [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false);
  const projectRef = useRef<Project | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    queue = useRef(Promise.resolve()),
    fileRef = useRef<HTMLInputElement>(null),
    guideRef = useRef<HTMLElement>(null);
  useEffect(() => {
    api("session")
      .then((s) => {
        setSession(s.csrf);
        projectRef.current = s.project;
        setP(s.project);
        setGuide(s.guide);
      })
      .catch((e) => setError(e.message));
  }, []);
  const save = (project: Project) => {
    setSaving("Saving…");
    const job = queue.current
      .catch(() => {})
      .then(() => api("project", "PUT", project))
      .then(() => {
        setSaving("Saved on this computer");
        setRevision((v) => v + 1);
      });
    queue.current = job;
    return job;
  };
  const flush = async () => {
    if (timer.current) clearTimeout(timer.current);
    if (projectRef.current) await save(projectRef.current);
  };
  const change = (key: keyof Project, value: any) => {
    if (!projectRef.current) return;
    const next = { ...projectRef.current, [key]: value };
    projectRef.current = next;
    setP(next);
    setSaving("Unsaved changes");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(
      () =>
        save(next).catch((e) => {
          setError(e.message);
          setSaving("Not saved");
        }),
      400,
    );
  };
  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await flush();
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const onDownload = (type: string) => act(() => download(type));
  const reset = async (example = false) => {
    if (
      !window.confirm(
        "Replace the current draft? Save a project file first if you want to keep it.",
      )
    )
      return;
    await act(async () => {
      const next = await api("new", "POST", { example });
      projectRef.current = next;
      setP(next);
      setStep(0);
      setRevision((v) => v + 1);
    });
  };
  const load = async (file?: File) => {
    if (!file) return;
    await act(async () => {
      if (file.size > 64000) throw new Error("Project file is too large.");
      const next = await api<Project>(
        "project",
        "PUT",
        JSON.parse(await file.text()),
      );
      projectRef.current = next;
      setP(next);
      setRevision((v) => v + 1);
      setStep(0);
    });
  };
  useEffect(() => {
    const onClose = (e: BeforeUnloadEvent) => {
      if (saving !== "Saved on this computer") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onClose);
    return () => window.removeEventListener("beforeunload", onClose);
  }, [saving]);
  useEffect(() => {
    if (!showGuide) return;
    const previous = document.activeElement as HTMLElement;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowGuide(false);
        return;
      }
      if (e.key === "Tab") {
        const items = guideRef.current?.querySelectorAll<HTMLElement>(
          "button,input,textarea,a[href]",
        );
        if (!items?.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, [showGuide]);
  if (!p)
    return (
      <main className="loading">
        <h1>
          PROTEST<span>.</span>
        </h1>
        <p role="status">{error || "Opening your local workspace…"}</p>
      </main>
    );
  return (
    <>
      <header className="masthead">
        <a className="wordmark" href="#">
          PROTEST<span>.</span>
        </a>
        <nav aria-label="Project">
          <button className="text-button" onClick={() => setShowGuide(true)}>
            The guide
          </button>
          <button
            className="text-button"
            onClick={() => fileRef.current?.click()}
          >
            Open project
          </button>
          <button onClick={() => onDownload("project")} disabled={busy}>
            Save project
          </button>
        </nav>
        <input
          hidden
          type="file"
          ref={fileRef}
          accept=".json,application/json"
          onChange={(e) => {
            void load(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </header>
      <main>
        <section className="hero">
          <h1>
            MAKE SOME
            <br />
            <span>NOISE.</span>
          </h1>
          <div>
            <p>
              Turn a reason to gather into a flier and a website. Yours to make.
              Yours to publish.
            </p>
            <small>Free. Open source. On your terms.</small>
          </div>
        </section>
        <nav className="steps" aria-label="Creation steps">
          {["Purpose", "Details", "Design", "Publish"].map((label, i) => (
            <button
              key={label}
              aria-current={step === i ? "step" : undefined}
              className={step === i ? "active" : ""}
              onClick={() => {
                setStep(i);
                setError("");
              }}
            >
              <b>0{i + 1}</b>
              {label}
            </button>
          ))}
        </nav>
        {error && (
          <div className="error" role="alert">
            {error}
            <button className="text-button" onClick={() => setError("")}>
              Dismiss
            </button>
          </div>
        )}
        <div className="workspace">
          <section className="editor" aria-label="Event editor">
            {step === 0 ? (
              <Purpose p={p} change={change} />
            ) : step === 1 ? (
              <Details p={p} change={change} />
            ) : step === 2 ? (
              <Design
                p={p}
                change={change}
                onDownload={onDownload}
                busy={busy}
              />
            ) : (
              <Publish
                p={p}
                change={change}
                flush={flush}
                onError={setError}
                onDownload={onDownload}
              />
            )}
            {step < 3 && (
              <button
                className="primary wide next"
                onClick={() => setStep(step + 1)}
              >
                {
                  [
                    "Continue to details",
                    "Choose your design",
                    "Get ready to publish",
                  ][step]
                }
                <Arrow />
              </button>
            )}
            <div className="draft-controls">
              <span role="status">{saving}</span>
              <button className="text-button" onClick={() => reset(false)}>
                New draft
              </button>
              {!p.example && (
                <button className="text-button" onClick={() => reset(true)}>
                  Load example
                </button>
              )}
            </div>
          </section>
          <aside className="preview" aria-label="Live preview">
            <div
              className="preview-tabs"
              role="group"
              aria-label="Preview type"
            >
              <button
                className={view === "flier" ? "selected" : ""}
                aria-pressed={view === "flier"}
                onClick={() => setView("flier")}
              >
                Flier
              </button>
              <button
                className={view === "site" ? "selected" : ""}
                aria-pressed={view === "site"}
                onClick={() => setView("site")}
              >
                Website
              </button>
            </div>
            {view === "flier" ? (
              <div className="poster-wrap">
                <img
                  src={"/api/preview/flier?v=" + revision}
                  alt={`Flier preview: ${p.title || "Your voice belongs here"}`}
                  className="poster"
                />
              </div>
            ) : (
              <iframe
                title="Your public website preview"
                src={"/api/preview/site?v=" + revision}
                sandbox=""
                className="site-preview"
              />
            )}
            <p>
              {p.example
                ? "Fictional example. Make it yours."
                : "Your details stay here until you publish."}
            </p>
          </aside>
        </div>
      </main>
      <footer className="app-footer">
        <span>Plan your protest. Create your flier. Publish your site.</span>
        <a
          href="https://github.com/agammann/protest"
          target="_blank"
          rel="noreferrer"
        >
          Open source. Yours to use.
        </a>
      </footer>
      {showGuide && (
        <div
          className="dialog-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowGuide(false);
          }}
        >
          <section
            ref={guideRef}
            className="guide-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="guide-title"
          >
            <button
              className="close"
              autoFocus
              onClick={() => setShowGuide(false)}
            >
              Close
            </button>
            <h2 id="guide-title">
              A good protest starts
              <br />
              before anyone shows up.
            </h2>
            <p>
              Use this as a working guide. Check local requirements and adapt it
              to your community.
            </p>
            {guide.map((g, i) => (
              <article key={g.id}>
                <h3>
                  0{i + 1} / {g.title}
                </h3>
                <p>{g.body}</p>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={p.checks.includes(g.id)}
                    onChange={(e) =>
                      change(
                        "checks",
                        e.target.checked
                          ? [...p.checks, g.id]
                          : p.checks.filter((id) => id !== g.id),
                      )
                    }
                  />
                  <span>We have considered this.</span>
                </label>
              </article>
            ))}
            <Field
              label="Private planning notes"
              value={p.privateNotes}
              rows={5}
              onChange={(v) => change("privateNotes", v)}
              help="Saved in your project file. Never included in the site, flier, or public repository."
              maxLength={5000}
            />
            <button
              className="wide primary"
              onClick={() => setShowGuide(false)}
            >
              Back to making it happen <Arrow />
            </button>
          </section>
        </div>
      )}
    </>
  );
}
