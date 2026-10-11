import type { DictionaryEntry, SourceLanguage } from '@/types/dictionary';

const requiredColumns = ['source_language', 'source_term', 'meaning'];
function parseRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let quoteClosed = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    if (quoted) {
      if (character === '"' && csv[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
        quoteClosed = true;
      } else {
        field += character;
      }
    } else if (quoteClosed && character !== ',' && character !== '\r' && character !== '\n') {
      throw new Error('Tệp CSV có nội dung không hợp lệ sau dấu ngoặc kép.');
    } else if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
      quoteClosed = false;
    } else if (character === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      quoteClosed = false;
    } else if (character !== '\r') {
      if (character === '"') throw new Error('Tệp CSV có dấu ngoặc kép không hợp lệ.');
      field += character;
    }
  }

  if (quoted) throw new Error('CSV có dấu ngoặc kép chưa được đóng.');
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim()));
}

function parseSourceLanguage(value: string, row: number): SourceLanguage {
  const normalized = value.trim().toLocaleLowerCase();
  if (normalized === 'tay' || normalized === 'tày') return 'tay';
  if (normalized === 'muong' || normalized === 'mường') return 'muong';
  throw new Error(`Dòng ${row}: source_language phải là "tay" (Tày) hoặc "muong" (Mường).`);
}

export function parseDictionaryCsv(csv: string): Omit<DictionaryEntry, 'id'>[] {
  const rows = parseRows(csv.replace(/^\uFEFF/, ''));
  if (rows.length < 2) throw new Error('Tệp CSV cần có hàng tiêu đề và ít nhất một mục từ.');

  const headers = rows[0].map((header) => header.trim().toLocaleLowerCase());
  if (new Set(headers).size !== headers.length) throw new Error('Tệp CSV không được có tên cột trùng nhau.');
  const missingColumns = requiredColumns.filter((column) => !headers.includes(column));
  if (missingColumns.length) {
    throw new Error(`Thiếu cột bắt buộc: ${missingColumns.join(', ')}.`);
  }

  const columnIndex = (column: string) => headers.indexOf(column);
  const sourceLanguageIndex = columnIndex('source_language');
  const sourceTermIndex = columnIndex('source_term');
  const meaningIndex = columnIndex('meaning');
  const partOfSpeechIndex = columnIndex('part_of_speech');
  const exampleIndex = columnIndex('example');

  return rows.slice(1).map((cells, index) => {
    const rowNumber = index + 2;
    if (cells.length > headers.length) throw new Error(`Dòng ${rowNumber}: có nhiều ô hơn số cột tiêu đề.`);
    const value = (position: number) => position < 0 ? '' : (cells[position] ?? '').trim();
    const sourceTerm = value(sourceTermIndex);
    const meaning = value(meaningIndex);
    if (!sourceTerm || !meaning) throw new Error(`Dòng ${rowNumber}: từ và nghĩa không được để trống.`);

    return {
      sourceLanguage: parseSourceLanguage(value(sourceLanguageIndex), rowNumber),
      sourceTerm,
      meaning,
      partOfSpeech: value(partOfSpeechIndex),
      example: value(exampleIndex),
    };
  });
}
