let products = [];
let variations = [];
let stockItems = [];
let clients = [];
let suppliers = [];

// Filtros
let categories = [];
let filterCategory = "";
let filterStatus = "";


/* ======================================================
   CARREGAMENTOS BÁSICOS
   ====================================================== */

async function loadProducts() {
  const result = await db
    .from("gestao_loja_produtos")
    .select(`
      id,
      id_loja,
      nome,
      sku,
      estoque,
      estoque_minimo,
      ativo,
      categoria_id
    `)
    .eq("id_loja", currentStore.id_loja)
    .order("nome");

  if (result.error) {
    console.warn("Aviso ao carregar produtos:", result.error.message);
    products = [];
    return;
  }
  products = result.data || [];
}

async function loadVariations() {
  const result = await db
    .from("gestao_loja_produtos_variacoes")
    .select(`
      id,
      id_loja,
      produto_id,
      nome,
      sku,
      estoque,
      estoque_minimo,
      ativo
    `)
    .eq("id_loja", currentStore.id_loja)
    .order("nome");

  if (result.error) {
    console.warn("Aviso ao carregar variações:", result.error.message);
    variations = [];
    return;
  }
  variations = result.data || [];
}

async function loadClients() {
  const result = await db
    .from("gestao_loja_clientes")
    .select(`id, nome`)
    .eq("id_loja", currentStore.id_loja)
    .eq("ativo", true)
    .order("nome");

  if (result.error) {
    console.warn("Aviso ao carregar clientes:", result.error.message);
    clients = [];
    return;
  }
  clients = result.data || [];
}

async function loadSuppliers() {
  const result = await db
    .from("gestao_loja_fornecedores")
    .select(`
      id,
      razao_social,
      nome_fantasia,
      cpf_cnpj,
      email,
      telefone,
      whatsapp,
      contato_responsavel,
      cep,
      endereco,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
      observacoes
    `)
    .eq("id_loja", currentStore.id_loja)
    .eq("ativo", true)
    .order("razao_social");

  if (result.error) {
    console.warn("Aviso ao carregar fornecedores:", result.error.message);
    suppliers = [];
    return;
  }
  suppliers = result.data || [];
}

async function loadCategories() {
  const result = await db
    .from("gestao_loja_categorias")
    .select(`id, nome`)
    .eq("id_loja", currentStore.id_loja)
    .order("nome");

  if (result.error) {
    console.warn("Aviso ao carregar categorias:", result.error.message);
    categories = [];
    return;
  }
  categories = result.data || [];
}


/* ======================================================
   MONTAGEM DO ESTOQUE
   ====================================================== */

async function loadStock() {
  await Promise.all([loadProducts(), loadVariations()]);

  const productIdsWithVariations = new Set(
    variations.map(v => String(v.produto_id))
  );

  stockItems = [];

  products.forEach(product => {
    if (!productIdsWithVariations.has(String(product.id))) {
      stockItems.push({
        type: "produto",
        id: product.id,
        produto_id: product.id,
        produto_nome: product.nome,
        produto_sku: product.sku,
        variacao_nome: null,
        sku: product.sku,
        categoria_id: product.categoria_id || null,
        estoque: Number(product.estoque || 0),
        estoque_minimo: Number(product.estoque_minimo || 0),
        ativo: product.ativo
      });
    }
  });

  variations.forEach(variation => {
    const product = products.find(p => String(p.id) === String(variation.produto_id));
    stockItems.push({
      type: "variacao",
      id: variation.id,
      produto_id: variation.produto_id,
      produto_nome: product ? product.nome : "Produto não encontrado",
      produto_sku: product ? product.sku : null,
      variacao_nome: variation.nome,
      sku: variation.sku,
      categoria_id: product ? (product.categoria_id || null) : null,
      estoque: Number(variation.estoque || 0),
      estoque_minimo: Number(variation.estoque_minimo || 0),
      ativo: variation.ativo
    });
  });

  stockItems.sort((a, b) => {
    const productCompare = a.produto_nome.localeCompare(b.produto_nome, "pt-BR");
    if (productCompare !== 0) return productCompare;
    const variationA = a.variacao_nome || "";
    const variationB = b.variacao_nome || "";
    return variationA.localeCompare(variationB, "pt-BR");
  });
}


/* ======================================================
   RENDERIZAÇÃO
   ====================================================== */

async function renderStock() {
  try {
    await loadStock();
  } catch (error) {
    console.error("Erro ao carregar estoque:", error);
    if ($("stockTable")) {
      $("stockTable").innerHTML = `<div class="message error">${escapeHtml(error.message)}</div>`;
    }
    return;
  }
  renderStockTable();
}

function renderStockTable() {
  let items = stockItems.slice();

  if (filterCategory) {
    items = items.filter(item => String(item.categoria_id) === String(filterCategory));
  }

  if (filterStatus) {
    items = items.filter(item => {
      const estoque = Number(item.estoque || 0);
      const minimo = Number(item.estoque_minimo || 0);
      if (filterStatus === "sem") return estoque <= 0;
      if (filterStatus === "baixo") return estoque > 0 && estoque <= minimo;
      if (filterStatus === "normal") return estoque > minimo;
      return true;
    });
  }

  if (!items.length) {
    $("stockTable").innerHTML = '<div class="empty">Nenhum item encontrado com os filtros aplicados.</div>';
    return;
  }

  $("stockTable").innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Produto</th>
            <th>Variação</th>
            <th>SKU</th>
            <th>Estoque</th>
            <th>Mínimo</th>
            <th>Situação</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => {
            const estoque = Number(item.estoque || 0);
            const minimo = Number(item.estoque_minimo || 0);
            let situacaoLabel = "Normal";
            let situacaoClass = "badge-green";

            if (estoque <= 0) {
              situacaoLabel = "Sem estoque";
              situacaoClass = "badge-red";
            } else if (estoque <= minimo) {
              situacaoLabel = "Estoque baixo";
              situacaoClass = "badge-red";
            }

            return `
              <tr>
                <td>
                  <strong>${escapeHtml(item.produto_nome)}</strong>
                  ${item.produto_sku ? `<br><span class="muted">${escapeHtml(item.produto_sku)}</span>` : ""}
                </td>
                <td>${item.variacao_nome ? escapeHtml(item.variacao_nome) : `<span class="muted">Sem variação</span>`}</td>
                <td>${escapeHtml(item.sku || "-")}</td>
                <td><strong>${estoque}</strong></td>
                <td>${minimo}</td>
                <td><span class="badge ${situacaoClass}">${situacaoLabel}</span></td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderCategoryOptions() {
  const select = $("filterCategory");
  if (!select) return;

  const currentValue = select.value || "";

  select.innerHTML = `
    <option value="">Todas as categorias</option>
    ${categories.map(category => `<option value="${category.id}">${escapeHtml(category.nome)}</option>`).join("")}
  `;
  select.value = currentValue;
}

function applyStockFilters() {
  filterCategory = $("filterCategory") ? $("filterCategory").value : "";
  filterStatus = $("filterStatus") ? $("filterStatus").value : "";
  renderStockTable();
}


/* ======================================================
   MODAL DE MOVIMENTAÇÃO
   ====================================================== */

function updateMovementFields() {
  const type = $("m_tipo").value;
  const entityContainer = $("movementEntityContainer");
  const supplierContainer = $("supplierContainer");
  const clientContainer = $("clientContainer");
  const supplierSelect = $("m_fornecedor");
  const clientSelect = $("m_cliente");
  const adjustmentContainer = $("adjustmentTypeContainer");

  if (adjustmentContainer) adjustmentContainer.style.display = type === "Ajuste" ? "block" : "none";
  if (supplierContainer) supplierContainer.style.display = type === "Entrada" ? "block" : "none";
  if (clientContainer) clientContainer.style.display = type === "Saída" ? "block" : "none";
  if (entityContainer) entityContainer.style.display = type === "Ajuste" ? "none" : "block";

  if (supplierSelect) {
    supplierSelect.required = type === "Entrada";
    if (type !== "Entrada") supplierSelect.value = "";
  }

  if (clientSelect) {
    clientSelect.required = type === "Saída";
    if (type !== "Saída") clientSelect.value = "";
  }
}

function openMovement() {
  if (!stockItems.length) {
    alert("Não existem produtos para movimentar o estoque.");
    return;
  }

  openModal("Movimentar estoque", `
    <form onsubmit="saveMovement(event)">
      <label>Produto / Variação *</label>
      <select id="m_item" required onchange="updateStockWarning()">
        <option value="">Selecione</option>
        ${stockItems.map(item => {
          const variationText = item.variacao_nome ? " — " + item.variacao_nome : " — Sem variação";
          return `<option value="${item.type}:${item.id}">${escapeHtml(item.produto_nome)}${escapeHtml(variationText)} — Estoque: ${item.estoque}</option>`;
        }).join("")}
      </select>

      <div class="grid2">
        <div>
          <label>Tipo *</label>
          <select id="m_tipo" onchange="updateMovementFields(); updateStockWarning();">
            <option value="Entrada">Entrada</option>
            <option value="Saída">Saída</option>
            <option value="Ajuste">Ajuste</option>
          </select>
        </div>
        <div>
          <label>Quantidade *</label>
          <input id="m_qtd" type="number" min="1" step="1" required oninput="updateStockWarning()">
        </div>
      </div>

      <div id="stockWarning" style="display:none;"></div>

      <div id="adjustmentTypeContainer" style="display:none; margin-top:14px;">
        <label>Tipo de ajuste *</label>
        <div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap;padding:10px 0;">
          <label style="display:flex;align-items:center;gap:7px;margin:0;cursor:pointer;">
            <input type="radio" name="m_ajuste_tipo" value="perda" checked>
            Perda / redução
          </label>
          <label style="display:flex;align-items:center;gap:7px;margin:0;cursor:pointer;">
            <input type="radio" name="m_ajuste_tipo" value="acerto_positivo">
            Acerto positivo
          </label>
        </div>
      </div>

      <div id="movementEntityContainer">
        <div id="supplierContainer">
          <label>Fornecedor *</label>
          <div style="display:flex;gap:8px;align-items:flex-end;">
            <div style="flex:1;">
              <select id="m_fornecedor">
                <option value="">Selecione o fornecedor</option>
                ${suppliers.map(s => `<option value="${s.id}">${escapeHtml(s.nome_fantasia || s.razao_social || "Fornecedor")}</option>`).join("")}
              </select>
            </div>
            <button type="button" class="btn btn-secondary" onclick="openSupplierForm()">+ Cadastrar fornecedor</button>
          </div>
        </div>

        <div id="clientContainer" style="display:none;">
          <label>Cliente *</label>
          <div style="display:flex;gap:8px;align-items:flex-end;">
            <div style="flex:1;">
              <select id="m_cliente">
                <option value="">Selecione o cliente</option>
                ${clients.map(c => `<option value="${c.id}">${escapeHtml(c.nome)}</option>`).join("")}
              </select>
            </div>
            <button type="button" class="btn btn-secondary" onclick="openClientForm()">+ Cadastrar cliente</button>
          </div>
        </div>
      </div>

      <label>Motivo</label>
      <input id="m_motivo" placeholder="Ex.: compra, venda, perda...">

      <label>Observação</label>
      <textarea id="m_obs" rows="3"></textarea>

      <button class="btn btn-primary full" type="submit">
        Registrar movimentação
      </button>
    </form>
  `);

  loadMovementEntities();
}

function updateStockWarning() {
  const warning = $("stockWarning");
  if (!warning) return;

  const type = $("m_tipo") ? $("m_tipo").value : "";
  const quantity = $("m_qtd") ? Number($("m_qtd").value || 0) : 0;
  const itemValue = $("m_item") ? $("m_item").value : "";

  if (type !== "Saída" || !quantity || !itemValue) {
    warning.style.display = "none";
    warning.innerHTML = "";
    return;
  }

  const [itemType, itemId] = itemValue.split(":");
  const item = stockItems.find(x => x.type === itemType && String(x.id) === String(itemId));

  if (!item) {
    warning.style.display = "none";
    warning.innerHTML = "";
    return;
  }

  const estoqueAtual = Number(item.estoque || 0);

  if (quantity > estoqueAtual) {
    const falta = quantity - estoqueAtual;
    warning.style.display = "block";
    warning.innerHTML = `
      <div style="margin:10px 0;padding:12px;border:1px solid #dc2626;border-radius:8px;background:#fef2f2;color:#991b1b;">
        <strong>⚠️ Estoque insuficiente</strong><br>
        Estoque atual: <strong>${estoqueAtual}</strong><br>
        Quantidade solicitada: <strong>${quantity}</strong><br>
        Faltam: <strong>${falta}</strong>
      </div>
    `;
  } else {
    warning.style.display = "none";
    warning.innerHTML = "";
  }
}

async function loadMovementEntities() {
  try {
    await Promise.all([loadClients(), loadSuppliers()]);
    const supplierSelect = $("m_fornecedor");
    const clientSelect = $("m_cliente");

    if (supplierSelect) {
      supplierSelect.innerHTML = `
        <option value="">Selecione o fornecedor</option>
        ${suppliers.map(s => `<option value="${s.id}">${escapeHtml(s.nome_fantasia || s.razao_social || "Fornecedor")}</option>`).join("")}
      `;
    }

    if (clientSelect) {
      clientSelect.innerHTML = `
        <option value="">Selecione o cliente</option>
        ${clients.map(c => `<option value="${c.id}">${escapeHtml(c.nome)}</option>`).join("")}
      `;
    }

    updateMovementFields();
  } catch (error) {
    console.error("Erro ao carregar clientes e fornecedores:", error);
  }
}


/* ======================================================
   CADASTRO DE FORNECEDOR (MODO DEMO)
   ====================================================== */

function openSupplierForm() {
  openModal("Cadastrar fornecedor", `
    <form onsubmit="saveSupplier(event)">
      <div class="grid2">
        <div><label>Razão social *</label><input id="s_razao_social" required></div>
        <div><label>Nome fantasia</label><input id="s_nome_fantasia"></div>
      </div>
      <div class="grid2">
        <div><label>CPF / CNPJ</label><input id="s_cpf_cnpj"></div>
        <div><label>Contato responsável</label><input id="s_contato_responsavel"></div>
      </div>
      <div class="grid2">
        <div><label>E-mail</label><input id="s_email" type="email"></div>
        <div><label>Telefone</label><input id="s_telefone"></div>
      </div>
      <div class="grid2">
        <div><label>WhatsApp</label><input id="s_whatsapp"></div>
        <div><label>CEP</label><input id="s_cep"></div>
      </div>
      <div class="grid2">
        <div><label>Endereço</label><input id="s_endereco"></div>
        <div><label>Número</label><input id="s_numero"></div>
      </div>
      <div class="grid2">
        <div><label>Complemento</label><input id="s_complemento"></div>
        <div><label>Bairro</label><input id="s_bairro"></div>
      </div>
      <div class="grid2">
        <div><label>Cidade</label><input id="s_cidade"></div>
        <div><label>Estado</label><input id="s_estado" maxlength="2"></div>
      </div>
      <label>Observações</label>
      <textarea id="s_observacoes" rows="3"></textarea>
      <button class="btn btn-primary full" type="submit">Cadastrar fornecedor</button>
    </form>
  `);
}

async function saveSupplier(ev) {
  ev.preventDefault();
  const razaoSocial = $("s_razao_social").value.trim();

  if (!razaoSocial) {
    alert("Informe a razão social.");
    return;
  }

  // MODO DEMONSTRAÇÃO
  alert(
    "🔒 MODO DEMONSTRAÇÃO\n\n" +
    "Em um ambiente real, ao clicar em 'Cadastrar fornecedor', o sistema iria:\n\n" +
    "• Salvar os dados do fornecedor.\n" +
    "• Vinculá-lo à sua lista de parceiros.\n" +
    "• Permitir selecioná-lo em novas movimentações e compras.\n\n" +
    "Nenhuma alteração foi feita."
  );
  closeModal();
}


/* ======================================================
   CADASTRO DE CLIENTE (MODO DEMO)
   ====================================================== */

function openClientForm() {
  openModal("Cadastrar cliente", `
    <form onsubmit="saveClient(event)">
      <div class="grid2">
        <div>
          <label>Tipo de cliente *</label>
          <select id="c_tipo_cliente">
            <option value="Pessoa Física">Pessoa Física</option>
            <option value="Pessoa Jurídica">Pessoa Jurídica</option>
          </select>
        </div>
        <div><label>Nome *</label><input id="c_nome" required></div>
      </div>
      <div class="grid2">
        <div><label>Razão social</label><input id="c_razao_social"></div>
        <div><label>Nome fantasia</label><input id="c_nome_fantasia"></div>
      </div>
      <div class="grid2">
        <div><label>CPF / CNPJ</label><input id="c_cpf_cnpj"></div>
        <div><label>E-mail</label><input id="c_email" type="email"></div>
      </div>
      <div class="grid2">
        <div><label>Telefone</label><input id="c_telefone"></div>
        <div><label>WhatsApp</label><input id="c_whatsapp"></div>
      </div>
      <div class="grid2">
        <div><label>CEP</label><input id="c_cep"></div>
        <div><label>Endereço</label><input id="c_endereco"></div>
      </div>
      <div class="grid2">
        <div><label>Número</label><input id="c_numero"></div>
        <div><label>Complemento</label><input id="c_complemento"></div>
      </div>
      <div class="grid2">
        <div><label>Bairro</label><input id="c_bairro"></div>
        <div><label>Cidade</label><input id="c_cidade"></div>
      </div>
      <div class="grid2">
        <div><label>Estado</label><input id="c_estado" maxlength="2"></div>
      </div>
      <label>Observações</label>
      <textarea id="c_observacoes" rows="3"></textarea>
      <button class="btn btn-primary full" type="submit">Cadastrar cliente</button>
    </form>
  `);
}

async function saveClient(ev) {
  ev.preventDefault();
  const nome = $("c_nome").value.trim();

  if (!nome) {
    alert("Informe o nome do cliente.");
    return;
  }

  // MODO DEMONSTRAÇÃO
  alert(
    "🔒 MODO DEMONSTRAÇÃO\n\n" +
    "Em um ambiente real, ao clicar em 'Cadastrar cliente', o sistema iria:\n\n" +
    "• Salvar os dados cadastrais.\n" +
    "• Adicionar o cliente à sua base.\n" +
    "• Permitir registrar compras e saídas vinculadas a ele.\n\n" +
    "Nenhuma alteração foi feita."
  );
  closeModal();
}


/* ======================================================
   SALVAR MOVIMENTAÇÃO (MODO DEMO)
   ====================================================== */

async function saveMovement(ev) {
  ev.preventDefault();

  const itemValue = $("m_item").value;
  const type = $("m_tipo").value;
  const quantity = Number($("m_qtd").value);
  const ajusteTipoElement = document.querySelector('input[name="m_ajuste_tipo"]:checked');
  const ajusteTipo = ajusteTipoElement ? ajusteTipoElement.value : "perda";
  const fornecedorId = $("m_fornecedor") ? $("m_fornecedor").value : "";
  const clienteId = $("m_cliente") ? $("m_cliente").value : "";

  if (!itemValue) {
    alert("Selecione um produto ou variação.");
    return;
  }
  if (!quantity || quantity <= 0) {
    alert("Informe uma quantidade válida.");
    return;
  }
  if (type === "Entrada" && !fornecedorId) {
    alert("Selecione o fornecedor.");
    return;
  }
  if (type === "Saída" && !clienteId) {
    alert("Selecione o cliente.");
    return;
  }

  const [itemType, itemId] = itemValue.split(":");
  const item = stockItems.find(x => x.type === itemType && String(x.id) === String(itemId));

  if (!item) {
    alert("Produto ou variação não encontrado.");
    return;
  }

  if (type === "Saída" && quantity > Number(item.estoque || 0)) {
    const continuar = confirm(
      "⚠️ ESTOQUE INSUFICIENTE\n\n" +
      `Produto: ${item.produto_nome}\n` +
      (item.variacao_nome ? `Variação: ${item.variacao_nome}\n` : "") +
      `Estoque atual: ${item.estoque}\n` +
      `Quantidade solicitada: ${quantity}\n\n` +
      "Deseja continuar mesmo assim?"
    );
    if (!continuar) return;
  }

  // MODO DEMONSTRAÇÃO
  const acaoTexto = type === "Entrada" ? "registrar a entrada" : (type === "Saída" ? "registrar a saída" : "fazer o ajuste");
  const detalheEstoque = type === "Ajuste" 
    ? (ajusteTipo === "perda" ? `reduzir ${quantity} unidade(s)` : `aumentar ${quantity} unidade(s)`)
    : `${type === "Entrada" ? "adicionar" : "remover"} ${quantity} unidade(s)`;

  alert(
    "🔒 MODO DEMONSTRAÇÃO\n\n" +
    `Em um ambiente real, ao registrar esta movimentação, o sistema iria:\n\n` +
    `• ${acaoTexto.charAt(0).toUpperCase() + acaoTexto.slice(1)} no estoque do produto.\n` +
    `• ${detalheEstoque.charAt(0).toUpperCase() + detalheEstoque.slice(1)} do saldo atual.\n` +
    "• Gerar um registro no histórico de movimentações.\n" +
    (type === "Entrada" ? "• Vincular a entrada ao fornecedor selecionado.\n" : "") +
    (type === "Saída" ? "• Vincular a saída ao cliente selecionado.\n" : "") +
    "\nNenhuma alteração foi feita."
  );

  closeModal();
}


/* ======================================================
   BOOT
   ====================================================== */

document.addEventListener("DOMContentLoaded", async function() {
  // No modo demo, não exige login.
  if (!currentStore && typeof loadUserContext === "function") {
    await loadUserContext();
  }

  if (typeof setActiveNav === "function") setActiveNav();

  if ($("pageSubtitle")) {
    $("pageSubtitle").textContent = "Acompanhe entradas, saídas e saldos";
  }

  await loadClients();
  await loadSuppliers();
  await loadCategories();
  
  renderCategoryOptions();
  await renderStock();
});