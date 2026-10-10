import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'

interface SubmitButtonProps {
  loading: boolean
  children: ReactNode
  className: string
}

export default function SubmitButton({ loading, children, className }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={`${className} flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed`}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  )
}
