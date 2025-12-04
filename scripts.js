/* =========================
   SCRIPTS.JS - WF Veículos
   ========================= */

/* ====== CONFIGURAÇÕES ====== */
// Coloque aqui a URL do seu Apps Script (para acompanhamento de serviços)
const ACOMPANHAMENTO_ENDPOINT = "https://script.google.com/macros/s/SEU_LINK_AQUI/exec";

/* ====== DOM ELEMENTS ====== */
const menuToggle = document.getElementById("menu-toggle");
const mainNav = document.getElementById("nav");
const navLinks = document.querySelectorAll(".main-nav a");
const body = document.body;
const yearSpan = document.getElementById("year");
const carCards = document.querySelectorAll(".car-card");
const modalRootId = 'modal-root';

/* ====== AUX ====== */
const isMobile = () => window.innerWidth <= 700;

/* ====== MENU MOBILE: abrir / fechar e animação ====== */
function openMenu() {
  if (!mainNav) return;
  mainNav.style.display = 'flex';
  // for animation: use a class
  mainNav.classList.add('open');
  menuToggle.setAttribute('aria-expanded', 'true');
  menuToggle.classList.add('is-open'); // usar para animar o ícone no CSS
  // prevenir scroll atrás do menu (opcional)
  body.style.overflow = 'hidden';
}

function closeMenu() {
  if (!mainNav) return;
  // animar fechamento
  mainNav.classList.remove('open');
  // após animação, esconder (tempo depende do CSS transition — 250ms default)
  setTimeout(() => {
    if (!mainNav.classList.contains('open')) {
      mainNav.style.display = 'none';
      body.style.overflow = ''; // restaura scroll
    }
  }, 250);
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.classList.remove('is-open');
}

/* Toggle clique no hambúrguer */
if (menuToggle) {
  menuToggle.addEventListener('click', (e) => {
    const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
    if (expanded) closeMenu();
    else openMenu();
  });
}

/* Fecha o menu se clicar fora (desktop/mobile quando aberto) */
document.addEventListener('click', (e) => {
  if (!mainNav || !menuToggle) return;
  const target = e.target;
  const clickedInsideNav = mainNav.contains(target) || menuToggle.contains(target);
  if (!clickedInsideNav && mainNav.classList.contains('open')) {
    closeMenu();
  }
});

/* Fecha o menu ao pressionar ESC */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && mainNav && mainNav.classList.contains('open')) {
    closeMenu();
  }
});

/* Fecha o menu ao clicar em um link (UX móvel) */
navLinks.forEach(link => {
  link.addEventListener('click', () => {
    if (isMobile()) closeMenu();
  });
});

/* Se a tela for redimensionada para desktop, garante menu fechado e display correto */
window.addEventListener('resize', () => {
  if (!isMobile()) {
    // remove estilos inline do menu (garante que fica visível no desktop via CSS)
    if (mainNav) {
      mainNav.style.display = '';
      mainNav.classList.remove('open');
    }
    if (menuToggle) {
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.classList.remove('is-open');
    }
    body.style.overflow = '';
  } else {
    // mobile: esconde nav por padrão
    if (mainNav && !mainNav.classList.contains('open')) {
      mainNav.style.display = 'none';
    }
  }
});


/* ====== SMOOTH SCROLL PARA ÂNCORES ====== */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    // se o link for apenas '#', ignorar
    if (this.getAttribute('href') === '#') return;
    e.preventDefault();
    const targetId = this.getAttribute('href').slice(1);
    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      // fechar menu se estiver no mobile
      if (isMobile()) closeMenu();
      // calcular offset para compensar header (se necessário)
      const headerOffset = document.querySelector('.site-header')?.offsetHeight || 0;
      const elementPosition = targetEl.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  });
});


/* ====== ANIMAÇÃO DO ÍCONE HAMBURGUER para X ======
   Você precisa adicionar CSS para a classe .is-open que transforma o icone.
   Exemplo no CSS:
   .menu-toggle.is-open { transform: rotate(90deg); }  ou animar linhas via spans.
*/

/* ====== COLOCA ANO NO RODAPÉ ====== */
if (yearSpan) {
  yearSpan.textContent = new Date().getFullYear();
}

/* ====== FUNÇÃO CONSULTAR SERVIÇO (ACOMPANHAMENTO) ======
   Reutiliza a API do Google Apps Script. Endereço configurado em ACOMPANHAMENTO_ENDPOINT.
   Garante retorno esperado: { veiculo, status, etapas: [] }
*/
async function consultarServico(event) {
  if (event) event.preventDefault();
  const input = document.getElementById("codigoOuPlaca");
  const resultadoEl = document.getElementById("resultadoServico");
  if (!input || !resultadoEl) return;

  const consulta = input.value.trim();
  if (!consulta) {
    resultadoEl.style.display = "block";
    resultadoEl.innerHTML = `<p style="color:#ffb3b3">Digite a placa ou código.</p>`;
    return;
  }

  // Mostra carregando
  resultadoEl.style.display = "block";
  resultadoEl.innerHTML = `<p>🔄 Consultando informações...</p>`;

  try {
    const url = `${ACOMPANHAMENTO_ENDPOINT}?consulta=${encodeURIComponent(consulta)}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("Resposta inválida do servidor");
    const data = await resp.json();

    if (!data || data.erro) {
      resultadoEl.innerHTML = `<p style="color:#ff6b6b">❌ Nenhum serviço encontrado para "${consulta}".</p>`;
      return;
    }

    // Monta lista de etapas
    let etapasHTML = "";
    if (Array.isArray(data.etapas) && data.etapas.length) {
      data.etapas.forEach(e => {
        etapasHTML += `<li>${e}</li>`;
      });
    } else {
      etapasHTML = "<li>Nenhuma etapa registrada.</li>";
    }

    resultadoEl.innerHTML = `
      <h3>Informações do Veículo</h3>
      <p><strong>Veículo:</strong> ${escapeHtml(data.veiculo || "Não informado")}</p>
      <p><strong>Status:</strong> ${escapeHtml(data.status || "Sem status")}</p>

      <h3 style="margin-top:20px;">Etapas do Serviço</h3>
      <ul>${etapasHTML}</ul>
    `;

  } catch (err) {
    console.error(err);
    resultadoEl.innerHTML = `<p style="color:#ff6b6b">❌ Erro ao consultar o serviço. Tente novamente.</p>`;
  }
}

/* Pequena função para evitar XSS se você exibir valores vindos do servidor */
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}

/* Se o formulário de acompanhamento usa onsubmit="return consultarServico(event)",
   garanta que a função esteja global (window). */
window.consultarServico = consultarServico;


/* ====== MODAL SIMPLES PARA "SAIBA MAIS" (VEÍCULOS) ======
   Se os botões "Saiba mais" tiverem a classe .btn-detail, o script abre modal com
   conteúdo extra retirado de data-attributes (ex: data-title, data-desc, data-img).
   Para usar, no HTML:
     <a class="btn btn-outline btn-detail" href="#" data-title="..." data-price="..." data-img="car1.jpg">Saiba mais</a>
*/
function createModalIfNeeded() {
  if (document.getElementById(modalRootId)) return;
  const modal = document.createElement('div');
  modal.id = modalRootId;
  modal.innerHTML = `
    <div class="wf-modal-backdrop" tabindex="-1" role="dialog" aria-hidden="true">
      <div class="wf-modal">
        <button class="wf-modal-close" aria-label="Fechar">×</button>
        <div class="wf-modal-body"></div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // event listeners
  modal.querySelector('.wf-modal-close').addEventListener('click', closeModal);
  modal.querySelector('.wf-modal-backdrop').addEventListener('click', (e) => {
    if (e.target.classList.contains('wf-modal-backdrop')) closeModal();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
}

function openModal(htmlContent) {
  createModalIfNeeded();
  const root = document.getElementById(modalRootId);
  root.querySelector('.wf-modal-body').innerHTML = htmlContent;
  root.style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const root = document.getElementById(modalRootId);
  if (!root) return;
  root.style.display = 'none';
  document.body.style.overflow = '';
}

/* Connect buttons .btn-detail (if exist) */
document.addEventListener('click', (e) => {
  const el = e.target.closest && e.target.closest('.btn-detail');
  if (!el) return;
  e.preventDefault();

  const title = el.getAttribute('data-title') || '';
  const price = el.getAttribute('data-price') || '';
  const desc = el.getAttribute('data-desc') || '';
  const img = el.getAttribute('data-img') || '';

  const html = `
    <div style="display:flex;gap:18px;align-items:flex-start;">
      ${img ? `<img src="${img}" alt="" style="width:260px;height:160px;object-fit:cover;border-radius:8px;">` : ''}
      <div style="flex:1">
        <h3 style="margin:0 0 8px">${escapeHtml(title)}</h3>
        <p style="margin:0 0 10px;color:rgba(255,255,255,0.9)">${escapeHtml(desc)}</p>
        <p style="font-weight:700;color:#ffd400;margin:0 0 12px">${escapeHtml(price)}</p>
        <a href="#contato" class="btn btn-primary">Quero saber mais</a>
      </div>
    </div>
  `;
  openModal(html);
});


/* ====== INITIALIZE ====== */
(function init() {
  // garante que o menu esteja oculto no mobile inicialmente
  if (isMobile() && mainNav) {
    mainNav.style.display = 'none';
  }
  // coloca ano no footer (caso o elemento exista)
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  // adicionar listeners nos botões "Saiba mais" dentro dos cards, caso não use data-attributes
  document.querySelectorAll('.car-card .btn-outline').forEach(btn => {
    // opcional: se não for btn-detail, usa conteúdo do card
    if (!btn.classList.contains('btn-detail')) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const card = btn.closest('.car-card');
        const title = card?.querySelector('h3')?.textContent || '';
        const price = card?.querySelector('.price')?.textContent || '';
        const desc = card?.querySelector('p')?.textContent || '';
        const img = card?.querySelector('img')?.src || '';
        const html = `
          <div style="display:flex;gap:18px;align-items:flex-start;">
            ${img ? `<img src="${img}" alt="" style="width:260px;height:160px;object-fit:cover;border-radius:8px;">` : ''}
            <div style="flex:1">
              <h3 style="margin:0 0 8px">${escapeHtml(title)}</h3>
              <p style="margin:0 0 10px;color:rgba(255,255,255,0.9)">${escapeHtml(desc)}</p>
              <p style="font-weight:700;color:#ffd400;margin:0 0 12px">${escapeHtml(price)}</p>
              <a href="#contato" class="btn btn-primary">Quero saber mais</a>
            </div>
          </div>
        `;
        openModal(html);
      });
    }
  });

  // se houver formulário de acompanhamento com id=form-acompanhamento, ligar o submit
  const formAcomp = document.getElementById('form-acompanhamento');
  if (formAcomp) {
    formAcomp.addEventListener('submit', consultarServico);
  }
})();