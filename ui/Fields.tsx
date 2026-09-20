import type { Project } from "./types";
type Props = { p: Project; change: (key: keyof Project, value: any) => void };
export function Field({
  label,
  value,
  onChange,
  help,
  type = "text",
  rows,
  maxLength = 1500,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  help?: string;
  type?: string;
  rows?: number;
  maxLength?: number;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {rows ? (
        <textarea
          value={value}
          rows={rows}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          type={type}
          value={value}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {help && <small>{help}</small>}
    </label>
  );
}
export function Purpose({ p, change }: Props) {
  return (
    <>
      <h2>Start with your why.</h2>
      <p className="intro">One clear reason. One concrete request.</p>
      <Field
        label="Protest title"
        value={p.title}
        onChange={(v) => change("title", v)}
        maxLength={100}
      />
      <Field
        label="Why are you gathering?"
        value={p.reason}
        rows={3}
        onChange={(v) => change("reason", v)}
        maxLength={1400}
      />
      <Field
        label="What change do you want?"
        value={p.demand}
        rows={2}
        onChange={(v) => change("demand", v)}
        maxLength={400}
      />
      <Field
        label="Organizer"
        value={p.organizer}
        onChange={(v) => change("organizer", v)}
        maxLength={120}
      />
    </>
  );
}
export function Details({ p, change }: Props) {
  return (
    <>
      <h2>Help people show up.</h2>
      <p className="intro">Clear directions make all the difference.</p>
      <div className="field-row">
        <Field
          label="Date"
          type="date"
          value={p.date}
          onChange={(v) => change("date", v)}
        />
        <Field
          label="Time zone"
          value={p.timezone}
          onChange={(v) => change("timezone", v)}
          help="For example: America/Los_Angeles"
          maxLength={80}
        />
      </div>
      <div className="field-row">
        <Field
          label="Start time"
          type="time"
          value={p.startTime}
          onChange={(v) => change("startTime", v)}
        />
        <Field
          label="End time (optional)"
          type="time"
          value={p.endTime}
          onChange={(v) => change("endTime", v)}
        />
      </div>
      <Field
        label="Location name"
        value={p.location}
        onChange={(v) => change("location", v)}
        maxLength={140}
      />
      <Field
        label="Full address"
        value={p.address}
        onChange={(v) => change("address", v)}
        help="Include city, region, and country. Check the map before sharing."
        maxLength={240}
      />
      <Field
        label="Exact meeting point"
        value={p.meetingPoint}
        rows={3}
        onChange={(v) => change("meetingPoint", v)}
        help="Name an entrance or landmark. A park name alone may leave people guessing."
        maxLength={700}
      />
      <Field
        label="What should people expect?"
        value={p.expectations}
        rows={3}
        onChange={(v) => change("expectations", v)}
        help="Format, duration, peaceful participation, and the weather plan."
        maxLength={1400}
      />
      <Field
        label="Accessibility"
        value={p.accessibility}
        rows={3}
        onChange={(v) => change("accessibility", v)}
        help="Describe confirmed access, seating, toilets, transit, and interpretation. Be specific about what is unknown."
        maxLength={1000}
      />
      <Field
        label="What to bring"
        value={p.bring}
        rows={2}
        onChange={(v) => change("bring", v)}
        maxLength={700}
      />
      <Field
        label="Public contact (optional)"
        value={p.contact}
        onChange={(v) => change("contact", v)}
        help="Only enter contact information you intend to publish."
        maxLength={240}
      />
      <details className="source-editor">
        <summary>Read the background • source links</summary>
        <p>
          Add original documents or reliable reporting. Links are published as
          supplied, without an endorsement or verification claim.
        </p>
        {p.sources.map((s, i) => (
          <div className="source" key={i}>
            <Field
              label={`Source ${i + 1} title`}
              value={s.title}
              onChange={(v) =>
                change(
                  "sources",
                  p.sources.map((a, n) => (n === i ? { ...a, title: v } : a)),
                )
              }
              maxLength={160}
            />
            <Field
              label={`Source ${i + 1} HTTPS URL`}
              value={s.url}
              onChange={(v) =>
                change(
                  "sources",
                  p.sources.map((a, n) => (n === i ? { ...a, url: v } : a)),
                )
              }
            />
            <button
              className="text-button"
              onClick={() =>
                change(
                  "sources",
                  p.sources.filter((_, n) => n !== i),
                )
              }
            >
              Remove source {i + 1}
            </button>
          </div>
        ))}
        <button
          disabled={p.sources.length >= 12}
          onClick={() =>
            change("sources", [...p.sources, { title: "", url: "" }])
          }
        >
          Add a source
        </button>
      </details>
      <label className="field">
        <span>Event status</span>
        <select
          value={p.status}
          onChange={(e) => change("status", e.target.value)}
        >
          <option value="scheduled">Scheduled</option>
          <option value="updated">Updated</option>
          <option value="postponed">Postponed</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
        </select>
      </label>
      <Field
        label="Public update"
        rows={3}
        value={p.update}
        onChange={(v) => change("update", v)}
        maxLength={1000}
      />
    </>
  );
}
export function Design({
  p,
  change,
  onDownload,
  busy,
}: Props & { onDownload: (type: string) => void; busy: boolean }) {
  return (
    <>
      <h2>Make it impossible to miss.</h2>
      <p className="intro">A loud headline. The details that matter.</p>
      <div className="themes" role="group" aria-label="Poster theme">
        {[
          ["signal", "Signal", "#dcfa52"],
          ["broadcast", "Broadcast", "#ef4c33"],
          ["press", "Press", "#f3f0e8"],
        ].map(([id, label, color]) => (
          <button
            className={"theme " + (p.theme === id ? "selected" : "")}
            aria-pressed={p.theme === id}
            key={id}
            onClick={() => change("theme", id)}
          >
            <span style={{ background: color }}>Aa</span>
            {label}
          </button>
        ))}
      </div>
      <label className="field">
        <span>Paper size</span>
        <select
          value={p.format}
          onChange={(e) => change("format", e.target.value)}
        >
          <option value="letter">US Letter</option>
          <option value="a4">A4</option>
        </select>
      </label>
      <div className="download-list">
        <h3>Ready for the street. Ready to share.</h3>
        <button disabled={busy} onClick={() => onDownload("pdf")}>
          Download printable PDF <Arrow />
        </button>
        <button disabled={busy} onClick={() => onDownload("square")}>
          Download square image <Arrow />
        </button>
        <button disabled={busy} onClick={() => onDownload("story")}>
          Download story image <Arrow />
        </button>
        <button disabled={busy} onClick={() => onDownload("svg")}>
          Download editable SVG <Arrow />
        </button>
      </div>
      <p className="hint">
        The QR code is added after your current site is published and verified.
        Draft exports have no live link.
      </p>
    </>
  );
}
export function Arrow() {
  return (
    <svg width="25" height="20" viewBox="0 0 25 20" aria-hidden="true">
      <path
        d="M1 10h21M14 2l8 8-8 8"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
      />
    </svg>
  );
}
