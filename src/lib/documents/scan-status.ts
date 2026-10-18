import type { DocumentRecord } from '@/contracts/documents'

/** Only public, authoritative verdicts are shown. Worker leases and errors are private. */
export function scanLabel(status: DocumentRecord['scanStatus']): string {
  switch (status) {
    case 'awaiting_upload': return 'Awaiting upload confirmation'
    case 'pending_scan': return 'Pending scan · private quarantine'
    case 'clean': return 'Scan passed · private quarantine'
    case 'rejected': return 'Scan rejected · private quarantine'
    default: return 'Scan status unavailable · private quarantine'
  }
}

export function intakeReceipt(status: DocumentRecord['scanStatus']): string {
  switch (status) {
    case 'pending_scan': return 'Received in private quarantine. Pending scan.'
    case 'clean': return 'Received in private quarantine. Scan passed. Processing remains unavailable.'
    case 'rejected': return 'Received in private quarantine. Scan rejected. Processing is blocked.'
    default: return 'Receipt requires confirmation. Refresh the document list.'
  }
}
