import { spawn } from 'child_process';
import path from 'path';

const PYTHON_SCRIPT = path.resolve(__dirname, '../../linkedin_bridge.py');

function runPython(method: string, args: Record<string, any>, userId: number, timeout = 30000): Promise<any> {
  return new Promise((resolve, reject) => {
    const input = JSON.stringify({
      method,
      args,
      user_id: String(userId),
    });

    const proc = spawn('python', [PYTHON_SCRIPT], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let timer: NodeJS.Timeout;

    if (timeout > 0) {
      timer = setTimeout(() => {
        proc.kill();
        reject(new Error('Operation timed out'));
      }, timeout);
    }

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      clearTimeout(timer!);
      // Try to parse the LAST JSON line (browser_login prints status then result)
      const lines = stdout.trim().split('\n').filter(Boolean);
      const lastLine = lines[lines.length - 1] || '';

      if (code !== 0 && !lastLine) {
        reject(new Error(`LinkedIn bridge error: ${stderr.slice(0, 500)}`));
        return;
      }
      try {
        const result = JSON.parse(lastLine);
        if (result.error && !result.ok) {
          reject(new Error(result.error));
        } else {
          resolve(result);
        }
      } catch {
        reject(new Error(`Failed to parse: ${lastLine.slice(0, 200)}`));
      }
    });

    proc.stdin.write(input);
    proc.stdin.end();
  });
}

export async function browserLogin(userId: number): Promise<{ ok: boolean; name?: string; error?: string }> {
  try {
    return await runPython('browser_login', {}, userId, 150000); // 2.5 min timeout for manual login
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export async function checkSession(userId: number): Promise<{ authenticated: boolean; name?: string }> {
  try {
    return await runPython('check_session', {}, userId, 15000);
  } catch {
    return { authenticated: false };
  }
}

export async function logoutLinkedIn(userId: number): Promise<void> {
  await runPython('logout', {}, userId);
}

export async function searchJobs(userId: number, params: {
  keywords?: string;
  location_name?: string;
  experience?: string[];
  job_type?: string[];
  remote?: string[];
  limit?: number;
}): Promise<any[]> {
  return runPython('search_jobs', params, userId, 30000);
}

export async function getJob(userId: number, jobId: string): Promise<any> {
  return runPython('get_job', { job_id: jobId }, userId, 15000);
}

export async function getJobSkills(userId: number, jobId: string): Promise<any> {
  return runPython('get_job_skills', { job_id: jobId }, userId, 15000);
}

export async function easyApply(userId: number, jobId: string, answers?: Record<string, string>): Promise<any> {
  return runPython('easy_apply', { job_id: jobId, answers: answers || {} }, userId, 120000);
}
