/**
 * Pre-generates a recording for every course item with Azure AI Speech
 * (official API; the free F0 tier gives 500k characters/month — this whole
 * course is a few thousand). Files go to public/audio/<unit dir>/<item id>.mp3,
 * and public/audio/manifest.json maps item id → file. The app plays these
 * before falling back to the browser's text-to-speech, so audio works on every
 * device, with no Bulgarian voice installed.
 *
 *   $env:AZURE_SPEECH_KEY = "<key>"; $env:AZURE_SPEECH_REGION = "westeurope"
 *   npm run audio:generate              # only missing files
 *   npm run audio:generate -- --force   # regenerate everything
 *
 * Optional: $env:AZURE_SPEECH_VOICE = "bg-BG-BorislavNeural" (default: bg-BG-KalinaNeural)
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadContentFromDisk } from './loadContent.ts';
import { parseContent } from '../src/content/validate.ts';

const key = process.env.AZURE_SPEECH_KEY;
const region = process.env.AZURE_SPEECH_REGION;
const voice = process.env.AZURE_SPEECH_VOICE ?? 'bg-BG-KalinaNeural';
const force = process.argv.includes('--force');

if (!key || !region) {
  console.error('Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION first (see the header of this file / README).');
  process.exit(1);
}

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'public', 'audio');
const { parsed, errors } = parseContent(loadContentFromDisk(path.join(root, 'content')));
if (!parsed) {
  console.error(errors.join('\n'));
  process.exit(1);
}

const xml = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);

async function synth(text: string): Promise<Buffer> {
  const ssml = `<speak version="1.0" xml:lang="bg-BG"><voice name="${voice}"><prosody rate="-10%">${xml(text)}</prosody></voice></speak>`;
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key!,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'zdravei-audio-generator',
      },
      body: ssml,
    });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if (res.status === 429 && attempt < 5) {
      await new Promise((r) => setTimeout(r, 1000 * attempt));
      continue;
    }
    throw new Error(`Azure TTS ${res.status}: ${await res.text()}`);
  }
}

const manifestPath = path.join(outDir, 'manifest.json');
const manifest: Record<string, string> = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};
let made = 0;
let kept = 0;

for (const { dir, unit } of parsed.units) {
  fs.mkdirSync(path.join(outDir, dir), { recursive: true });
  for (const item of unit.items) {
    if (item.audio) continue; // a hand-recorded file is referenced directly
    const rel = `${dir}/${item.id}.mp3`;
    const file = path.join(outDir, rel);
    if (!force && fs.existsSync(file)) {
      manifest[item.id] = rel;
      kept++;
      continue;
    }
    const text = item.say ?? item.bg;
    process.stdout.write(`${item.id}  ${text} … `);
    fs.writeFileSync(file, await synth(text));
    manifest[item.id] = rel;
    made++;
    console.log('ok');
  }
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`\n✔ ${made} generated, ${kept} already present → ${path.relative(root, manifestPath)}`);
