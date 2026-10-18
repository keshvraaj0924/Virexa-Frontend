import { Building2, UserRound } from 'lucide-react'
import type { AccountType } from '@/contracts/auth'

/** This choice describes the account being used; it never grants workspace access. */
export function AccountTypeChoice({ value, onChange, disabled = false }: { value: AccountType; onChange: (value: AccountType) => void; disabled?: boolean }) {
  return <fieldset className="vx-account-choice" disabled={disabled}>
    <legend>Account type</legend>
    <div>{(['individual', 'organization'] as const).map(kind => {
      const Icon = kind === 'individual' ? UserRound : Building2
      return <label key={kind} className={value === kind ? 'is-selected' : ''}>
        <input type="radio" name="accountType" value={kind} checked={value === kind} onChange={() => onChange(kind)}/>
        <Icon size={19} aria-hidden="true"/><span><strong>{kind === 'individual' ? 'Individual' : 'Organization'}</strong><small>{kind === 'individual' ? 'A workspace for you' : 'A workspace for your team'}</small></span>
      </label>
    })}</div>
  </fieldset>
}
