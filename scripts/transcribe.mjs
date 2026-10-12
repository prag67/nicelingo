// Diagnose: transcribe given audio files via Whisper REST and show raw text.
// Usage: CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... node scripts/transcribe.mjs [--lang=de] <file...>
// Language defaults from /audio/{lang}/ in the path, else "en".
import { readFileSync } from "node:fs";

const token = process.env.CLOUDFLARE_API_TOKEN;
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const args = process.argv.slice(2);
const flag = args.find((a) => a.startsWith("--lang="))?.slice("--lang=".length);
for (const file of args.filter((a) => !a.startsWith("--lang="))) {
  const audio = readFileSync(file).toString("base64");
  const language = flag ?? file.match(/\/audio\/(es|de|fr)\//)?.[1] ?? "en";
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/@cf/openai/whisper-large-v3-turbo`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ audio, language }),
    },
  );
  const data = await res.json();
  console.log(`${file}: ${JSON.stringify(data?.result?.text ?? data)}`);
}
