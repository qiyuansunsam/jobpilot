import fs from 'fs';
import db from '../db/connection';
import { Profile } from '../types';
import { config } from '../config';

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

export async function summarizeCV(userId: number): Promise<any> {
  const profile = getProfile(userId);
  if (!profile?.cv_text) {
    return null;
  }

  const prompt = `Analyze this CV/resume and extract structured information. Return ONLY valid JSON with this exact schema (no markdown, no code fences):

{
  "name": "Full Name",
  "headline": "Short professional headline (e.g. 'Senior Software Engineer | 5 years')",
  "summary": "2-3 sentence professional summary",
  "skills": ["skill1", "skill2", "skill3", ...],
  "experience": [
    { "title": "Job Title", "company": "Company", "duration": "e.g. 2020-2023", "highlights": "1 sentence" }
  ],
  "education": [
    { "degree": "Degree", "school": "School Name", "year": "Year or range" }
  ],
  "languages": ["Language1", "Language2"],
  "certifications": ["Cert1", "Cert2"],
  "contact": { "email": "", "phone": "", "location": "" }
}

If a section has no data, use an empty array []. Keep skills to top 10-12. Keep experience entries to top 3-4 most recent. Be concise.

CV TEXT:
${profile.cv_text.slice(0, 6000)}`;

  let res: Response;
  try {
    res = await fetch(`${config.claudeProxyUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4',
        messages: [
          { role: 'system', content: 'You are a CV parser. Return only valid JSON, no markdown.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 2048,
      }),
    });
  } catch (e: any) {
    throw new Error(`Claude proxy unreachable: ${e.message}`);
  }

  if (!res.ok) {
    throw new Error(`Claude proxy error: ${res.status}`);
  }

  const data: any = await res.json();
  const text = data.choices?.[0]?.message?.content || '';

  // Extract JSON from response (handle potential markdown fences)
  let jsonStr = text.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) jsonStr = fenceMatch[1].trim();

  return JSON.parse(jsonStr);
}
