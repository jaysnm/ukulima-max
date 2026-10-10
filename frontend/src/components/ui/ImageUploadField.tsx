import { useEffect, useState } from 'react'
import { Camera } from 'lucide-react'

interface ImageUploadFieldProps {
  label?: string
  existingUrl?: string | null
  onChange: (file: File | null) => void
}

/**
 * A single photo attachment for a record — e.g. a stock-take head count, an
 * applied input, or reported damage. `capture="environment"` opens the
 * camera directly on mobile, which is how most of these get taken in the
 * field rather than picked from a gallery.
 */
export default function ImageUploadField({
  label = 'Photo',
  existingUrl,
  onChange,
}: ImageUploadFieldProps) {
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    onChange(file)
    setPreview(file ? URL.createObjectURL(file) : null)
  }

  const displayUrl = preview ?? existingUrl

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex items-center gap-3">
        {displayUrl ? (
          <img
            src={displayUrl}
            alt=""
            className="w-16 h-16 object-cover rounded-lg border border-gray-200"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-gray-300">
            <Camera className="w-6 h-6" />
          </div>
        )}
        <label className="cursor-pointer text-sm text-primary-600 hover:underline">
          {displayUrl ? 'Change photo' : 'Add photo'}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFile}
          />
        </label>
      </div>
    </div>
  )
}
