'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface PasswordInputProps {
  id: string
  value: string
  onChange: (value: string) => void
  autoComplete: 'current-password' | 'new-password'
  placeholder: string
  disabled?: boolean
  minLength?: number
  maxLength?: number
  hint?: string
}

/** Shared, accessible password control. Never persists or logs the password. */
export function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  placeholder,
  disabled = false,
  minLength,
  maxLength = 128,
  hint,
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div className="vx-auth-field">
      <label htmlFor={id}>Password {hint && <span className="vx-auth-field-hint">{hint}</span>}</label>
      <div className="vx-auth-password">
        <input
          id={id}
          name="password"
          type={isVisible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          minLength={minLength}
          maxLength={maxLength}
          placeholder={placeholder}
          disabled={disabled}
          required
        />
        <button
          type="button"
          className="vx-password-toggle"
          aria-label={isVisible ? 'Hide password' : 'Show password'}
          aria-pressed={isVisible}
          disabled={disabled}
          onClick={() => setIsVisible((visible) => !visible)}
        >
          {isVisible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
    </div>
  )
}
