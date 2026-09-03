import Database from 'better-sqlite3';
const db = new Database(process.env.DATABASE_PATH || 'database.sqlite');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE
  );
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    title TEXT,
    content TEXT,
    owner_id INTEGER,
    FOREIGN KEY (owner_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS shares (
    doc_id TEXT,
    user_id INTEGER,
    FOREIGN KEY (doc_id) REFERENCES documents(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    PRIMARY KEY (doc_id, user_id)
  );
  INSERT OR IGNORE INTO users (id, name) VALUES 
    (1, 'Alice'), (2, 'Bob'), (3, 'Charlie');
`);

export default db;
