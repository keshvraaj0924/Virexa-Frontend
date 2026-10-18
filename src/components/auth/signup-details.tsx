import type { SignupDetails as Details } from '@/contracts/auth'
import { AccountTypeChoice } from './account-type-choice'
export function SignupDetails({ value, onChange, disabled }: { value: Details; onChange: (value: Details) => void; disabled: boolean }) {
  return <>
    <AccountTypeChoice value={value.accountType} onChange={accountType => onChange({ ...value, accountType })} disabled={disabled}/>
    <p className="vx-signup-explainer">{value.accountType === 'individual' ? 'A private workspace for your own documents and operations.' : 'Create an isolated workspace for your organization. Existing members should sign in.'}</p>
    <div className="vx-auth-field"><label htmlFor="displayName">Full name</label><input id="displayName" name="displayName" value={value.displayName} onChange={event => onChange({ ...value, displayName: event.target.value })} autoComplete="name" minLength={2} maxLength={120} required disabled={disabled} placeholder="Alex Morgan"/></div>
    {value.accountType === 'organization' && <div className="vx-auth-field"><label htmlFor="organizationName">Organization name</label><input id="organizationName" name="organizationName" value={value.organizationName ?? ''} onChange={event => onChange({ ...value, organizationName: event.target.value })} autoComplete="organization" minLength={2} maxLength={160} required disabled={disabled} placeholder="Your organization"/></div>}
    <div className="vx-auth-field"><label htmlFor="email">Email</label><input id="email" name="email" value={value.email} onChange={event => onChange({ ...value, email: event.target.value })} type="email" autoComplete="email" maxLength={320} required disabled={disabled} placeholder="you@example.com"/></div>
    <p className="vx-signup-explainer">Verify your email first, then choose a password. Each email belongs to one workspace.</p>
  </>
}
