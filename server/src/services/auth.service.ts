import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db/connection';
import { config } from '../config';
import { User, JwtPayload } from '../types';

export function createUser(username: string, password: string): User {
  const hash = bcrypt.hashSync(password, 12);
  const stmt = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
  const result = stmt.run(username, hash);

  // Also create empty profile and preferences
  db.prepare('INSERT INTO profiles (user_id) VALUES (?)').run(result.lastInsertRowid);
  db.prepare('INSERT INTO job_preferences (user_id) VALUES (?)').run(result.lastInsertRowid);

  return db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid) as User;
}

export function authenticateUser(username: string, password: string): User | null {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined;
  if (!user) return null;
  if (!bcrypt.compareSync(password, user.password_hash)) return null;
  return user;
}

export function signToken(user: User): string {
  const payload: JwtPayload = { userId: user.id, username: user.username };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });
}
