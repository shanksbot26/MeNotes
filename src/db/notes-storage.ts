import AsyncStorage from '@react-native-async-storage/async-storage';
import { Note, CreateNoteInput, UpdateNoteInput } from './types';
import { generateId } from '@/utils/id';

const STORAGE_KEY = '@menotes_data_v1';

/**
 * Low-level storage repository for notes.
 * Provides abstraction so storage engine can easily be swapped or extended.
 */
export const NotesStorage = {
  /**
   * Retrieve all notes from storage.
   */
  async getAllNotes(): Promise<Note[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Failed to load notes from storage:', error);
      return [];
    }
  },

  /**
   * Save the full notes array to storage.
   */
  async saveAllNotes(notes: Note[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch (error) {
      console.error('Failed to save notes to storage:', error);
      throw error;
    }
  },

  /**
   * Create a new note and persist it.
   */
  async createNote(input: CreateNoteInput): Promise<Note> {
    const notes = await this.getAllNotes();
    const now = Date.now();
    const newNote: Note = {
      id: generateId(),
      title: input.title.trim(),
      content: input.content.trim(),
      color: input.color,
      tags: input.tags || [],
      isPinned: input.isPinned ?? false,
      createdAt: now,
      updatedAt: now,
    };

    const updated = [newNote, ...notes];
    await this.saveAllNotes(updated);
    return newNote;
  },

  /**
   * Update an existing note by ID.
   */
  async updateNote(id: string, updates: UpdateNoteInput): Promise<Note | null> {
    const notes = await this.getAllNotes();
    const index = notes.findIndex((n) => n.id === id);
    if (index === -1) return null;

    const existing = notes[index];
    const updatedNote: Note = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };

    notes[index] = updatedNote;
    await this.saveAllNotes(notes);
    return updatedNote;
  },

  /**
   * Delete a note by ID.
   */
  async deleteNote(id: string): Promise<boolean> {
    const notes = await this.getAllNotes();
    const filtered = notes.filter((n) => n.id !== id);
    if (filtered.length === notes.length) return false;

    await this.saveAllNotes(filtered);
    return true;
  },

  /**
   * Toggle pinned state for a note.
   */
  async togglePin(id: string): Promise<Note | null> {
    const notes = await this.getAllNotes();
    const index = notes.findIndex((n) => n.id === id);
    if (index === -1) return null;

    const target = notes[index];
    const updatedNote: Note = {
      ...target,
      isPinned: !target.isPinned,
      updatedAt: Date.now(),
    };

    notes[index] = updatedNote;
    await this.saveAllNotes(notes);
    return updatedNote;
  },

  /**
   * Clear all stored notes (useful for testing or reset).
   */
  async clearAll(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
};

