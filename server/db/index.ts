import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { seedDatabase } from './seed.js';

export function openDatabase(databasePath: string, seed = true) {
  if (databasePath !== ':memory:')
    mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec(`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE, password TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS employees (id INTEGER PRIMARY KEY, fullName TEXT NOT NULL, position TEXT NOT NULL, department TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS migrations (name TEXT PRIMARY KEY);`);
  if (seed) seedDatabase(db);
  return db;
}
