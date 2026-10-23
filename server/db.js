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
    pinHash TEXT DEFAULT NULL,
    color TEXT,
    tags TEXT,
    deletedAt INTEGER DEFAULT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_notes_updatedAt ON notes(updatedAt);
  CREATE INDEX IF NOT EXISTS idx_notes_deletedAt ON notes(deletedAt);
`);

// Migration: ensure pinHash column exists on existing databases
try {
  db.exec('ALTER TABLE notes ADD COLUMN pinHash TEXT DEFAULT NULL;');
} catch (e) {
  // column already exists
}

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
    pinHash: row.pinHash || undefined,
    color: row.color || undefined,
    tags: parsedTags,
    deletedAt: row.deletedAt ? Number(row.deletedAt) : undefined,
  };
}

const getNoteStmt = db.prepare('SELECT * FROM notes WHERE id = ?');
const getAllActiveNotesStmt = db.prepare('SELECT * FROM notes WHERE deletedAt IS NULL ORDER BY isPinned DESC, updatedAt DESC');
const getNotesUpdatedSinceStmt = db.prepare('SELECT * FROM notes WHERE updatedAt > ? ORDER BY updatedAt ASC');

const upsertNoteStmt = db.prepare(`
  INSERT INTO notes (id, title, content, createdAt, updatedAt, isPinned, isLocked, pinHash, color, tags, deletedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    title = excluded.title,
    content = excluded.content,
    updatedAt = excluded.updatedAt,
    isPinned = excluded.isPinned,
    isLocked = excluded.isLocked,
    pinHash = excluded.pinHash,
    color = excluded.color,
    tags = excluded.tags,
    deletedAt = excluded.deletedAt
`);

const deleteNoteStmt = db.prepare(`
  UPDATE notes SET deletedAt = ?, updatedAt = ? WHERE id = ?
`);

/**
 * Create a new note directly in SQLite.
 */
function createNote(data) {
  const now = Date.now();
  const id = data.id || `note-${now}-${Math.random().toString(36).substr(2, 9)}`;
  const title = (data.title !== undefined ? data.title : '').trim() || 'Tanpa Judul';
  const content = data.content !== undefined ? data.content : '';
  const isPinned = data.isPinned ? 1 : 0;
  const isLocked = data.isLocked ? 1 : 0;
  const pinHash = data.pinHash || null;
  const color = data.color || null;
  const tags = JSON.stringify(data.tags || []);
  const createdAt = data.createdAt || now;
  const updatedAt = data.updatedAt || now;

  upsertNoteStmt.run(id, title, content, createdAt, updatedAt, isPinned, isLocked, pinHash, color, tags, null);
  const row = getNoteStmt.get(id);
  return formatRow(row);
}

/**
 * Update an existing note in SQLite.
 */
function updateNote(id, data) {
  const existing = getNoteStmt.get(id);
  const now = Date.now();

  const title = data.title !== undefined ? data.title.trim() || 'Tanpa Judul' : (existing ? existing.title : 'Tanpa Judul');
  const content = data.content !== undefined ? data.content : (existing ? existing.content : '');
  const isPinned = data.isPinned !== undefined ? (data.isPinned ? 1 : 0) : (existing ? existing.isPinned : 0);
  const isLocked = data.isLocked !== undefined ? (data.isLocked ? 1 : 0) : (existing ? existing.isLocked : 0);
  const pinHash = data.pinHash !== undefined ? data.pinHash : (existing ? existing.pinHash : null);
  const color = data.color !== undefined ? data.color : (existing ? existing.color : null);
  const tags = data.tags !== undefined ? JSON.stringify(data.tags) : (existing ? existing.tags : '[]');
  const createdAt = existing ? Number(existing.createdAt) : now;
  const updatedAt = now;

  upsertNoteStmt.run(id, title, content, createdAt, updatedAt, isPinned, isLocked, pinHash, color, tags, null);
  const row = getNoteStmt.get(id);
  return formatRow(row);
}

/**
 * Mark a note as deleted in SQLite (soft delete).
 */
function deleteNote(id) {
  const now = Date.now();
  deleteNoteStmt.run(now, now, id);
  return { id, deletedAt: now };
}

/**
 * Get note by ID.
 */
function getNote(id) {
  const row = getNoteStmt.get(id);
  if (!row || row.deletedAt) return null;
  return formatRow(row);
}

/**
 * Batch synchronization between client notes and server database.
 */
function syncNotes(clientNotes = [], lastSyncTimestamp = 0) {
  const now = Date.now();

  for (const clientNote of clientNotes) {
    const existing = getNoteStmt.get(clientNote.id);

    if (!existing) {
      upsertNoteStmt.run(
        clientNote.id,
        clientNote.title || 'Tanpa Judul',
        clientNote.content || '',
        clientNote.createdAt || now,
        clientNote.updatedAt || now,
        clientNote.isPinned ? 1 : 0,
        clientNote.isLocked ? 1 : 0,
        clientNote.pinHash || null,
        clientNote.color || null,
        JSON.stringify(clientNote.tags || []),
        clientNote.deletedAt ? clientNote.deletedAt : null
      );
    } else {
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
          clientNote.pinHash !== undefined ? clientNote.pinHash : existing.pinHash,
          clientNote.color || null,
          JSON.stringify(clientNote.tags || []),
          clientNote.deletedAt ? clientNote.deletedAt : null
        );
      }
    }
  }

  const serverRows = lastSyncTimestamp > 0
    ? getNotesUpdatedSinceStmt.all(lastSyncTimestamp)
    : getAllActiveNotesStmt.all();

  return {
    notes: serverRows.map(formatRow),
    syncTimestamp: now,
  };
}

module.exports = {
  db,
  createNote,
  updateNote,
  deleteNote,
  getNote,
  getAllActiveNotes: () => getAllActiveNotesStmt.all().map(formatRow),
  syncNotes,
};
