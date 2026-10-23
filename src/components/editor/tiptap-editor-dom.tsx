'use dom';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Placeholder from '@tiptap/extension-placeholder';
import type { DOMProps } from 'expo/dom';

import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Quote,
  Code,
  ListTodo,
  Table as TableIcon,
  Palette,
  Highlighter,
  Columns,
  Rows,
  Trash2,
  PaintBucket,
} from 'lucide-react';

import './tiptap-editor.css';

interface TiptapEditorDomProps {
  noteId?: string;
  initialContent?: string;
  isDarkMode?: boolean;
  onContentChange?: (html: string) => Promise<void> | void;
  dom?: DOMProps;
}

const TEXT_COLORS = [
  { label: 'Default', value: 'inherit', color: '#64748b' },
  { label: 'Hitam/Putih', value: 'currentColor', color: '#0f172a' },
  { label: 'Merah', value: '#ef4444', color: '#ef4444' },
  { label: 'Biru', value: '#3b82f6', color: '#3b82f6' },
  { label: 'Hijau', value: '#10b981', color: '#10b981' },
  { label: 'Kuning/Oranye', value: '#f59e0b', color: '#f59e0b' },
  { label: 'Ungu', value: '#8b5cf6', color: '#8b5cf6' },
];

const HIGHLIGHT_COLORS = [
  { label: 'Kuning', value: '#fef08a' },
  { label: 'Hijau', value: '#bbf7d0' },
  { label: 'Biru', value: '#bae6fd' },
  { label: 'Pink', value: '#fbcfe8' },
  { label: 'Oranye', value: '#fed7aa' },
];

const TABLE_CELL_COLORS = [
  { label: 'Bening (Default)', value: '' },
  { label: 'Abu-abu', value: '#f1f5f9', darkValue: '#334155' },
  { label: 'Hijau Muda', value: '#dcfce7', darkValue: '#064e3b' },
  { label: 'Biru Muda', value: '#dbeafe', darkValue: '#1e3a8a' },
  { label: 'Kuning Muda', value: '#fef3c7', darkValue: '#78350f' },
  { label: 'Merah Muda', value: '#fee2e2', darkValue: '#7f1d1d' },
  { label: 'Ungu Muda', value: '#f3e8ff', darkValue: '#581c87' },
];

// Extend TableCell and TableHeader to support backgroundColor attribute
const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: (element) => element.style.backgroundColor || null,
        renderHTML: (attributes) => {
          if (!attributes.backgroundColor) {
            return {};
          }
          return {
            style: `background-color: ${attributes.backgroundColor}`,
          };
        },
      },
    };
  },
});

const CustomTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: (element) => element.style.backgroundColor || null,
        renderHTML: (attributes) => {
          if (!attributes.backgroundColor) {
            return {};
          }
          return {
            style: `background-color: ${attributes.backgroundColor}`,
          };
        },
      },
    };
  },
});

export default function TiptapEditorDom({
  noteId,
  initialContent = '',
  isDarkMode = false,
  onContentChange,
}: TiptapEditorDomProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showTableColorPicker, setShowTableColorPicker] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeNoteIdRef = useRef<string | null>(null);

  const handleUpdate = useCallback(
    (html: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        onContentChange?.(html);
      }, 300);
    },
    [onContentChange]
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Table.configure({
        resizable: false,
      }),
      TableRow,
      CustomTableHeader,
      CustomTableCell,
      Placeholder.configure({
        placeholder: 'Mulai menulis catatan di sini...',
      }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      handleUpdate(html);
    },
  });

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Synchronize content ONLY when switching to a different note (based on noteId)
  // This prevents resetting cursor position, checkboxes, or table selections while typing!
  useEffect(() => {
    if (editor && noteId) {
      if (activeNoteIdRef.current !== noteId) {
        activeNoteIdRef.current = noteId;
        editor.commands.setContent(initialContent || '');
      }
    }
  }, [editor, noteId, initialContent]);

  if (!editor) {
    return (
      <div
        className={`tiptap-wrapper ${isDarkMode ? 'dark-theme' : ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
        }}
      >
        <span style={{ fontSize: 14, color: '#94a3b8' }}>Memuat editor...</span>
      </div>
    );
  }

  // Handle setting table cell color
  const setCellColor = (color: string) => {
    if (!color) {
      (editor.chain().focus() as any).setCellAttribute('backgroundColor', null).run();
    } else {
      (editor.chain().focus() as any).setCellAttribute('backgroundColor', color).run();
    }
    setShowTableColorPicker(false);
  };

  // Helper to keep ProseMirror focus when clicking toolbar buttons
  const preventBlur = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const isTableActive = editor.isActive('table');

  return (
    <div
      className={`tiptap-wrapper ${isDarkMode ? 'dark-theme' : ''}`}
      onClick={() => {
        setShowColorPicker(false);
        setShowHighlightPicker(false);
        setShowTableColorPicker(false);
      }}
    >
      {/* Complete Responsive Toolbar with onMouseDown preventBlur */}
      <div className="tiptap-toolbar" onClick={(e) => e.stopPropagation()}>
        {/* Headings */}
        <div className="toolbar-group">
          <button
            type="button"
            className={`toolbar-btn ${editor.isActive('paragraph') ? 'is-active' : ''}`}
            onMouseDown={preventBlur}
            onClick={() => editor.chain().focus().setParagraph().run()}
            title="Paragraf"
          >
            <Pilcrow size={16} />
          </button>
          <button
            type="button"
            className={`toolbar-btn ${editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}`}
            onMouseDown={preventBlur}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            title="Heading 1"
          >
            <Heading1 size={16} />
          </button>
          <button
            type="button"
            className={`toolbar-btn ${editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}`}
            onMouseDown={preventBlur}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Heading 2"
          >
            <Heading2 size={16} />
          </button>
          <button
            type="button"
            className={`toolbar-btn ${editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}`}
            onMouseDown={preventBlur}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            title="Heading 3"
          >
            <Heading3 size={16} />
          </button>
        </div>

        {/* Text Formats */}
        <div className="toolbar-group">
          <button
            type="button"
            className={`toolbar-btn ${editor.isActive('bold') ? 'is-active' : ''}`}
            onMouseDown={preventBlur}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Tebal (Bold)"
          >
            <Bold size={16} />
          </button>
          <button
            type="button"
            className={`toolbar-btn ${editor.isActive('italic') ? 'is-active' : ''}`}
            onMouseDown={preventBlur}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Miring (Italic)"
          >
            <Italic size={16} />
          </button>
          <button
            type="button"
            className={`toolbar-btn ${editor.isActive('underline') ? 'is-active' : ''}`}
            onMouseDown={preventBlur}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="Garis Bawah (Underline)"
          >
            <UnderlineIcon size={16} />
          </button>
          <button
            type="button"
            className={`toolbar-btn ${editor.isActive('strike') ? 'is-active' : ''}`}
            onMouseDown={preventBlur}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Coret (Strikethrough)"
          >
            <Strikethrough size={16} />
          </button>
        </div>

        {/* Text Color & Highlight */}
        <div className="toolbar-group" style={{ position: 'relative' }}>
          <button
            type="button"
            className="toolbar-btn"
            onMouseDown={preventBlur}
            onClick={() => {
              setShowColorPicker(!showColorPicker);
              setShowHighlightPicker(false);
              setShowTableColorPicker(false);
            }}
            title="Warna Teks"
          >
            <Palette size={16} />
          </button>
          {showColorPicker && (
            <div className="color-picker-popover">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className="color-swatch"
                  style={{ backgroundColor: c.color }}
                  title={c.label}
                  onMouseDown={preventBlur}
                  onClick={() => {
                    if (c.value === 'inherit') {
                      editor.chain().focus().unsetColor().run();
                    } else {
                      editor.chain().focus().setColor(c.value).run();
                    }
                    setShowColorPicker(false);
                  }}
                />
              ))}
            </div>
          )}

          <button
            type="button"
            className={`toolbar-btn ${editor.isActive('highlight') ? 'is-active' : ''}`}
            onMouseDown={preventBlur}
            onClick={() => {
              setShowHighlightPicker(!showHighlightPicker);
              setShowColorPicker(false);
              setShowTableColorPicker(false);
            }}
            title="Stabilo (Highlight)"
          >
            <Highlighter size={16} />
          </button>
          {showHighlightPicker && (
            <div className="color-picker-popover">
              {HIGHLIGHT_COLORS.map((h) => (
                <button
                  key={h.value}
                  type="button"
                  className="color-swatch"
                  style={{ backgroundColor: h.value }}
                  title={h.label}
                  onMouseDown={preventBlur}
                  onClick={() => {
                    editor.chain().focus().toggleHighlight({ color: h.value }).run();
                    setShowHighlightPicker(false);
                  }}
                />
              ))}
              <button
                type="button"
                className="toolbar-btn"
                style={{ fontSize: 11, padding: '0 4px', height: 20 }}
                onMouseDown={preventBlur}
                onClick={() => {
                  editor.chain().focus().unsetHighlight().run();
                  setShowHighlightPicker(false);
                }}
              >
                Hapus
              </button>
            </div>
          )}
        </div>

        {/* Alignment */}
        <div className="toolbar-group">
          <button
            type="button"
            className={`toolbar-btn ${editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}`}
            onMouseDown={preventBlur}
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            title="Rata Kiri"
          >
            <AlignLeft size={16} />
          </button>
          <button
            type="button"
            className={`toolbar-btn ${editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}`}
            onMouseDown={preventBlur}
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            title="Rata Tengah"
          >
            <AlignCenter size={16} />
          </button>
          <button
            type="button"
            className={`toolbar-btn ${editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}`}
            onMouseDown={preventBlur}
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            title="Rata Kanan"
          >
            <AlignRight size={16} />
          </button>
        </div>

        {/* Quotes, Code, Checklist */}
        <div className="toolbar-group">
          <button
            type="button"
            className={`toolbar-btn ${editor.isActive('blockquote') ? 'is-active' : ''}`}
            onMouseDown={preventBlur}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Kutipan (Quote)"
          >
            <Quote size={16} />
          </button>
          <button
            type="button"
            className={`toolbar-btn ${editor.isActive('codeBlock') ? 'is-active' : ''}`}
            onMouseDown={preventBlur}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            title="Code Block"
          >
            <Code size={16} />
          </button>
          <button
            type="button"
            className={`toolbar-btn ${editor.isActive('taskList') ? 'is-active' : ''}`}
            onMouseDown={preventBlur}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            title="Ceklis Tugas (To-do List)"
          >
            <ListTodo size={16} />
          </button>
        </div>

        {/* Enhanced Table Tools */}
        <div className="toolbar-group" style={{ borderRight: 'none', position: 'relative' }}>
          <button
            type="button"
            className={`toolbar-btn ${isTableActive ? 'is-active' : ''}`}
            onMouseDown={preventBlur}
            onClick={() => {
              if (!isTableActive) {
                editor
                  .chain()
                  .focus()
                  .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                  .run();
              } else {
                // Toggle table color popover if already in table
                setShowTableColorPicker(!showTableColorPicker);
              }
            }}
            title={isTableActive ? 'Opsi Tabel' : 'Sisipkan Tabel (3x3)'}
          >
            <TableIcon size={16} />
          </button>

          {/* Table Cell Color Picker Button */}
          <button
            type="button"
            className="toolbar-btn"
            onMouseDown={preventBlur}
            onClick={() => {
              setShowTableColorPicker(!showTableColorPicker);
              setShowColorPicker(false);
              setShowHighlightPicker(false);
            }}
            title="Warna Latar Sel Tabel"
          >
            <PaintBucket size={15} />
          </button>

          {showTableColorPicker && (
            <div className="color-picker-popover" style={{ width: 180, flexWrap: 'wrap' }}>
              <div style={{ width: '100%', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                Warna Sel Tabel:
              </div>
              {TABLE_CELL_COLORS.map((tc) => (
                <button
                  key={tc.label}
                  type="button"
                  className="color-swatch"
                  style={{
                    backgroundColor: tc.value || (isDarkMode ? '#0f172a' : '#ffffff'),
                    border: tc.value ? '1px solid rgba(0,0,0,0.1)' : '1px dashed #94a3b8',
                  }}
                  title={tc.label}
                  onMouseDown={preventBlur}
                  onClick={() => setCellColor(isDarkMode && tc.darkValue ? tc.darkValue : tc.value)}
                />
              ))}
            </div>
          )}

          {/* Table Rows & Columns Control Buttons */}
          <button
            type="button"
            className="toolbar-btn"
            onMouseDown={preventBlur}
            onClick={() => editor.chain().focus().addRowAfter().run()}
            title="Tambah Baris (+ Baris)"
          >
            <Rows size={15} />
            <span style={{ fontSize: 10, marginLeft: 2, fontWeight: 700 }}>+</span>
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onMouseDown={preventBlur}
            onClick={() => editor.chain().focus().deleteRow().run()}
            title="Hapus Baris (- Baris)"
          >
            <Rows size={15} />
            <span style={{ fontSize: 10, marginLeft: 2, fontWeight: 700 }}>-</span>
          </button>

          <button
            type="button"
            className="toolbar-btn"
            onMouseDown={preventBlur}
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            title="Tambah Kolom (+ Kolom)"
          >
            <Columns size={15} />
            <span style={{ fontSize: 10, marginLeft: 2, fontWeight: 700 }}>+</span>
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onMouseDown={preventBlur}
            onClick={() => editor.chain().focus().deleteColumn().run()}
            title="Hapus Kolom (- Kolom)"
          >
            <Columns size={15} />
            <span style={{ fontSize: 10, marginLeft: 2, fontWeight: 700 }}>-</span>
          </button>

          {isTableActive && (
            <button
              type="button"
              className="toolbar-btn"
              style={{ color: '#ef4444' }}
              onMouseDown={preventBlur}
              onClick={() => editor.chain().focus().deleteTable().run()}
              title="Hapus Tabel"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Editor Content Area with responsive desktop max-width */}
      <div className="tiptap-content-container">
        <div className="tiptap-canvas-wrapper">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
