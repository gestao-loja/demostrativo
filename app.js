/* =========================================================
   CONFIGURAÇÃO DO SUPABASE
   Troque somente estes dois valores.
   Use a chave ANON/PUBLISHABLE, NUNCA service_role.
   ========================================================= */
const SUPABASE_URL = "https://tzolokxetilunyfzovav.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0HJWnbqDMg1LFwLuhaRLDg_FvEXwxZd";
/* =========================================================
   CREDENCIAIS DO SUPABASE (ÚNICO LUGAR)
   ⚠️ Substitua pelos valores reais do seu projeto.
   ========================================================= */
/* =========================================================
   CLIENT SUPABASE
   ========================================================= */
const { createClient } = supabase;
const dbReal = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* =========================================================
   🔒 MODO DEMONSTRAÇÃO — WRAPPER READ-ONLY
   ---------------------------------------------------------
   Todas as leituras (.select) passam normalmente.
   Toda tentativa de escrita (insert/update/delete/upsert/rpc)
   é interceptada e mostra um alerta explicativo.
   ========================================================= */
window.MODO_DEMO = true;

const ACOES_BLOQUEADAS = {
  insert: "criar um novo registro",
  update: "alterar um registro existente",
  delete: "excluir um registro",
  upsert: "criar ou atualizar um registro",
  rpc:    "executar uma função no banco"
};

function bloquearEscrita(metodo, tabela) {
  const acao = ACOES_BLOQUEADAS[metodo] || "alterar dados";
  const alvo = tabela ? ` na tabela "${tabela}"` : "";
  console.warn(`[MODO DEMO] Bloqueado: ${metodo}${alvo}`);
  alert(
    "🔒 MODO DEMONSTRAÇÃO\n\n" +
    `Esta ação tentaria ${acao}${alvo}.\n\n` +
    "Como este é um ambiente somente de visualização, " +
    "nenhuma alteração foi realizada no sistema."
  );
  // Retorna um "thenable" vazio para não quebrar cadeias .then() existentes
  return Promise.resolve({ data: null, error: null, count: 0 });
}

function criarQueryReadOnly(tabela) {
  return {
    select: (...args) => dbReal.from(tabela).select(...args),
    insert: () => bloquearEscrita("insert", tabela),
    update: () => bloquearEscrita("update", tabela),
    delete: () => bloquearEscrita("delete", tabela),
    upsert: () => bloquearEscrita("upsert", tabela)
  };
}

const db = {
  from: (tabela) => criarQueryReadOnly(tabela),
  auth: {
    // Mantém getSession para páginas que consultam "estou logado?"
    getSession: () => dbReal.auth.getSession(),
    signInWithPassword: () => bloquearEscrita("login"),
    signOut: () => bloquearEscrita("logout"),
    getUser: () => dbReal.auth.getUser()
  },
  rpc: (nome) => bloquearEscrita("rpc", nome),
  // Exposição do client real só para leitura interna, se algum código precisar
  _real: dbReal
};

window.db = db;

let currentUser = null;
let currentStore = null;

const DEMO_STORE_ID = 4; // ⬅️ loja usada na demonstração

/* =========================================================
   HELPER: loja matriz (id_loja = 1)
   ========================================================= */
function isLojaMatriz() {
  return currentStore && Number(currentStore.id_loja) === 1;
}

(function setFavicon() {
  const href = 'logo.png';
  document.querySelectorAll("link[rel*='icon']").forEach(el => el.remove());
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/png';
  link.href = href;
  document.head.appendChild(link);
  const apple = document.createElement('link');
  apple.rel = 'apple-touch-icon';
  apple.href = href;
  document.head.appendChild(apple);
})();

function $(id) { return document.getElementById(id); }

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency", currency: "BRL"
  });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, function (match) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[match];
  });
}

function showMessage(element, text, type = "error") {
  if (!element) return;
  element.innerHTML =
    '<div class="message ' + type + '">' + escapeHtml(text) + "</div>";
}

function go(page) {
  if (page === "catalogo") {
    window.location.href = "catalogo.html?loja=" + encodeURIComponent(DEMO_STORE_ID);
    return;
  }
  window.location.href = page + ".html";
}

function openModal(title, html) {
  const modal = $("modal");
  if ($("modalTitle")) $("modalTitle").textContent = title;
  if ($("modalContent")) $("modalContent").innerHTML = html;
  if (modal) modal.classList.remove("hidden");
}

function closeModal() {
  const modal = $("modal");
  if (modal) modal.classList.add("hidden");
}

/* =========================================================
   🔒 HELPER DE DEMONSTRAÇÃO
   Use em qualquer página: avisoDemo("descrição da ação")
   ========================================================= */
function avisoDemo(descricao) {
  alert(
    "🔒 MODO DEMONSTRAÇÃO\n\n" +
    (descricao || "Esta ação alteraria dados no sistema.") +
    "\n\nNenhuma alteração foi realizada."
  );
}

/* =========================================================
   🔒 BANNER DE DEMONSTRAÇÃO (injetado em toda página)
   ========================================================= */
function injetarBannerDemo() {
  if (document.getElementById("demoBanner")) return;

  const banner = document.createElement("div");
  banner.id = "demoBanner";
  banner.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; z-index: 99999;
    background: #f59e0b; color: #1f2937; font-weight: 600;
    text-align: center; padding: 8px 16px; font-size: 14px;
    font-family: system-ui, -apple-system, sans-serif;
    box-shadow: 0 2px 6px rgba(0,0,0,.15);
  `;
  banner.textContent =
    "🔒 MODO DEMONSTRAÇÃO — Você está apenas visualizando o sistema. Nenhuma alteração é salva.";
  document.body.appendChild(banner);

  // Empurra o conteúdo para baixo do banner
  document.body.style.paddingTop =
    (parseInt(getComputedStyle(document.body).paddingTop) || 0) + 40 + "px";
}

/* =========================================================
   LOGIN (mantido, mas não é usado na demo)
   Se alguém acessar index.html, redireciona para dashboard.
   ========================================================= */
async function login() {
  // Na demo o login não existe
  window.location.replace("dashboard.html");
}

/* =========================================================
   AUTH (no-op na demo)
   ========================================================= */
async function requireAuth() {
  // Modo demo: nunca exige login
  currentUser = { id: "demo", email: "demo@demo.local" };
  return true;
}

async function logout() {
  alert(
    "🔒 MODO DEMONSTRAÇÃO\n\n" +
    "Em um ambiente real, esta ação encerraria sua sessão e " +
    "redirecionaria para a tela de login.\n\n" +
    "Nenhuma alteração foi feita."
  );
}

/* =========================================================
   CONTEXTO DO USUÁRIO / LOJA
   ---------------------------------------------------------
   Na demo: sempre carrega a loja id_loja = 4, sem login.
   ========================================================= */
async function loadUserContext() {
  try {
    console.log("[demo] Carregando loja fixa id_loja =", DEMO_STORE_ID);

    const storeResult = await db
      .from("gestao_loja_lojas")
      .select("*")
      .eq("id_loja", DEMO_STORE_ID)
      .maybeSingle();

    if (storeResult.error) {
      console.error("Erro ao carregar loja:", storeResult.error);
      throw new Error("Erro ao carregar loja: " + storeResult.error.message);
    }

    const store = storeResult.data;
    if (!store) {
      throw new Error(
        "Loja de demonstração (id_loja = " + DEMO_STORE_ID + ") não encontrada."
      );
    }

    currentStore = store;
    window.currentStore = currentStore;

    const nomeLoja = store.nome_fantasia || store.nome || "Loja Demo";

    if ($("userName")) $("userName").textContent = "Visitante (Demo)";
    if ($("userEmail")) $("userEmail").textContent = nomeLoja;
    if ($("storeName")) $("storeName").textContent = nomeLoja;
    if ($("storeDisplayName")) $("storeDisplayName").textContent = nomeLoja;

    if ($("storeDisplayInfo")) {
      const info = [];
      if (store.cnpj) info.push("CNPJ: " + store.cnpj);
      if (store.telefone) info.push("Telefone: " + store.telefone);
      if (store.email) info.push("E-mail: " + store.email);
      if (store.cidade || store.estado) {
        info.push([store.cidade, store.estado].filter(Boolean).join("/"));
      }
      $("storeDisplayInfo").textContent =
        info.length ? info.join(" • ") : "Dados da loja carregados.";
    }

    return true;
  } catch (error) {
    console.error("Erro ao carregar contexto:", error);
    const pageError = $("pageError");
    if (pageError) {
      showMessage(pageError, error.message || "Não foi possível carregar os dados da loja.");
    }
    return false;
  }
}

/* =========================================================
   MENU
   ========================================================= */
async function loadMenu() {
  const menu = $("menu");
  if (!menu) return;

  try {
    const response = await fetch("menu.html", { cache: "no-cache" });
    if (!response.ok) throw new Error("Não foi possível carregar o menu.");
    menu.innerHTML = await response.text();

    if (currentStore && $("storeName")) {
      $("storeName").textContent =
        currentStore.nome_fantasia || currentStore.nome || "Loja";
    }

    const convitesNav = menu.querySelector('[data-page="convites"]');
    if (convitesNav) convitesNav.style.display = isLojaMatriz() ? "" : "none";

    const lojasNav = menu.querySelector('[data-page="lojas"]');
    if (lojasNav) lojasNav.style.display = isLojaMatriz() ? "" : "none";

    // 🔒 Na demo, "Sair" vira um alerta em vez de deslogar
    const logoutBtn = menu.querySelector('[data-page="logout"], .logout, [data-action="logout"]');
    if (logoutBtn) {
      logoutBtn.addEventListener("click", function (e) {
        e.preventDefault();
        logout();
      });
    }

    setActiveNav();
  } catch (error) {
    console.error("Erro ao carregar menu:", error);
  }
}

function setActiveNav() {
  const page = document.body.dataset.page;
  document.querySelectorAll(".nav button").forEach(function (button) {
    button.classList.toggle("active", button.dataset.page === page);
  });
}

/* =========================================================
   DASHBOARD
   ========================================================= */
async function initDashboard() {
  const contextLoaded = await loadUserContext();
  if (!contextLoaded) return;

  await loadMenu();
  setActiveNav();

  if ($("pageSubtitle")) $("pageSubtitle").textContent = "Visão geral da loja (demonstração)";

  try {
    const storeId = currentStore.id_loja;

    const [products, variations, clients] = await Promise.all([
      db.from("gestao_loja_produtos").select("id", { count: "exact", head: true }).eq("id_loja", storeId),
      db.from("gestao_loja_produtos_variacoes").select("id", { count: "exact", head: true }).eq("id_loja", storeId),
      db.from("gestao_loja_clientes").select("id", { count: "exact", head: true }).eq("id_loja", storeId)
    ]);

    if (products.error) throw products.error;
    if (variations.error) throw variations.error;
    if (clients.error) throw clients.error;

    const stock = await db.from("gestao_loja_produtos_variacoes").select("estoque").eq("id_loja", storeId);
    if (stock.error) throw stock.error;

    if ($("countProducts")) $("countProducts").textContent = products.count || 0;
    if ($("countVariations")) $("countVariations").textContent = variations.count || 0;
    if ($("countClients")) $("countClients").textContent = clients.count || 0;

    if ($("totalStock")) {
      $("totalStock").textContent = (stock.data || []).reduce(function (total, item) {
        return total + Number(item.estoque || 0);
      }, 0);
    }
  } catch (error) {
    console.error("Erro ao carregar dashboard:", error);
    const content = $("content");
    if (content) {
      content.insertAdjacentHTML("afterbegin",
        '<div class="message error">' + escapeHtml(error.message || "Erro desconhecido.") + "</div>");
    }
  }
}

/* =========================================================
   PÁGINAS PÚBLICAS
   ========================================================= */
const PUBLIC_PAGES = ["catalogo", "cadastro"];

function isPublicPage() {
  const page = document.body.dataset.page;
  if (PUBLIC_PAGES.includes(page)) return true;
  if (document.getElementById("catalogProducts")) return true;
  return false;
}

function aplicarEstadoMenu(logado) {
  const body = document.body;
  const menu = document.getElementById("menu");
  if (logado) {
    body.classList.add("has-menu");
    if (menu) menu.style.display = "";
  } else {
    body.classList.remove("has-menu");
    if (menu) menu.style.display = "none";
  }
}

async function initPublicPage() {
  const menu = document.getElementById("menu");
  if (!menu) {
    aplicarEstadoMenu(false);
    return;
  }

  // Na demo, catálogo também carrega o menu com a loja 4
  aplicarEstadoMenu(true);
  const contextLoaded = await loadUserContext();
  if (!contextLoaded) {
    aplicarEstadoMenu(false);
    return;
  }
  await loadMenu();
  setActiveNav();
}

/* =========================================================
   INICIALIZAÇÃO POR PÁGINA
   ========================================================= */
document.addEventListener("DOMContentLoaded", async function () {
  injetarBannerDemo();

  // index.html (login) → na demo, redireciona direto para dashboard
  const loginForm = $("loginForm");
  if (!!loginForm) {
    window.location.replace("dashboard.html");
    return;
  }

  // Página de cadastro → na demo, é só visualização
  if (
    document.body.dataset.page === "cadastro" ||
    window.location.pathname.endsWith("/cadastro.html")
  ) {
    console.log("[app] Página de cadastro — modo demonstração.");
    // Não faz nada além de mostrar o banner
    return;
  }

  // Dashboard
  if (document.body.dataset.page === "dashboard") {
    await initDashboard();
    return;
  }

  // Demais páginas (protegidas ou públicas): carrega contexto da loja 4
  const contextLoaded = await loadUserContext();
  if (!contextLoaded) return;

  await loadMenu();
  setActiveNav();
});