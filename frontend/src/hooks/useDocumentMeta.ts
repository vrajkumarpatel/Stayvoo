import { useEffect } from 'react'

export function useDocumentMeta(title: string, description: string) {
  useEffect(() => {
    const prevTitle = document.title
    document.title = title

    const meta = document.querySelector('meta[name="description"]')
    const prevDescription = meta?.getAttribute('content') ?? null
    meta?.setAttribute('content', description)

    return () => {
      document.title = prevTitle
      if (prevDescription !== null) meta?.setAttribute('content', prevDescription)
    }
  }, [title, description])
}
