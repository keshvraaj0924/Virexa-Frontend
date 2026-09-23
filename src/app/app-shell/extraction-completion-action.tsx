'use client'

import { useState } from 'react'
import type { DocumentExtraction } from '@/contracts/extractions'
import { extractionsApi } from '@/lib/api/extractions'
import { ApiError } from '@/lib/api/client'

interface ExtractionCompletionActionProps {
  documentId: string
  extraction: DocumentExtraction
  disabled?: boolean
  onCompleted: (extraction: DocumentExtraction) => void
  onConflict: () => void
}

export function ExtractionCompletionAction({
  documentId,
  extraction,
  disabled = false,
  onCompleted,
  onConflict,
}: ExtractionCompletionActionProps) {
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function completeReview() {
    if (submitting || disabled || extraction.status !== 'review_required') return

    setSubmitting(true)
    setMessage(null)
    try {
      const response = await extractionsApi.complete(documentId, extraction.id, {
        expectedUpdatedAt: extraction.updatedAt,
      })
      onCompleted(response.data)
      setMessage('Review completed from the latest authoritative extraction version.')
    } catch (cause: unknown) {
      if (cause instanceof ApiError && cause.code === 'EXTRACTION_COMPLETION_CONFLICT') {
        setMessage('This extraction changed before completion. Reload the authoritative version and review again.')
        onConflict()
      } else {
        setMessage(cause instanceof Error ? cause.message : 'Unable to complete extraction review.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (extraction.status !== 'review_required') return null

  return (
    <div className="extraction-completion-action">
      <button
        type="button"
        className="primary-button"
        disabled={disabled || submitting}
        aria-busy={submitting}
        onClick={() => void completeReview()}
      >
        {submitting ? 'Completing…' : 'Complete review'}
      </button>
      {message && <p role="status">{message}</p>}
    </div>
  )
}
