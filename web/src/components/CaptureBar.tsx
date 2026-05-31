import { useState } from 'preact/hooks'
import { CaptureSheet } from './CaptureSheet'

export function CaptureBar({
  userId,
  activeView,
  onNavigate,
  onSaved,
}: {
  userId: string
  activeView: 'hoy' | 'camino' | 'comidas' | 'perfil'
  onNavigate: (view: 'hoy' | 'camino' | 'comidas' | 'perfil') => void
  onSaved: () => Promise<void>
}) {
  const [captureOpen, setCaptureOpen] = useState(false)

  return (
    <footer class="footer">
      <div class="capture">
        <button class="cta" type="button" onClick={() => setCaptureOpen(true)}>
          <span class="plus" aria-hidden="true">
            +
          </span>{' '}
          Registrar comida
        </button>
        <div class="capnote">Foto con IA o manual: lo eliges al tocar.</div>
      </div>
      <nav class="tabbar" aria-label="Principal">
        <button
          class={activeView === 'hoy' ? 't on' : 't'}
          type="button"
          onClick={() => onNavigate('hoy')}
        >
          <span class="ic" aria-hidden="true">
            ◎
          </span>
          Hoy
        </button>
        <button
          class={activeView === 'camino' ? 't on' : 't'}
          type="button"
          onClick={() => onNavigate('camino')}
        >
          <span class="ic" aria-hidden="true">
            ▤
          </span>
          Camino
        </button>
        <button
          class={activeView === 'comidas' ? 't on' : 't'}
          type="button"
          onClick={() => onNavigate('comidas')}
        >
          <span class="ic" aria-hidden="true">
            ⊞
          </span>
          Comidas
        </button>
        <button
          class={activeView === 'perfil' ? 't on' : 't'}
          type="button"
          onClick={() => onNavigate('perfil')}
        >
          <span class="ic" aria-hidden="true">
            ○
          </span>
          Perfil
        </button>
      </nav>
      {captureOpen ? (
        <CaptureSheet userId={userId} onClose={() => setCaptureOpen(false)} onSaved={onSaved} />
      ) : null}
    </footer>
  )
}
