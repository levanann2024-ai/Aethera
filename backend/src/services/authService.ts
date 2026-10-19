import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sql } from '../config/db.js';
import { jwtSecret } from '../config/jwt.js';
import type { AuthenticatedUser, TargetLanguage } from '../models/authModel.js';

const PASSWORD_HASH_ROUNDS = 12;
const TOKEN_LIFETIME = '7d';

interface UserRow {
  id: number;
  email: string;
  full_name: string | null;
  password_hash: string | null;
  target_language: string | null;
}

function toAuthenticatedUser(row: UserRow): AuthenticatedUser {
  const targetLanguage = row.target_language ?? 'tay';
  if (!isTargetLanguage(targetLanguage)) {
    throw new Error('Database returned an unsupported target language.');
  }

  return {
    id: String(row.id),
    email: row.email,
    full_name: row.full_name ?? '',
    target_language: targetLanguage,
  };
}

export function isTargetLanguage(value: unknown): value is TargetLanguage {
  return value === 'tay'
    || value === 'muong'
    || value === 'hmong'
    || value === 'dao'
    || value === 'all';
}

function createToken(user: AuthenticatedUser): string {
  return jwt.sign({ sub: user.id }, jwtSecret, { expiresIn: TOKEN_LIFETIME });
}

export async function registerUser(
  fullName: string,
  email: string,
  password: string,
  targetLanguage: TargetLanguage,
): Promise<{ user: AuthenticatedUser; token: string }> {
  const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
  const rows = await sql`
    INSERT INTO users (full_name, email, password_hash, target_language)
    VALUES (${fullName}, ${email}, ${passwordHash}, ${targetLanguage})
    RETURNING id, email, full_name, target_language
  `;

  const row = rows[0] as Omit<UserRow, 'password_hash'> | undefined;
  if (!row) throw new Error('Database did not return the registered user.');

  const user = toAuthenticatedUser({ ...row, password_hash: null });
  return { user, token: createToken(user) };
}

export async function loginUser(
  email: string,
  password: string,
): Promise<{ user: AuthenticatedUser; token: string } | null> {
  const rows = await sql`
    SELECT id, email, full_name, password_hash, target_language
    FROM users
    WHERE lower(email) = ${email}
    LIMIT 1
  `;
  const row = rows[0] as UserRow | undefined;
  if (!row?.password_hash || !(await bcrypt.compare(password, row.password_hash))) {
    return null;
  }

  const user = toAuthenticatedUser(row);
  return { user, token: createToken(user) };
}

export async function getUserById(id: string): Promise<AuthenticatedUser | null> {
  const numericId = Number(id);
  if (!Number.isSafeInteger(numericId) || numericId < 1) return null;

  const rows = await sql`
    SELECT id, email, full_name, password_hash, target_language
    FROM users
    WHERE id = ${numericId}
    LIMIT 1
  `;
  const row = rows[0] as UserRow | undefined;
  return row ? toAuthenticatedUser(row) : null;
}

export async function updateUserTargetLanguage(
  id: string,
  targetLanguage: TargetLanguage,
): Promise<AuthenticatedUser | null> {
  const numericId = Number(id);
  if (!Number.isSafeInteger(numericId) || numericId < 1) return null;

  const rows = await sql`
    UPDATE users
    SET target_language = ${targetLanguage}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${numericId}
    RETURNING id, email, full_name, password_hash, target_language
  `;
  const row = rows[0] as UserRow | undefined;
  return row ? toAuthenticatedUser(row) : null;
}
