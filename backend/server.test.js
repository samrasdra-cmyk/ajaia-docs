import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from './server.js';

describe('Documents API', () => {
  it('creates a new document and returns an ID', async () => {
    const res = await request(app)
      .post('/api/documents')
      .send({ ownerId: 1, content: '{"type":"doc","content":[]}' });
    expect(res.status).toBe(200);
    expect(res.body.id).toBeDefined();
  });

  it('lists documents for a user', async () => {
    const res = await request(app).get('/api/documents?userId=1');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
