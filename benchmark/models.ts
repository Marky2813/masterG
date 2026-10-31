// Lists the Gemini models this key can call: npm run bench:models
import { GoogleGenAI } from "@google/genai";

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY missing — put it in .env.local (see .env.example).");
    process.exit(1);
  }
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const pager = await ai.models.list();
  for await (const m of pager) {
    const name = m.name?.replace("models/", "") ?? "";
    if (!/gemini/.test(name)) continue;
    console.log(`${name.padEnd(50)} ${(m.supportedActions ?? []).join(", ")}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
