import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  encryptionKey: process.env.ENCRYPTION_KEY || 'a'.repeat(64),
  claudeProxyUrl: process.env.CLAUDE_PROXY_URL || 'http://127.0.0.1:3456',
  linkedinCookie: process.env.LINKEDIN_LI_AT || '',
  linkedinJsessionid: process.env.LINKEDIN_JSESSIONID || '',
  uploadsDir: path.resolve(__dirname, '../../uploads'),
  dbPath: path.resolve(__dirname, '../../jobpilot.db'),
};
