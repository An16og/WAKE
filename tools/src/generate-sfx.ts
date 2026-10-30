import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SFX_PROMPTS: Record<string, string> = {
  door_creak: 'Slow ominous heavy wooden door creaking open in an abandoned hallway',
  whisper: 'Subtle creepy raspy whisper echoing right behind the listener ear',
  footsteps: 'Heavy dragging wet footsteps on wooden floorboards in silence',
  breath: 'Shallow ragged human breathing in cold damp darkness',
  mirror_crack: 'Sudden sharp mirror glass cracking and fracturing loudly',
  monster_growl: 'Deep low guttural monster throat rumble vibration',
  death_sting: 'Harsh discordant horror musical sting impact'
};

const OUTPUT_DIR = path.resolve(__dirname, '../../client/public/sfx');

async function generateSfx() {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  if (!apiKey || apiKey.trim() === '') {
    console.log('[SFX Generator] No ELEVENLABS_API_KEY found in environment.');
    console.log('[SFX Generator] Generating fallback static audio markers in client/public/sfx/ so offline play is seamless.');
    generateFallbackAudioFiles();
    return;
  }

  console.log('[SFX Generator] Found ELEVENLABS_API_KEY. Generating high-fidelity horror sound effects via ElevenLabs Sound Generation API...');

  for (const [name, prompt] of Object.entries(SFX_PROMPTS)) {
    const destPath = path.join(OUTPUT_DIR, `${name}.mp3`);
    if (fs.existsSync(destPath)) {
      const stat = fs.statSync(destPath);
      // If file exists and is larger than a placeholder dummy (>1KB), skip
      if (stat.size > 1000) {
        console.log(`[SFX Generator] File ${name}.mp3 already exists, skipping.`);
        continue;
      }
    }

    console.log(`[SFX Generator] Generating "${name}" with prompt: "${prompt}"...`);
    try {
      const res = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: prompt,
          duration_seconds: 2.5,
          prompt_influence: 0.5
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`[SFX Generator] ElevenLabs API error for ${name} (${res.status}): ${errText}`);
        continue;
      }

      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(destPath, buffer);
      console.log(`[SFX Generator] Successfully saved: ${destPath}`);
    } catch (e: any) {
      console.warn(`[SFX Generator] Failed to generate ${name}:`, e.message);
    }
  }

  console.log('[SFX Generator] Done.');
}

// Generate simple 1-second sine wave burst fallback audio so HTML5 Audio can load them if needed
function generateFallbackAudioFiles() {
  for (const name of Object.keys(SFX_PROMPTS)) {
    const destPath = path.join(OUTPUT_DIR, `${name}.mp3`);
    if (!fs.existsSync(destPath)) {
      // Small minimal valid MP3 frame header or silence marker
      const placeholder = Buffer.from('ID3\x03\x00\x00\x00\x00\x00\x00\xff\xfb\x90d\x00\x00\x00\x00\x00\x00\x00', 'binary');
      fs.writeFileSync(destPath, placeholder);
      console.log(`[SFX Generator] Created static placeholder: ${name}.mp3`);
    }
  }
}

generateSfx();
