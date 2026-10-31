import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// Dev-only: saves benchmark samples written on /capture into benchmark/samples/.

const DIR = path.join(process.cwd(), "benchmark", "samples");
const LABELS = path.join(DIR, "labels.json");

async function readLabels(): Promise<Record<string, unknown>[]> {
  try {
    return JSON.parse(await readFile(LABELS, "utf8"));
  } catch {
    return [];
  }
}

export async function GET() {
  return Response.json(await readLabels());
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") return new Response("capture is dev-only", { status: 403 });

  const { png, label } = (await request.json()) as { png: string; label: Record<string, unknown> };
  const labels = await readLabels();
  const id = `${label.topic}-${String(labels.length + 1).padStart(3, "0")}`;
  const file = `${id}.png`;

  await mkdir(DIR, { recursive: true });
  await writeFile(path.join(DIR, file), Buffer.from(png.replace(/^data:image\/png;base64,/, ""), "base64"));
  labels.push({ id, file, ...label });
  await writeFile(LABELS, JSON.stringify(labels, null, 2));

  return Response.json({ id, count: labels.length });
}
