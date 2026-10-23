require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { syncNotes, getAllActiveNotes } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const SYNC_SECRET = process.env.SYNC_SECRET ? process.env.SYNC_SECRET.trim() : null;

app.use(cors());
app.use(express.json({ limit: '15mb' }));

// Authentication middleware for sync endpoints
function authMiddleware(req, res, next) {
  if (!SYNC_SECRET) {
    return next(); // No secret configured -> open sync
  }

  const clientSecret = req.headers['x-sync-secret'] || req.headers['authorization'];
  if (!clientSecret || clientSecret !== SYNC_SECRET) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Token sinkronisasi (SYNC_SECRET) tidak valid atau belum diisi.',
    });
  }

  next();
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    server: 'MeNotes Self-Hosted Sync Server',
    version: '1.0.0',
    authRequired: Boolean(SYNC_SECRET),
    timestamp: Date.now(),
  });
});

// Get all active notes from server
app.get('/api/notes', authMiddleware, (req, res) => {
  try {
    const notes = getAllActiveNotes();
    res.json({ notes, timestamp: Date.now() });
  } catch (err) {
    console.error('Error fetching notes:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// Two-way batch synchronization endpoint
app.post('/api/sync', authMiddleware, (req, res) => {
  try {
    const { clientNotes = [], lastSyncTimestamp = 0 } = req.body;

    const result = syncNotes(clientNotes, Number(lastSyncTimestamp) || 0);

    res.json({
      success: true,
      serverNotes: result.notes,
      syncTimestamp: result.syncTimestamp,
    });
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ error: 'Sync failed', details: err.message });
  }
});

// Serve frontend static web bundle if present (Docker / Production deployment)
const distCandidates = [
  path.join(__dirname, '../dist'),
  path.join(__dirname, 'dist'),
  path.join(__dirname, 'public'),
];

let publicDir = null;
for (const cand of distCandidates) {
  if (fs.existsSync(cand) && fs.existsSync(path.join(cand, 'index.html'))) {
    publicDir = cand;
    break;
  }
}

if (publicDir) {
  console.log(`Serving static web app from: ${publicDir}`);
  app.use(express.static(publicDir));

  // SPA fallback for client-side routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>MeNotes Sync Server</title>
          <style>
            body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; text-align: center; }
            .card { max-width: 500px; margin: 40px auto; background: #1e293b; padding: 30px; border-radius: 16px; border: 1px solid #334155; }
            h1 { color: #10b981; margin-bottom: 8px; }
            p { color: #94a3b8; line-height: 1.6; }
            .badge { display: inline-block; padding: 4px 12px; background: rgba(16, 185, 129, 0.2); color: #4ade80; border-radius: 20px; font-size: 13px; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">API Ready</span>
            <h1>MeNotes Sync Server</h1>
            <p>Server sinkronisasi mandiri aktif dan berjalan lancar.</p>
            <p style="font-size: 13px;">Gunakan URL server ini pada menu Pengaturan (Settings) di aplikasi MeNotes.</p>
          </div>
        </body>
      </html>
    `);
  });
}

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`MeNotes Server is running on http://0.0.0.0:${PORT}`);
});

module.exports = { app, server };

