import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

interface VocabularySeedEntry {
  word: string;
  language: 'tay';
  meanings: Record<string, unknown>[];
}

function isVocabularySeedEntry(value: unknown): value is VocabularySeedEntry {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const entry = value as Record<string, unknown>;
  return typeof entry.word === 'string'
    && entry.word.trim().length > 0
    && entry.language === 'tay'
    && Array.isArray(entry.meanings)
    && entry.meanings.every(
      (meaning) => typeof meaning === 'object' && meaning !== null && !Array.isArray(meaning),
    );
}

async function seedVocabulary(): Promise<void> {
  const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const projectRoot = resolve(backendRoot, '..');
  config({ path: resolve(backendRoot, '.env') });

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('Missing DATABASE_URL environment variable in the project .env file.');
  }

  const dataPath = resolve(projectRoot, 'tay-viet_normalized2.json');
  const contents = await readFile(dataPath, 'utf8');
  const parsed: unknown = JSON.parse(contents);

  if (
    !Array.isArray(parsed)
    || parsed.length === 0
    || !parsed.every(isVocabularySeedEntry)
  ) {
    throw new Error('Normalized vocabulary data must be a non-empty array of { word, language: "tay", meanings } entries.');
  }

  const words = parsed.map((entry) => entry.word);
  if (new Set(words).size !== words.length) {
    throw new Error('Normalized vocabulary data contains duplicate words.');
  }

  const sql = neon(databaseUrl);
  await sql.transaction([
    sql`ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'tay'`,
    sql`TRUNCATE TABLE vocabulary RESTART IDENTITY`,
    sql`
      INSERT INTO vocabulary (word, language, meanings)
      SELECT seed.word, seed.language, seed.meanings
      FROM jsonb_to_recordset(${JSON.stringify(parsed)}::jsonb)
        AS seed(word text, language text, meanings jsonb)
      ON CONFLICT (word) DO UPDATE
      SET language = EXCLUDED.language,
          meanings = EXCLUDED.meanings
    `,
  ]);

  console.log(`Truncated vocabulary and seeded ${parsed.length} entries from ${dataPath}.`);
}

seedVocabulary().catch((error: unknown) => {
  console.error('Vocabulary seed failed:', error);
  process.exitCode = 1;
});
