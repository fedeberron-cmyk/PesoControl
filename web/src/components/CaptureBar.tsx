export function CaptureBar() {
  return (
    <footer class="footer">
      <div class="capture">
        <button class="cta" type="button">
          <span class="plus" aria-hidden="true">
            +
          </span>{' '}
          Registrar comida
        </button>
        <div class="capnote">Foto con IA o manual: lo eliges al tocar.</div>
      </div>
      <nav class="tabbar" aria-label="Principal">
        <a class="t on" href="#hoy">
          <span class="ic" aria-hidden="true">
            ◎
          </span>
          Hoy
        </a>
        <a class="t" href="#camino">
          <span class="ic" aria-hidden="true">
            ▤
          </span>
          Camino
        </a>
        <a class="t" href="#comidas">
          <span class="ic" aria-hidden="true">
            ⊞
          </span>
          Comidas
        </a>
        <a class="t" href="#perfil">
          <span class="ic" aria-hidden="true">
            ○
          </span>
          Perfil
        </a>
      </nav>
    </footer>
  )
}
