import db from '../db/connection';
import { Application } from '../types';

export function getApplications(userId: number): Application[] {
  return db.prepare(
    'SELECT * FROM applications WHERE user_id = ? ORDER BY created_at DESC'
  ).all(userId) as Application[];
}

export function getApplication(userId: number, appId: number): Application | null {
  return db.prepare(
    'SELECT * FROM applications WHERE id = ? AND user_id = ?'
  ).get(appId, userId) as Application | null;
}

export function createApplication(userId: number, data: {
  job_title: string;
  company?: string;
  job_url?: string;
  job_description: string;
  generated_cover?: string;
  generated_answers?: string;
}): Application {
  const stmt = db.prepare(`
    INSERT INTO applications (user_id, job_title, company, job_url, job_description, generated_cover, generated_answers)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    userId,
    data.job_title,
    data.company || null,
    data.job_url || null,
    data.job_description,
    data.generated_cover || null,
    data.generated_answers || null
  );
  return db.prepare('SELECT * FROM applications WHERE id = ?').get(result.lastInsertRowid) as Application;
}

export function updateApplicationStatus(userId: number, appId: number, status: string) {
  const appliedAt = status === 'applied' ? new Date().toISOString() : null;
  db.prepare(`
    UPDATE applications SET status = ?, applied_at = COALESCE(?, applied_at) WHERE id = ? AND user_id = ?
  `).run(status, appliedAt, appId, userId);
}
