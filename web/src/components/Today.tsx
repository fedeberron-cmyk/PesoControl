type TodayProps = {
  todayNet: number
}

export function Today({ todayNet }: TodayProps) {
  const state = todayState(todayNet)
  return (
    <section class="card today">
      <div class="net">
        <div class="of">Hoy llevas</div>
        <div class="n serif tnum">
          {formatSigned(todayNet)} <span class="unit">kcal</span>
        </div>
      </div>
      <div class="meta">
        <span class={`chip chip--${state.tone}`}>{state.chip}</span>
        <div class="sub">{state.sub}</div>
      </div>
    </section>
  )
}

// Non-judgmental, state-aware. Deficit = paying down; surplus = a valid choice;
// neutral = even. Never an alarm.
function todayState(net: number): { chip: string; sub: string; tone: 'def' | 'sur' | 'neutral' } {
  if (net < 0) {
    return {
      chip: 'Vas abonando',
      sub: 'Hoy le bajas a la deuda. Así se gana el largo plazo.',
      tone: 'def',
    }
  }
  if (net > 0) {
    return {
      chip: 'Hoy sumaste',
      sub: 'No pasa nada si te pasas. Es un juego de constancia, no de perfección.',
      tone: 'sur',
    }
  }
  return {
    chip: 'Día neutro',
    sub: 'Hoy quedaste a mano. Mañana sigues.',
    tone: 'neutral',
  }
}

function formatSigned(value: number) {
  if (value < 0) {
    return `−${Math.abs(value)}`
  }
  if (value > 0) {
    return `+${value}`
  }
  return '0'
}
