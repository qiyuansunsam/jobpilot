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

export async function credentialLogin(userId: number, email: string, password: string): Promise<{ ok: boolean; name?: string; headline?: string; error?: string }> {
  try {
    return await runPython('credential_login', { email, password }, userId, 60000);
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

export function streamSearchJobs(userId: number, params: {
  keywords?: string;
  location_name?: string;
  experience?: string[];
  job_type?: string[];
  remote?: string[];
  limit?: number;
}, onJob: (job: any) => void, onDone: () => void, onError: (err: Error) => void): () => void {
  const input = JSON.stringify({
    method: 'search_jobs',
    args: params,
    user_id: String(userId),
  });

  const proc = spawn('python', ['-u', PYTHON_SCRIPT], { stdio: ['pipe', 'pipe', 'pipe'] });
  let buffer = '';
  let stderr = '';

  const timer = setTimeout(() => {
    proc.kill();
    onError(new Error('Search timed out'));
  }, 300000);

  proc.stdout.on('data', (d) => {
    buffer += d.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // keep incomplete line
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line);
        if (obj.done) {
          clearTimeout(timer);
          onDone();
        } else if (obj.error) {
          clearTimeout(timer);
          onError(new Error(obj.error));
        } else {
          onJob(obj);
        }
      } catch {}
    }
  });

  proc.stderr.on('data', (d) => { stderr += d.toString(); });

  proc.on('close', (code) => {
    clearTimeout(timer);
    // Process any remaining buffer
    if (buffer.trim()) {
      try {
        const obj = JSON.parse(buffer);
        if (obj.done) onDone();
        else if (obj.error) onError(new Error(obj.error));
        else onJob(obj);
      } catch {}
    }
    if (code !== 0 && stderr) {
      onError(new Error(stderr.slice(0, 500)));
    }
  });

  proc.stdin.write(input);
  proc.stdin.end();

  // Return kill function
  return () => { clearTimeout(timer); proc.kill(); };
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
