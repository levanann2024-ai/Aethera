import { sql } from '../config/db.js';
import type {
  SearchDirection,
  SourceLanguage,
  VocabularyEntry,
  VocabularyMeaning,
} from '../models/vocabularyModel.js';

function parseMeanings(value: unknown): VocabularyMeaning[] {
  if (!Array.isArray(value)) {
    throw new Error('Database returned invalid vocabulary meanings.');
  }

  return value.map((item) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new Error('Database returned an invalid vocabulary meaning.');
    }

    const meaning = item as Record<string, unknown>;
    const definitions = meaning.definitions;
    if (
      (meaning.part_of_speech !== undefined && typeof meaning.part_of_speech !== 'string')
      || (meaning.example !== undefined && typeof meaning.example !== 'string')
      || (definitions !== undefined
        && (!Array.isArray(definitions) || !definitions.every((definition) => typeof definition === 'string')))
    ) {
      throw new Error('Database returned an invalid vocabulary meaning.');
    }

    return {
      part_of_speech: meaning.part_of_speech as string | undefined,
      definitions: definitions as string[] | undefined,
      example: meaning.example as string | undefined,
    };
  });
}

function parseVocabularyEntry(row: Record<string, unknown>): VocabularyEntry {
  if (
    typeof row.word !== 'string'
    || !row.word
    || (row.language !== 'tay' && row.language !== 'muong')
  ) {
    throw new Error('Database returned an invalid vocabulary entry.');
  }

  const meanings = parseMeanings(row.meanings);
  return {
    id: row.word,
    sourceLanguage: row.language,
    sourceTerm: row.word,
    meaning: meanings.flatMap((item) => item.definitions ?? []).join('; '),
    partOfSpeech: [...new Set(meanings.map((item) => item.part_of_speech).filter(
      (partOfSpeech): partOfSpeech is string => Boolean(partOfSpeech),
    ))].join(', '),
    example: meanings.map((item) => item.example).filter(Boolean).join('; '),
    meanings,
  };
}

export async function searchVocabulary(
  language: SourceLanguage,
  query = '',
  direction: SearchDirection = 'tay-to-viet',
): Promise<VocabularyEntry[]> {
  const pattern = `%${query}%`;
  const rows = await sql`
    SELECT word, language, meanings
    FROM vocabulary
    WHERE language = ${language}
      AND (
      ${query} = ''
      OR (
        ${direction} = 'tay-to-viet'
        AND word ILIKE ${pattern}
      )
      OR (
        ${direction} = 'viet-to-tay'
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements(vocabulary.meanings) AS meaning
          CROSS JOIN LATERAL jsonb_array_elements_text(
            CASE
              WHEN jsonb_typeof(meaning.value->'definitions') = 'array'
              THEN meaning.value->'definitions'
              ELSE '[]'::jsonb
            END
          ) AS definition(value)
          WHERE definition.value ILIKE ${pattern}
        )
      )
    )
    ORDER BY
      CASE
        WHEN ${direction} = 'tay-to-viet' AND lower(word) = lower(${query}) THEN 0
        WHEN ${direction} = 'viet-to-tay' AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements(vocabulary.meanings) AS meaning
          CROSS JOIN LATERAL jsonb_array_elements_text(
            CASE
              WHEN jsonb_typeof(meaning.value->'definitions') = 'array'
              THEN meaning.value->'definitions'
              ELSE '[]'::jsonb
            END
          ) AS definition(value)
          WHERE lower(definition.value) = lower(${query})
        ) THEN 0
        ELSE 1
      END,
      word
    LIMIT ${query ? 100 : 5000}
  `;

  return rows.map((row) => parseVocabularyEntry(row));
}

export async function searchVocabularyBatch(
  language: SourceLanguage,
  terms: string[],
  direction: SearchDirection,
): Promise<Array<{ index: number; entry: VocabularyEntry }>> {
  if (terms.length === 0) return [];

  const input = JSON.stringify(terms.map((text, index) => ({ index, text })));
  const rows = await sql`
    WITH input AS (
      SELECT item.index, item.text
      FROM jsonb_to_recordset(${input}::jsonb) AS item(index integer, text text)
    )
    SELECT input.index, vocabulary.word, vocabulary.language, vocabulary.meanings
    FROM input
    JOIN vocabulary
      ON vocabulary.language = ${language}
      AND (
        (${direction} = 'tay-to-viet' AND lower(vocabulary.word) = lower(input.text))
        OR (
          ${direction} = 'viet-to-tay'
          AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements(vocabulary.meanings) AS meaning
            CROSS JOIN LATERAL jsonb_array_elements_text(
              CASE
                WHEN jsonb_typeof(meaning.value->'definitions') = 'array'
                THEN meaning.value->'definitions'
                ELSE '[]'::jsonb
              END
            ) AS definition(value)
            WHERE lower(definition.value) = lower(input.text)
          )
        )
      )
    ORDER BY input.index, vocabulary.word
  `;

  return rows.map((row) => ({
    index: Number(row.index),
    entry: parseVocabularyEntry(row),
  }));
}

export async function addVocabularyEntry(
  entry: Omit<VocabularyEntry, 'id' | 'meanings'>,
): Promise<VocabularyEntry> {
  if (entry.sourceLanguage !== 'tay') {
    throw new Error('Only Tày vocabulary is currently available in the database.');
  }

  const meanings: VocabularyMeaning[] = [{
    part_of_speech: entry.partOfSpeech || undefined,
    definitions: [entry.meaning],
    example: entry.example || undefined,
  }];
  const rows = await sql`
    INSERT INTO vocabulary (word, language, meanings)
    VALUES (${entry.sourceTerm}, ${entry.sourceLanguage}, ${JSON.stringify(meanings)}::jsonb)
    ON CONFLICT (word) DO UPDATE
    SET language = EXCLUDED.language,
        meanings = EXCLUDED.meanings
    RETURNING word, language, meanings
  `;

  const saved = rows[0];
  if (!saved) {
    throw new Error('Database did not return the saved vocabulary entry.');
  }
  return parseVocabularyEntry(saved);
}
