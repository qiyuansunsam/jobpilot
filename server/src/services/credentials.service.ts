import db from '../db/connection';
import { encrypt, decrypt } from '../utils/crypto';

interface CredRow {
  id: number;
  user_id: number;
  platform: string;
  encrypted_email: string;
  encrypted_pass: string;
  iv: string;
  auth_tag: string;
  pass_iv: string | null;
  pass_auth_tag: string | null;
  created_at: string;
}

export function getCredentials(userId: number, platform = 'linkedin'): { email: string } | null {
  const row = db.prepare(
    'SELECT * FROM platform_credentials WHERE user_id = ? AND platform = ?'
  ).get(userId, platform) as CredRow | undefined;

  if (!row) return null;
  const email = decrypt(row.encrypted_email, row.iv, row.auth_tag);
  return { email };
}

export function getDecryptedCredentials(userId: number, platform = 'linkedin'): { email: string; password: string } | null {
  const row = db.prepare(
    'SELECT * FROM platform_credentials WHERE user_id = ? AND platform = ?'
  ).get(userId, platform) as CredRow | undefined;

  if (!row) return null;
  const email = decrypt(row.encrypted_email, row.iv, row.auth_tag);
  const password = decrypt(row.encrypted_pass, row.pass_iv || row.iv, row.pass_auth_tag || row.auth_tag);
  return { email, password };
}

export function upsertCredentials(userId: number, email: string, password: string, platform = 'linkedin') {
  const encEmail = encrypt(email);
  const encPass = encrypt(password);

  const existing = db.prepare(
    'SELECT id FROM platform_credentials WHERE user_id = ? AND platform = ?'
  ).get(userId, platform);

  if (existing) {
    db.prepare(`
      UPDATE platform_credentials
      SET encrypted_email = ?, encrypted_pass = ?, iv = ?, auth_tag = ?, pass_iv = ?, pass_auth_tag = ?
      WHERE user_id = ? AND platform = ?
    `).run(encEmail.ciphertext, encPass.ciphertext, encEmail.iv, encEmail.authTag, encPass.iv, encPass.authTag, userId, platform);
  } else {
    db.prepare(`
      INSERT INTO platform_credentials (user_id, platform, encrypted_email, encrypted_pass, iv, auth_tag, pass_iv, pass_auth_tag)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, platform, encEmail.ciphertext, encPass.ciphertext, encEmail.iv, encEmail.authTag, encPass.iv, encPass.authTag);
  }
}
