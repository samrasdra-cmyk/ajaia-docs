import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './database.js';

const app = express();
const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const uploadDirectory = process.env.UPLOAD_DIR || path.join(currentDirectory, 'uploads');
fs.mkdirSync(uploadDirectory, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// --- Users (for sharing) ---
app.get('/api/users', (req, res) => {
  const users = db.prepare('SELECT id, name FROM users').all();
  res.json(users);
});

// --- Documents (owned + shared) ---
app.get('/api/documents', (req, res) => {
  const userId = parseInt(req.query.userId);
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  const documents = db.prepare(`
    SELECT d.* FROM documents d
    WHERE d.owner_id = ?
    UNION
    SELECT d.* FROM documents d
    INNER JOIN shares s ON d.id = s.doc_id
    WHERE s.user_id = ?
  `).all(userId, userId);
  res.json(documents);
});

// --- Create document ---
app.post('/api/documents', (req, res) => {
  const { title, content, ownerId } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO documents (id, title, content, owner_id) VALUES (?, ?, ?, ?)')
    .run(id, title || 'Untitled', content || '{}', ownerId);
  res.json({ id });
});

// --- Update document ---
app.put('/api/documents/:id', (req, res) => {
  const { title, content } = req.body;
  const { id } = req.params;
  db.prepare('UPDATE documents SET title = COALESCE(?, title), content = COALESCE(?, content) WHERE id = ?')
    .run(title, content, id);
  res.json({ success: true });
});

// --- Share document ---
app.post('/api/documents/:id/share', (req, res) => {
  const { id } = req.params;
  const { targetUserId } = req.body;
  db.prepare('INSERT OR IGNORE INTO shares (doc_id, user_id) VALUES (?, ?)')
    .run(id, targetUserId);
  res.json({ success: true });
});

// --- File upload (only .txt) ---
const upload = multer({ dest: uploadDirectory });
app.post('/api/upload', upload.single('file'), (req, res) => {
  const { ownerId } = req.body;
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  const content = fs.readFileSync(file.path, 'utf8');
  fs.unlinkSync(file.path);

  const id = uuidv4();
  const title = file.originalname.replace(/\.[^.]+$/, '');
  const paragraphs = content.split('\n').filter(p => p.trim() !== '');
  const jsonContent = JSON.stringify({
    type: 'doc',
    content: paragraphs.map(p => ({
      type: 'paragraph',
      content: [{ type: 'text', text: p }]
    }))
  });

  db.prepare('INSERT INTO documents (id, title, content, owner_id) VALUES (?, ?, ?, ?)')
    .run(id, title, jsonContent, ownerId);
  res.json({ id });
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  app.listen(PORT, '0.0.0.0', () => console.log(`Backend running on port ${PORT}`));
}

export default app;
