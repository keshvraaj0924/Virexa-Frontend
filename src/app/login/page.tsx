import Link from 'next/link'

export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link href="/" className="auth-brand"><span className="brand-mark">V</span>Virexa</Link>
        <div className="auth-heading"><span className="eyebrow">WELCOME BACK</span><h1>Sign in to Virexa.</h1><p>Access your operational workspace securely.</p></div>
        <form className="auth-form" action="/api/auth/login" method="post">
          <label>Email<input name="email" type="email" autoComplete="email" required placeholder="you@company.com" /></label>
          <label>Password<input name="password" type="password" autoComplete="current-password" required placeholder="••••••••" /></label>
          <button type="submit" className="primary-button auth-submit">Sign in</button>
        </form>
        <p className="auth-switch">New to Virexa? <Link href="/register">Create an account</Link></p>
      </section>
    </main>
  )
}
