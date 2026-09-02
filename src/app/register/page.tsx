import Link from 'next/link'

export default function RegisterPage() {
  return (
    <main className="auth-page">
      <section className="auth-card auth-card-wide">
        <Link href="/" className="auth-brand"><span className="brand-mark">V</span>Virexa</Link>
        <div className="auth-heading"><span className="eyebrow">GET STARTED</span><h1>Build your operating layer.</h1><p>Create an organization workspace and bring your team into Virexa.</p></div>
        <form className="auth-form" action="/api/auth/register" method="post">
          <label>Full name<input name="displayName" type="text" autoComplete="name" required placeholder="Your name" /></label>
          <label>Work email<input name="email" type="email" autoComplete="email" required placeholder="you@company.com" /></label>
          <label>Organization<input name="organizationName" type="text" autoComplete="organization" required placeholder="Company name" /></label>
          <label>Password<input name="password" type="password" autoComplete="new-password" required minLength={12} placeholder="At least 12 characters" /></label>
          <button type="submit" className="primary-button auth-submit">Create workspace</button>
        </form>
        <p className="auth-switch">Already have access? <Link href="/login">Sign in</Link></p>
      </section>
    </main>
  )
}
