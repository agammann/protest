let csrf = "";
export function setSession(value: string) {
  csrf = value;
}
export async function api<T = any>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const r = await fetch("/api/" + path, {
    method,
    headers: { "Content-Type": "application/json", "X-Protest-Session": csrf },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Request failed.");
  return data;
}
export async function download(type: string) {
  const r = await fetch("/api/download/" + type);
  if (!r.ok) {
    const d = await r.json();
    throw new Error(d.error);
  }
  const blob = await r.blob(),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download =
    r.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ||
    "protest-download";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
