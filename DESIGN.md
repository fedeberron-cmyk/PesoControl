# Sistema de diseño — PesoControl

> Creado por `/design-consultation` el 2026-05-28. Aprobado por Federico.
> Preview de referencia: `~/.gstack/projects/Calories_PesoControl/designs/design-system-20260528/preview.html`
> **Leé este archivo antes de cualquier decisión visual o de UI.** No te desvíes sin OK explícito.

## Contexto de producto
- **Qué es:** app personal de control de peso y calorías, construida alrededor del método de "deuda calórica" de Federico (la diferencia entre peso actual y meta es una deuda en kcal que se salda en el largo plazo; cada día elegís si abonás).
- **Para quién:** Federico + amigos/familia. App personal, no producto comercial.
- **Espacio:** trackers de calorías (MyFitnessPal, FatSecret, Cronometer, Yazio, Noom), pero deliberadamente distinto a todos ellos.
- **Tipo:** PWA mobile-first (HTML, sobre Supabase). Front nuevo, rehecho de cero.

## Lo memorable (el norte de todo el diseño)
**Que entiendas el método de un vistazo y sientas que vas a llegar a tu meta de largo plazo.**
Cada decisión sirve a esto. El héroe de la pantalla es la *trayectoria a la meta*, no las calorías de hoy.

## Dirección estética
- **Dirección:** calma, premium, editorial. Adulto en control del juego largo.
- **Nivel de decoración:** mínimo-intencional. La tipografía y el dato hacen el trabajo.
- **Lo que NO es:** ni planilla clínica/médica (fría, densa), ni gamificada/infantil (mascotas, rachas, confeti, culpa por "romper la racha").
- **Mood:** paciencia, claridad, confianza. "Constancia, no perfección."

## Tipografía
- **Display / números grandes / meta:** **Fraunces** (serif cálida, optical sizing). Pesos 400/500/600. Itálica 500 para frases de aliento (ej. "Eventualmente llegaremos"). Es el "riesgo" que le da cara: el hito se siente humano, no clínico.
- **Interfaz y texto:** **DM Sans**. Pesos 400/500/600.
- **Datos / ledger:** DM Sans con `font-variant-numeric: tabular-nums lining-nums`. Todos los números alineados.
- **Carga (Google Fonts):**
  `https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,500&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap`
- **Escala sugerida (px):** hero número 40-42 · título 30 · número medio 26 · cuerpo 15-16 · UI 13-14 · detalle 11.5-12.5.

## Color
Acento elegido: **Bosque**. (Alternativas exploradas y descartadas, documentadas por si acaso: Horizonte teal `#1E6E68`, Arcilla `#B05E3A`.)

**Modo claro:**
| Token | Hex |
|---|---|
| Fondo (papel) | `#F3EDE3` |
| Superficie (card) | `#FCF9F3` |
| Tinta (texto) | `#211C15` |
| Apagado (muted) | `#7C7268` |
| Línea (hairline) | `#E6DECF` |
| **Acento (Bosque)** | `#3C6B4A` |
| Acento suave | `rgba(60,107,74,.12)` |
| Arena (superávit) | `#C6A86B` |

**Modo oscuro:**
| Token | Hex |
|---|---|
| Fondo | `#17140F` |
| Superficie | `#221E18` |
| Tinta | `#F2ECE1` |
| Apagado | `#A39A8C` |
| Línea | `#332E26` |
| **Acento (Bosque)** | `#5E9469` |
| Acento suave | `rgba(94,148,105,.16)` |
| Arena | `#C6A86B` |

**Regla de color innegociable (es la filosofía hecha color):**
- El **acento es solo para progreso/trayectoria**. No para "día bueno".
- **Cero rojo/verde moralista.** Pasarte NO es un error. El superávit se muestra en **arena** (`#C6A86B`), nunca en rojo de alarma.

## Espaciado
- **Base:** 8px (subunidad 4px). Densidad **cómoda/amplia** — calma = aire.
- **Escala:** 2 · 4 · 8 · 16 · 24 · 32 · 48 · 64.
- **Radios:** sm 10px · md 16px · lg 22px · full 999px.

## Layout
- **Mobile-first, una columna.** Cards sobre fondo papel.
- **Estructura de la home (decidida):**
  1. **Contenido que scrollea:** Héroe (trayectoria a la meta) → Hoy → Semana → (histórico/más abajo).
  2. **Footer FIJO en la zona del pulgar:** botón **"+ Registrar comida"** siempre visible (foto o manual se eligen al tocar) + barra de tabs. El botón nunca se va, sin importar el scroll — pensado para el alcance del pulgar en pantallas reales.
- **El héroe** es el gráfico de trayectoria: línea de peso desde el inicio (101 kg) → hoy → proyección punteada hasta la meta (85 kg) marcada en el horizonte, con fecha estimada de llegada. Es el centro emocional.
- **Tabs:** Hoy · Camino · Comidas · Perfil.

## Movimiento
- **Enfoque:** mínimo-funcional + **un gesto firma**: la línea de trayectoria se dibuja hacia la meta al abrir (muestra, literalmente, que estás llegando).
- **Easing:** entrar ease-out · salir ease-in · mover ease-in-out.
- **Duración:** micro 50-100ms · corta 150-250ms · media 250-400ms.

## Reglas de producto que SON diseño (la filosofía)
1. **Saldos en kg Y kcal** siempre (tu método vive en los dos idiomas: registrás en kcal, la meta es en kg). Ej.: "Saldado 9.8 / 16.5 kg · 75,616 / 127,500 kcal".
2. **Sin meta diaria a la vista.** El día se muestra como "Hoy llevas −600" (conciencia), no "−600 de −1,900" (cuota que se aprueba/reprueba).
3. **El mensaje empuja a abonar primero, después da permiso:** "Intenta abonar hoy. Y si prefieres sumar, también está bien: es constancia, no perfección."
4. **Microcopy calmo:** chip "Decide con calma" (no "Tu decisión"). Remate de aliento "Eventualmente llegaremos." en cursiva.
5. **Captura = una sola entrada.** "+ Registrar comida"; foto-IA o manual se eligen adentro. Nunca 3 botones que compiten.
6. **Tono:** paciente, de adulto, con agencia. Nunca culpa, nunca alarma.

## Distribución
- PWA en GitHub Pages (mismo hosting actual). Modo claro/oscuro respetando preferencia del sistema + toggle.

## Bitácora de decisiones
| Fecha | Decisión | Por qué |
|---|---|---|
| 2026-05-28 | Sistema inicial creado | `/design-consultation`. Acento Bosque, Fraunces + DM Sans, neutros cálidos. |
| 2026-05-28 | Estética "calma/premium", no clínica ni gamificada | Sirve al norte: entender el método + sentir que llegás. |
| 2026-05-28 | Trayectoria a la meta como héroe (no las kcal de hoy) | Es lo que hace sentir "voy a llegar"; ningún tracker lo hace. |
| 2026-05-28 | Cero rojo/verde; superávit en arena | Pasarte es decisión, no error. La filosofía hecha color. |
| 2026-05-28 | Saldos en kg + kcal | El método de Federico vive en ambas unidades. |
| 2026-05-28 | "Hoy llevas" sin meta diaria | Conciencia, no cuota a aprobar/reprobar. |
| 2026-05-28 | Botón "Registrar" fijo en zona del pulgar | Loguear rápido sin desplazar al héroe; alcance real del pulgar. |
