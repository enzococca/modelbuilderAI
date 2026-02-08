import { useState, useRef, useCallback } from 'react';
import { Send, Loader2, Paperclip, X } from 'lucide-react';
import type { KeyboardEvent, ChangeEvent, DragEvent } from 'react';

export interface AttachedFile {
  file: File;
  id?: string;          // set after upload completes
  uploading?: boolean;
}

interface Props {
  onSend: (content: string, files: AttachedFile[]) => void;
  disabled?: boolean;
}

const FILE_ICONS: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'text/csv': 'CSV',
  'application/json': 'JSON',
  'application/geo+json': 'GeoJSON',
  'image/png': 'PNG',
  'image/jpeg': 'JPG',
  'video/mp4': 'MP4',
  'application/x-sqlite3': 'SQLite',
  'application/geopackage+sqlite3': 'GPKG',
};

function fileTag(f: File): string {
  if (FILE_ICONS[f.type]) return FILE_ICONS[f.type];
  const ext = f.name.split('.').pop()?.toUpperCase();
  return ext || 'FILE';
}

export function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState('');
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if ((!value.trim() && files.length === 0) || disabled) return;
    onSend(value.trim(), files);
    setValue('');
    setFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  };

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles).map(file => ({ file }));
    setFiles(prev => [...prev, ...arr]);
  }, []);

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const onDragOver = (e: DragEvent) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = () => setDragOver(false);
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  return (
    <div
      className={`border-t border-gray-800 bg-gray-900 p-4 transition-colors ${dragOver ? 'bg-indigo-900/20 border-indigo-500' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* File chips */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2 max-w-3xl mx-auto">
          {files.map((af, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300">
              <span className="text-indigo-400 font-medium">{fileTag(af.file)}</span>
              <span className="max-w-[120px] truncate">{af.file.name}</span>
              <span className="text-gray-500">({(af.file.size / 1024).toFixed(0)}K)</span>
              <button onClick={() => removeFile(i)} className="ml-0.5 text-gray-500 hover:text-red-400">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 max-w-3xl mx-auto">
        {/* Attach button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="p-3 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-colors disabled:opacity-50"
          title="Allega file (o trascina qui)"
        >
          <Paperclip className="w-5 h-5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={e => { if (e.target.files) { addFiles(e.target.files); e.target.value = ''; } }}
        />

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={files.length > 0 ? 'Descrivi cosa vuoi fare con questi file...' : 'Send a message...'}
            rows={1}
            disabled={disabled}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 pr-12 text-sm resize-none focus:outline-none focus:border-blue-500 placeholder-gray-500 disabled:opacity-50"
          />
        </div>
        <button
          onClick={handleSend}
          disabled={(!value.trim() && files.length === 0) || disabled}
          className="p-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl transition-colors"
        >
          {disabled ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </div>

      {/* Drag overlay hint */}
      {dragOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-indigo-900/30 border-2 border-dashed border-indigo-500 rounded-xl pointer-events-none z-20">
          <p className="text-indigo-300 text-sm font-medium">Rilascia i file qui</p>
        </div>
      )}
    </div>
  );
}
