import db from '../db/connection';
import { JobPreferences } from '../types';

export function getPreferences(userId: number): JobPreferences | null {
  return db.prepare('SELECT * FROM job_preferences WHERE user_id = ?').get(userId) as JobPreferences | null;
}

export function updatePreferences(userId: number, prefs: {
  job_titles: string[];
  locations: string[];
  salary_min: number | null;
  salary_max: number | null;
  experience: string | null;
  industries: string[];
}) {
  db.prepare(`
    UPDATE job_preferences
    SET job_titles = ?, locations = ?, salary_min = ?, salary_max = ?,
        experience = ?, industries = ?, updated_at = datetime('now')
    WHERE user_id = ?
  `).run(
    JSON.stringify(prefs.job_titles),
    JSON.stringify(prefs.locations),
    prefs.salary_min,
    prefs.salary_max,
    prefs.experience,
    JSON.stringify(prefs.industries),
    userId
  );
}
