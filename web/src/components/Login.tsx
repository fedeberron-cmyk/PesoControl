import { useEffect, useState } from 'preact/hooks'
import {
  clearPasswordRecovery,
  isPasswordRecoveryActive,
  resetPasswordForEmail,
  signInWithPassword,
  signUp,
  subscribeToPasswordRecovery,
  updatePassword,
  verifyRecoveryOtp,
} from '../lib/auth'

type AuthMode = 'login' | 'signup'

export function Login() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [isRecovery, setIsRecovery] = useState(() => isPasswordRecoveryActive())
  const [email, setEmail] = useState('')
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isSignup = mode === 'signup'

  useEffect(() => {
    return subscribeToPasswordRecovery((active) => {
      setIsRecovery(active)
      setMode('login')
      setRecoveryCode('')
      setPassword('')
      setShowPassword(false)
      setError('')
      setMessage('')
    })
  }, [])

  async function handleSubmit(event: Event) {
    event.preventDefault()
    const cleanEmail = email.trim()

    if (isRecovery) {
      const cleanRecoveryEmail = recoveryEmail || cleanEmail

      if (!/^\d{6}$/.test(recoveryCode)) {
        setError('Escribe el código de 6 dígitos.')
        return
      }
      if (!password) {
        setError('Escribe tu nueva contraseña.')
        return
      }
      if (password.length < 6) {
        setError('Usa una contraseña de al menos 6 caracteres.')
        return
      }

      setSubmitting(true)
      setError('')
      setMessage('')

      try {
        await verifyRecoveryOtp(cleanRecoveryEmail, recoveryCode)
        await updatePassword(password)
        clearPasswordRecovery()
        setIsRecovery(false)
        setRecoveryEmail('')
        setRecoveryCode('')
        setPassword('')
        setShowPassword(false)
        setMessage('Tu contraseña quedó actualizada')
      } catch {
        setError('Código inválido o vencido. Pedí uno nuevo.')
      } finally {
        setSubmitting(false)
      }
      return
    }

    if (!cleanEmail || !password) {
      setError('Escribe tu email y contraseña.')
      return
    }
    if (isSignup && password.length < 6) {
      setError('Usa una contraseña de al menos 6 caracteres.')
      return
    }

    setSubmitting(true)
    setError('')
    setMessage('')

    try {
      if (isSignup) {
        await signUp(cleanEmail, password)
      } else {
        await signInWithPassword(cleanEmail, password)
      }
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode)
    setError('')
    setMessage('')
    setPassword('')
    setRecoveryCode('')
    setShowPassword(false)
  }

  async function handleResetPassword() {
    const cleanEmail = email.trim()

    setError('')
    setMessage('')

    if (!cleanEmail) {
      setError('Primero escribe tu email.')
      return
    }

    setSubmitting(true)

    try {
      await resetPasswordForEmail(cleanEmail)
      setRecoveryEmail(cleanEmail)
      setRecoveryCode('')
      setPassword('')
      setShowPassword(false)
      setIsRecovery(true)
      setMessage('')
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResendCode() {
    const cleanRecoveryEmail = recoveryEmail || email.trim()

    setError('')
    setMessage('')

    if (!cleanRecoveryEmail) {
      setIsRecovery(false)
      setError('Primero escribe tu email.')
      return
    }

    setSubmitting(true)

    try {
      await resetPasswordForEmail(cleanRecoveryEmail)
      setRecoveryEmail(cleanRecoveryEmail)
      setMessage('Te enviamos otro código. Revisa también spam.')
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  function handleBackToLogin() {
    clearPasswordRecovery()
    setIsRecovery(false)
    setMode('login')
    setRecoveryEmail('')
    setRecoveryCode('')
    setPassword('')
    setShowPassword(false)
    setError('')
    setMessage('')
  }

  return (
    <div class="phone auth-phone">
      <div class="screen auth-screen">
        <div class="statusbar">
          <span>9:41</span>
          <span class="r">PesoControl</span>
        </div>

        <section class="login-panel" aria-labelledby="login-title">
          <div class="login-kick">Deuda calórica, sin prisa</div>
          <h1 id="login-title" class="serif">
            {isRecovery ? 'Restablecer contraseña' : 'PesoControl'}
          </h1>
          <p>
            {isRecovery
              ? `Te enviamos un código de 6 dígitos a ${recoveryEmail || email}. Revisa tu correo (también spam).`
              : isSignup
                ? 'Crea tu cuenta para guardar tu progreso.'
                : 'Entra para ver tu trayectoria y registrar con calma.'}
          </p>

          <form class="login-form" onSubmit={handleSubmit}>
            {isRecovery ? null : (
              <label>
                <span>Email</span>
                <input
                  type="email"
                  value={email}
                  onInput={(event) => setEmail(event.currentTarget.value)}
                  placeholder="tu@email.com"
                  autocomplete="email"
                  inputMode="email"
                  disabled={submitting}
                />
              </label>
            )}

            {isRecovery ? (
              <label>
                <span>Código</span>
                <input
                  type="text"
                  value={recoveryCode}
                  onInput={(event) => {
                    setRecoveryCode(event.currentTarget.value.replace(/\D/g, '').slice(0, 6))
                  }}
                  placeholder="6 dígitos"
                  autocomplete="one-time-code"
                  inputMode="numeric"
                  maxLength={6}
                  disabled={submitting}
                />
              </label>
            ) : null}

            <label>
              <span>{isRecovery ? 'Nueva contraseña' : 'Contraseña'}</span>
              <div class="password-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onInput={(event) => setPassword(event.currentTarget.value)}
                  placeholder={isSignup || isRecovery ? 'Mínimo 6 caracteres' : 'Tu contraseña'}
                  autocomplete={isSignup || isRecovery ? 'new-password' : 'current-password'}
                  disabled={submitting}
                />
                <button
                  class="password-toggle"
                  type="button"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  onClick={() => setShowPassword((shown) => !shown)}
                  disabled={submitting}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </label>

            {!isSignup && !isRecovery ? (
              <button
                class="login-switch"
                type="button"
                onClick={() => void handleResetPassword()}
                disabled={submitting}
              >
                ¿Olvidaste tu contraseña?
              </button>
            ) : null}

            {message ? <div class="login-error">{message}</div> : null}
            {error ? <div class="login-error">{error}</div> : null}

            <button class="login-submit" type="submit" disabled={submitting}>
              {submitting
                ? 'Un momento...'
                : isRecovery
                  ? 'Guardar contraseña'
                  : isSignup
                    ? 'Crear cuenta'
                    : 'Entrar'}
            </button>
          </form>

          {isRecovery ? (
            <>
              <button
                class="login-switch"
                type="button"
                onClick={() => void handleResendCode()}
                disabled={submitting}
              >
                Reenviar código
              </button>
              <button
                class="login-switch"
                type="button"
                onClick={handleBackToLogin}
                disabled={submitting}
              >
                Volver
              </button>
            </>
          ) : (
            <button
              class="login-switch"
              type="button"
              onClick={() => switchMode(isSignup ? 'login' : 'signup')}
              disabled={submitting}
            >
              {isSignup ? 'Ya tengo cuenta' : 'Crear cuenta'}
            </button>
          )}
        </section>
      </div>
    </div>
  )
}

function authErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return 'No se pudo completar. Revisa tus datos e intenta otra vez.'
}
