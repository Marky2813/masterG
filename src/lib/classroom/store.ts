// Server-only classroom store: JSON files under data/classroom/<CODE>/ (gitignored).
//   class.json            the class, its roster and the hash of the teacher key
//   sessions/<id>.json    one practice session's report, rewritten as the kid works
// Good for the demo laptop and a single server. A read-only filesystem (Vercel) can't keep it;
// the swap is a database behind these same functions (docs/LAUNCH.md).
import { createHash, randomBytes } from "node:crypto";
import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseReport, type Report } from "../report/model";
import { CODE_RE, ID_RE, randomCode, type ClassDoc, type ClassInfo, type SessionDoc, type Student } from "./model";

const ROOT = path.join(process.cwd(), "data", "classroom");
const MAX_STUDENTS = 80;
const MAX_REPORT_BYTES = 400_000;

const dir = (code: string) => {
  if (!CODE_RE.test(code)) throw new Error("bad class code");
  return path.join(ROOT, code);
};

async function writeJson(file: string, data: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${randomBytes(4).toString("hex")}.tmp`;
  await writeFile(tmp, JSON.stringify(data));
  await rename(tmp, file); // whole file or nothing, even if two requests race
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch {
    return null;
  }
}

// One writer per class at a time inside this server process (joins must not overwrite each other).
const locks = new Map<string, Promise<unknown>>();
function locked<T>(code: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(code) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  locks.set(code, next.catch(() => {}));
  return next;
}

export const hashKey = (key: string) => createHash("sha256").update(key).digest("hex");
export const newId = (bytes = 12) => randomBytes(bytes).toString("base64url");

export const publicInfo = (c: ClassDoc): ClassInfo => ({ code: c.code, name: c.name, grade: c.grade, school: c.school, created: c.created, students: c.students });

export async function createClass(input: { name: string; grade?: string; school?: string }): Promise<{ info: ClassInfo; key: string }> {
  for (let tries = 0; tries < 20; tries++) {
    const code = randomCode(() => randomBytes(1)[0] / 256);
    const file = path.join(dir(code), "class.json");
    if (await readJson(file)) continue;
    const key = newId(18);
    const doc: ClassDoc = { code, name: input.name, grade: input.grade, school: input.school, created: Date.now(), students: [], keyHash: hashKey(key) };
    await writeJson(file, doc);
    return { info: publicInfo(doc), key };
  }
  throw new Error("could not find a free class code");
}

export async function getClass(code: string): Promise<ClassDoc | null> {
  return readJson<ClassDoc>(path.join(dir(code), "class.json"));
}

export async function checkKey(code: string, key: string | null): Promise<ClassDoc | null> {
  const c = await getClass(code);
  if (!c || !key || hashKey(key) !== c.keyHash) return null;
  return c;
}

export function joinClass(code: string, name: string, roll?: string, existingId?: string): Promise<Student> {
  return locked(code, async () => {
    const file = path.join(dir(code), "class.json");
    const c = await readJson<ClassDoc>(file);
    if (!c) throw new Error("no such class");
    // The same device joining again (same id) updates the name instead of adding a second kid.
    const known = existingId ? c.students.find((s) => s.id === existingId) : undefined;
    if (known) {
      known.name = name;
      known.roll = roll || undefined;
      await writeJson(file, c);
      return known;
    }
    if (c.students.length >= MAX_STUDENTS) throw new Error("this class is full");
    const s: Student = { id: newId(), name, roll: roll || undefined, joined: Date.now() };
    c.students.push(s);
    await writeJson(file, c);
    return s;
  });
}

export async function putSession(code: string, studentId: string, sessionId: string, report: unknown): Promise<void> {
  if (!ID_RE.test(studentId) || !ID_RE.test(sessionId)) throw new Error("bad id");
  const c = await getClass(code);
  if (!c) throw new Error("no such class");
  if (!c.students.some((s) => s.id === studentId)) throw new Error("not in this class");
  const r: Report = parseReport(report);
  const file = path.join(dir(code), "sessions", `${sessionId}.json`);
  const prev = await readJson<SessionDoc>(file);
  if (prev && prev.studentId !== studentId) throw new Error("session belongs to someone else");
  const doc: SessionDoc = { id: sessionId, studentId, report: { ...r, ai: undefined }, updated: Date.now() };
  const json = JSON.stringify(doc);
  if (json.length > MAX_REPORT_BYTES) throw new Error("report too large");
  await writeJson(file, doc);
}

export async function listSessions(code: string): Promise<SessionDoc[]> {
  const d = path.join(dir(code), "sessions");
  let names: string[] = [];
  try {
    names = (await readdir(d)).filter((n) => n.endsWith(".json"));
  } catch {
    return [];
  }
  const docs = await Promise.all(names.map((n) => readJson<SessionDoc>(path.join(d, n))));
  return docs.filter((x): x is SessionDoc => !!x);
}
