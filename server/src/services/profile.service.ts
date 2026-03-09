import fs from 'fs';
import db from '../db/connection';
import { Profile } from '../types';

export function getProfile(userId: number): Profile | null {
  return db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId) as Profile | null;
}

export function updateAdditionalInfo(userId: number, info: string) {
  db.prepare('UPDATE profiles SET additional_info = ?, updated_at = datetime(\'now\') WHERE user_id = ?').run(info, userId);
}

export async function updateCV(userId: number, file: Express.Multer.File) {
  let cvText = '';

  if (file.mimetype === 'application/pdf') {
    const pdfParse = (await import('pdf-parse')).default;
    const buffer = fs.readFileSync(file.path);
    const data = await pdfParse(buffer);
    cvText = data.text;
  } else {
    cvText = fs.readFileSync(file.path, 'utf-8');
  }

  db.prepare(
    'UPDATE profiles SET cv_filename = ?, cv_path = ?, cv_text = ?, updated_at = datetime(\'now\') WHERE user_id = ?'
  ).run(file.originalname, file.path, cvText, userId);

  return { filename: file.originalname, textLength: cvText.length };
}
