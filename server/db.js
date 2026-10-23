const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'menotes.db');
const db = new DatabaseSync(dbPath);

// Enable WAL mode for high performance concurrency
db.exec('PRAGMA journal_mode = WAL;');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    isPinned INTEGER DEFAULT 0,
    isLocked INTEGER DEFAULT 0,
    color TEXT,
    tags TEXT,
    deletedAt INTEGER DEFAULT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_notes_updatedAt ON notes(updatedAt);
  CREATE INDEX IF NOT EXISTS idx_notes_deletedAt ON notes(deletedAt);
`);

/**
 * Format database row into Note object.
 */
function formatRow(row) {
  if (!row) return null;
  let parsedTags = [];
  try {
    parsedTags = row.tags ? JSON.parse(row.tags) : [];
  } catch (e) {
    parsedTags = [];
  }

  return {
    id: row.id,
    title: row.title,
    content: row.content,
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
    isPinned: Boolean(row.isPinned),
    isLocked: Boolean(row.isLocked),
    color: row.color || undefined,
    tags: parsedTags,
    deletedAt: row.deletedAt ? Number(row.deletedAt) : undefined,
  };
}

const getNoteStmt = db.prepare('SELECT * FROM notes WHERE id = ?');
const getAllActiveNotesStmt = db.prepare('SELECT * FROM notes WHERE deletedAt IS NULL ORDER BY isPinned DESC, updatedAt DESC');
const getNotesUpdatedSinceStmt = db.prepare('SELECT * FROM notes WHERE updatedAt > ? ORDER BY updatedAt ASC');

const upsertNoteStmt = db.prepare(`
  INSERT INTO notes (id, title, content, createdAt, updatedAt, isPinned, isLocked, color, tags, deletedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    title = excluded.title,
    content = excluded.content,
    updatedAt = excluded.updatedAt,
    isPinned = excluded.isPinned,
    isLocked = excluded.isLocked,
    color = excluded.color,
    tags = excluded.tags,
    deletedAt = excluded.deletedAt
`);

/**
 * Batch synchronization between client notes and server database.
 * Uses Last-Write-Wins (LWW) conflict resolution and handles deletedAt tombstones.
 */
function syncNotes(clientNotes = [], lastSyncTimestamp = 0) {
  const now = Date.now();

  // 1. Process client notes against server records
  for (const clientNote of clientNotes) {
    const existing = getNoteStmt.get(clientNote.id);

    if (!existing) {
      // Server does not have this note -> insert it
      upsertNoteStmt.run(
        clientNote.id,
        clientNote.title || 'Tanpa Judul',
        clientNote.content || '',
        clientNote.createdAt || now,
        clientNote.updatedAt || now,
        clientNote.isPinned ? 1 : 0,
        clientNote.isLocked ? 1 : 0,
        clientNote.color || null,
        JSON.stringify(clientNote.tags || []),
        clientNote.deletedAt ? clientNote.deletedAt : null
      );
    } else {
      // Note exists -> apply Last-Write-Wins (LWW)
      const serverUpdatedAt = Number(existing.updatedAt);
      const clientUpdatedAt = Number(clientNote.updatedAt || 0);

      if (clientUpdatedAt > serverUpdatedAt) {
        upsertNoteStmt.run(
          clientNote.id,
          clientNote.title || 'Tanpa Judul',
          clientNote.content || '',
          existing.createdAt,
          clientUpdatedAt,
          clientNote.isPinned ? 1 : 0,
          clientNote.isLocked ? 1 : 0,
          clientNote.color || null,
          JSON.stringify(clientNote.tags || []),
          clientNote.deletedAt ? clientNote.deletedAt : null
        );
      }
    }
  }

  // 2. Fetch all notes modified after lastSyncTimestamp or all active notes if fresh sync
  const serverRows = lastSyncTimestamp > 0
    ? getNotesUpdatedSinceStmt.all(lastSyncTimestamp)
    : getAllActiveNotesStmt.all();

  const formattedNotes = serverRows.map(formatRow);

  return {
    notes: formattedNotes,
    syncTimestamp: now,
  };
}

module.exports = {
  db,
  syncNotes,
  getAllActiveNotes: () => getAllActiveNotesStmt.all().map(formatRow),
};

