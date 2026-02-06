import { useCallback, useState } from 'react'
import { Upload } from 'lucide-react'

interface Props {
  onFiles: (files: File[]) => void
}

export function FileUpload({ onFiles }: Props) {
  const [dragOver, setDragOver] = useState(false)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const files = Array.from(e.dataTransfer.files)
      if (files.length) onFiles(files)
    },
    [onFiles],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? [])
      if (files.length) onFiles(files)
    },
    [onFiles],
  )

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 transition ${
        dragOver ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 hover:border-gray-500'
      }`}
    >
      <Upload className="h-8 w-8 text-gray-400" />
      <span className="text-sm text-gray-400">Drop files here or click to upload</span>
      <input type="file" multiple className="hidden" onChange={handleChange} />
    </label>
  )
}
