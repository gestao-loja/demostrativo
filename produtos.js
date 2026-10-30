let products = [];
let categories = [];

/*
 * ============================================================
 * CONTROLES DE IMAGEM DO PRODUTO
 * ============================================================
 */

let currentProductImageUrl = null;
let productImageOriginalUrl = null;
let productImageRemoved = false;
let productImageNewFile = null;
let productImageNewUrl = null;


async function loadCategories() {
  if (!currentStore || !currentStore.id_loja) {
    throw new Error("Não foi possível identificar a loja.");
  }

  const result = await db
    .from("gestao_loja_categorias")
    .select("id,id_loja,nome")
    .eq("id_loja", currentStore.id_loja)
    .order("nome");

  if (result.error) {
    console.warn("Aviso ao carregar categorias:", result.error.message);
    categories = [];
    return;
  }

  categories = result.data || [];
}


async function loadProducts() {
  const result = await db
    .from("gestao_loja_produtos")
    .select(`
      id,
      id_loja,
      nome,
      sku,
      descricao,
      imagem_principal,
      categoria_id,
      unidade_medida,
      preco_custo,
      preco_venda,
      estoque_minimo,
      ativo,
      exibir_catalogo,
      exibir_preco_catalogo,
      observacoes,
      ncm,
      cfop,
      cest,
      unidade,
      origem_mercadoria,
      created_at,
      atualizado_em,
      precificacao_materiais,
      precificacao_embalagem,
      precificacao_mao_obra,
      precificacao_outros,
      precificacao_taxas_percentual,
      precificacao_impostos_percentual,
      precificacao_despesas_percentual,
      precificacao_margem_percentual,
      precificacao_custo_total,
      precificacao_preco_sugerido
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


/* ======================================================
   PRECIFICAÇÃO — Fórmula
   ====================================================== */

function calcularPrecificacao(dados) {
  const materiais = Number(dados.materiais) || 0;
  const embalagem = Number(dados.embalagem) || 0;
  const maoObra = Number(dados.maoObra) || 0;
  const outros = Number(dados.outros) || 0;

  const taxas = Number(dados.taxas) || 0;
  const impostos = Number(dados.impostos) || 0;
  const despesas = Number(dados.despesas) || 0;
  const margem = Number(dados.margem) || 0;

  const custoTotal = materiais + embalagem + maoObra + outros;
  const percentualTotal = taxas + impostos + despesas + margem;

  if (percentualTotal >= 100) {
    return {
      custoTotal: Number(custoTotal.toFixed(2)),
      precoSugerido: 0,
      divisor: 0,
      erro: "A soma de taxas, impostos, despesas e margem deve ser menor que 100%. Atualmente: " + percentualTotal.toFixed(2) + "%."
    };
  }

  const divisor = 1 - (percentualTotal / 100);
  const precoSugerido = divisor > 0 ? custoTotal / divisor : 0;

  return {
    custoTotal: Number(custoTotal.toFixed(2)),
    precoSugerido: Number(precoSugerido.toFixed(2)),
    divisor: Number(divisor.toFixed(4)),
    erro: null
  };
}

function atualizarPrecificacao() {
  const getNum = (id) => {
    const el = $(id);
    return el ? Number(el.value) || 0 : 0;
  };

  const resultado = calcularPrecificacao({
    materiais: getNum("prec_materiais"),
    embalagem: getNum("prec_embalagem"),
    maoObra: getNum("prec_mao_obra"),
    outros: getNum("prec_outros"),
    taxas: getNum("prec_taxas"),
    impostos: getNum("prec_impostos"),
    despesas: getNum("prec_despesas"),
    margem: getNum("prec_margem")
  });

  const custoEl = $("prec_custo_total");
  const precoEl = $("prec_preco_sugerido");
  const avisoEl = $("prec_aviso");

  if (custoEl) custoEl.value = resultado.custoTotal.toFixed(2);
  if (precoEl) precoEl.value = resultado.precoSugerido.toFixed(2);

  if (avisoEl) {
    if (resultado.erro) {
      avisoEl.textContent = "⚠ " + resultado.erro;
      avisoEl.style.color = "#c0392b";
    } else {
      avisoEl.textContent = "Divisor aplicado: " + resultado.divisor + "  •  PV = C / (1 − (D + L) / 100)";
      avisoEl.style.color = "#666";
    }
  }

  const btn = $("prec_aplicar");
  if (btn) {
    btn.disabled = !!resultado.erro || resultado.precoSugerido <= 0;
  }
}

function aplicarPrecoSugerido() {
  const sugerido = $("prec_preco_sugerido");
  const preco = $("p_preco");

  if (!sugerido || !preco) return;

  const valor = Number(sugerido.value) || 0;
  if (valor <= 0) {
    alert("Calcule a precificação antes de aplicar.");
    return;
  }

  preco.value = valor.toFixed(2);
}


/* ======================================================
   IMAGEM DO PRODUTO (MODO DEMO BLOQUEADO)
   ====================================================== */

function previewProductImage(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("Selecione um arquivo de imagem.");
    event.target.value = "";
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert("A imagem deve ter no máximo 5 MB.");
    event.target.value = "";
    return;
  }

  const fileNameEl = $("imageFileName");
  if (fileNameEl) fileNameEl.textContent = file.name;

  const reader = new FileReader();
  reader.onload = function (e) {
    const preview = $("imagePreview");
    const container = $("imagePreviewContainer");
    if (preview) preview.src = e.target.result;
    if (container) container.style.display = "block";
  };
  reader.readAsDataURL(file);

  productImageNewFile = file;
  productImageRemoved = false;

  // MODO DEMO: Avisa que o upload não será salvo
  alert(
    "🔒 MODO DEMONSTRAÇÃO\n\n" +
    "A imagem foi carregada na tela apenas para visualização.\n\n" +
    "Em um ambiente real, ao clicar em 'Salvar produto', a imagem seria enviada para o servidor."
  );
}

function removeProductImage() {
  const input = $("p_imagem");
  if (input) input.value = "";

  const fileNameEl = $("imageFileName");
  if (fileNameEl) fileNameEl.textContent = "Nenhuma imagem selecionada";

  const preview = $("imagePreview");
  if (preview) preview.src = "";

  const container = $("imagePreviewContainer");
  if (container) container.style.display = "none";

  productImageRemoved = true;
  productImageNewFile = null;
  productImageNewUrl = null;
  currentProductImageUrl = null;
}


/* ======================================================
   CATEGORIA (MODO DEMO)
   ====================================================== */

function newCategory() {
  openModal("Nova categoria", categoryForm());
}

function categoryForm() {
  return `
    <form onsubmit="saveCategory(event)">
      <div>
        <label for="c_nome">Nome da categoria *</label>
        <input id="c_nome" type="text" required maxlength="100" placeholder="Ex.: Canecas, Camisetas, Chinelos" autocomplete="off">
      </div>
      <button class="btn btn-primary full" type="submit" style="margin-top:16px;">
        Salvar categoria
      </button>
    </form>
  `;
}

async function saveCategory(ev) {
  ev.preventDefault();

  const nome = $("c_nome").value.trim();
  if (!nome) {
    alert("Informe o nome da categoria.");
    return;
  }

  // MODO DEMONSTRAÇÃO
  alert(
    "🔒 MODO DEMONSTRAÇÃO\n\n" +
    "Em um ambiente real, ao clicar em 'Salvar categoria', o sistema iria:\n\n" +
    "• Criar uma nova categoria de produtos.\n" +
    "• Vinculá-la à sua loja.\n" +
    "• Deixá-la disponível no momento de cadastrar um produto.\n\n" +
    "Nenhuma alteração foi feita."
  );

  closeModal();
}


/* ======================================================
   LISTAGEM
   ====================================================== */

async function renderProducts() {
  try {
    await loadProducts();
    await loadCategories(); // Garante que as categorias estejam atualizadas
  } catch (e) {
    if ($("productsTable")) {
      $("productsTable").innerHTML = `<div class="message error">${escapeHtml(e.message)}</div>`;
    }
    return;
  }

  if (!products.length) {
    if ($("productsTable")) {
      $("productsTable").innerHTML = `<div class="empty">Nenhum produto cadastrado.</div>`;
    }
    return;
  }

  if ($("productsTable")) {
    $("productsTable").innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Imagem</th>
              <th>Produto</th>
              <th>SKU</th>
              <th>Categoria</th>
              <th>Unidade</th>
              <th>NCM</th>
              <th>Preço</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${products.map(function(p) {
              const categoria = categories.find(c => String(c.id) === String(p.categoria_id));
              const imageCell = p.imagem_principal
                ? `<img src="${escapeHtml(p.imagem_principal)}" alt="${escapeHtml(p.nome)}" style="width:50px;height:50px;object-fit:cover;border-radius:8px;border:1px solid #ddd;">`
                : '<span class="muted">—</span>';

              return `
                <tr>
                  <td>${imageCell}</td>
                  <td><strong>${escapeHtml(p.nome)}</strong></td>
                  <td><strong>${escapeHtml(p.sku || "-")}</strong></td>
                  <td>${categoria ? escapeHtml(categoria.nome) : "-"}</td>
                  <td>${escapeHtml(p.unidade_medida || "UN")}</td>
                  <td>${p.ncm ? escapeHtml(p.ncm) : '<span class="muted">—</span>'}</td>
                  <td>${money(p.preco_venda)}</td>
                  <td><span class="badge ${p.ativo ? "badge-green" : "badge-red"}">${p.ativo ? "Ativo" : "Inativo"}</span></td>
                  <td><button class="btn btn-secondary" onclick="editProduct('${p.id}')">Editar</button></td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }
}


/* ======================================================
   FORMULÁRIO DE PRODUTO
   ====================================================== */

function productForm(p = {}) {
  const categoryOptions = categories.map(function(c) {
    return `<option value="${c.id}" ${String(p.categoria_id || "") === String(c.id) ? "selected" : ""}>${escapeHtml(c.nome)}</option>`;
  }).join("");

  const prec = {
    materiais: p.precificacao_materiais ?? 0,
    embalagem: p.precificacao_embalagem ?? 0,
    maoObra:   p.precificacao_mao_obra   ?? 0,
    outros:    p.precificacao_outros     ?? 0,
    taxas:     p.precificacao_taxas_percentual    ?? 0,
    impostos:  p.precificacao_impostos_percentual ?? 0,
    despesas:  p.precificacao_despesas_percentual ?? 0,
    margem:    p.precificacao_margem_percentual   ?? 30,
    custoTotal: p.precificacao_custo_total    ?? 0,
    precoSugerido: p.precificacao_preco_sugerido ?? 0
  };

  const imagePreview = p.imagem_principal
    ? `
      <div id="imagePreviewContainer" style="margin-top:15px;text-align:center;">
        <img id="imagePreview" src="${escapeHtml(p.imagem_principal)}" alt="Imagem do produto" style="width:180px;height:180px;object-fit:cover;border-radius:10px;border:1px solid #ddd;">
        <br>
        <button type="button" class="btn btn-secondary" style="margin-top:10px;" onclick="removeProductImage()">Remover imagem</button>
      </div>
    `
    : `
      <div id="imagePreviewContainer" style="display:none;margin-top:15px;text-align:center;">
        <img id="imagePreview" src="" alt="Pré-visualização" style="width:180px;height:180px;object-fit:cover;border-radius:10px;border:1px solid #ddd;">
        <br>
        <button type="button" class="btn btn-secondary" style="margin-top:10px;" onclick="removeProductImage()">Remover imagem</button>
      </div>
    `;

  return `
    <form onsubmit="saveProduct(event, ${p.id ? `'${p.id}'` : "null"})">
      <div>
        <label>SKU</label>
        <input id="p_sku" value="${escapeHtml(p.sku || "Gerado automaticamente")}" readonly>
        <small class="muted">O SKU é gerado automaticamente pelo sistema.</small>
      </div>

      <div style="margin-top:15px;">
        <label>Imagem do produto</label>
        <div style="border:2px dashed #d1d5db;border-radius:10px;padding:20px;text-align:center;margin-top:5px;">
          <label for="p_imagem" class="btn btn-primary" style="display:inline-block;cursor:pointer;">Selecionar imagem</label>
          <input type="file" id="p_imagem" accept="image/*" style="display:none;" onchange="previewProductImage(event)">
          <div id="imageFileName" class="muted" style="margin-top:10px;">${p.imagem_principal ? "Imagem atual" : "Nenhuma imagem selecionada"}</div>
          ${imagePreview}
        </div>
      </div>

      <div class="grid2">
        <div><label>Nome *</label><input id="p_nome" required value="${escapeHtml(p.nome || "")}"></div>
        <div>
          <label>Categoria</label>
          <select id="p_categoria">
            <option value="">Sem categoria</option>
            ${categoryOptions}
          </select>
        </div>
      </div>

      <div>
        <label>Descrição</label>
        <textarea id="p_descricao" rows="3">${escapeHtml(p.descricao || "")}</textarea>
      </div>

      <div class="grid2">
        <div><label>Unidade de medida</label><input id="p_unidade" value="${escapeHtml(p.unidade_medida || "UN")}"></div>
        <div><label>Preço de venda</label><input id="p_preco" type="number" step="0.01" min="0" value="${p.preco_venda ?? 0}"></div>
      </div>

      <div class="grid2">
        <div><label>Preço de custo</label><input id="p_custo" type="number" step="0.01" min="0" value="${p.preco_custo ?? 0}"></div>
        <div><label>Estoque mínimo</label><input id="p_minimo" type="number" step="0.001" min="0" value="${p.estoque_minimo ?? 0}"></div>
      </div>

      <div style="margin-top:20px;padding-top:15px;border-top:1px solid #ddd;">
        <strong>Precificação do produto</strong>
        <div class="muted" style="font-size:12px;margin-top:4px;margin-bottom:12px;">
          Fórmula aplicada: <code>PV = C / (1 − (D + L) / 100)</code>
        </div>

        <div class="grid2">
          <div><label>Materiais (R$)</label><input id="prec_materiais" type="number" step="0.01" min="0" value="${prec.materiais}" oninput="atualizarPrecificacao()"></div>
          <div><label>Embalagem (R$)</label><input id="prec_embalagem" type="number" step="0.01" min="0" value="${prec.embalagem}" oninput="atualizarPrecificacao()"></div>
        </div>

        <div class="grid2">
          <div><label>Mão de obra (R$)</label><input id="prec_mao_obra" type="number" step="0.01" min="0" value="${prec.maoObra}" oninput="atualizarPrecificacao()"></div>
          <div><label>Outros custos (R$)</label><input id="prec_outros" type="number" step="0.01" min="0" value="${prec.outros}" oninput="atualizarPrecificacao()"></div>
        </div>

        <div class="grid2">
          <div><label>Taxas (%)</label><input id="prec_taxas" type="number" step="0.001" min="0" max="100" value="${prec.taxas}" oninput="atualizarPrecificacao()"><small class="muted">Ex.: maquininha, gateway.</small></div>
          <div><label>Impostos (%)</label><input id="prec_impostos" type="number" step="0.001" min="0" max="100" value="${prec.impostos}" oninput="atualizarPrecificacao()"></div>
        </div>

        <div class="grid2">
          <div><label>Despesas fixas rateadas (%)</label><input id="prec_despesas" type="number" step="0.001" min="0" max="100" value="${prec.despesas}" oninput="atualizarPrecificacao()"></div>
          <div><label>Margem de lucro desejada (%)</label><input id="prec_margem" type="number" step="0.001" min="0" max="100" value="${prec.margem}" oninput="atualizarPrecificacao()"></div>
        </div>

        <div id="prec_aviso" class="muted" style="font-size:12px;margin:8px 0 12px;"></div>

        <div class="grid2">
          <div><label>Custo total (R$)</label><input id="prec_custo_total" type="number" step="0.01" readonly value="${Number(prec.custoTotal).toFixed(2)}"></div>
          <div><label>Preço de venda sugerido (R$)</label><input id="prec_preco_sugerido" type="number" step="0.01" readonly value="${Number(prec.precoSugerido).toFixed(2)}"></div>
        </div>

        <button id="prec_aplicar" type="button" class="btn btn-secondary" onclick="aplicarPrecoSugerido()" style="margin-top:8px;">
          Aplicar preço sugerido em "Preço de venda"
        </button>
      </div>

      <div style="margin-top:20px;padding-top:15px;border-top:1px solid #ddd;">
        <strong>Dados fiscais (NF-e)</strong>
        <div class="muted" style="font-size:12px;margin-top:4px;margin-bottom:12px;">Usados na emissão de NF-e. NCM é obrigatório para PJ.</div>

        <div class="grid2">
          <div><label>NCM</label><input id="p_ncm" maxlength="8" placeholder="00000000" value="${escapeHtml(p.ncm || "")}" oninput="this.value = this.value.replace(/\\D/g, '').slice(0,8)"><small class="muted">8 dígitos, sem pontos</small></div>
          <div><label>CFOP</label><input id="p_cfop" maxlength="4" placeholder="5102" value="${escapeHtml(p.cfop || "5102")}" oninput="this.value = this.value.replace(/\\D/g, '').slice(0,4)"></div>
        </div>

        <div class="grid2">
          <div><label>CEST</label><input id="p_cest" maxlength="7" placeholder="0000000" value="${escapeHtml(p.cest || "")}" oninput="this.value = this.value.replace(/\\D/g, '').slice(0,7)"><small class="muted">Opcional</small></div>
          <div>
            <label>Unidade fiscal</label>
            <select id="p_unidade_fiscal">
              ${["UN", "PC", "CX", "KG", "G", "L", "ML", "M", "M2", "M3", "PAR", "DZ"].map(u => `<option value="${u}" ${(p.unidade || "UN") === u ? "selected" : ""}>${u}</option>`).join("")}
            </select>
          </div>
        </div>

        <div>
          <label>Origem da mercadoria</label>
          <select id="p_origem_mercadoria">
            <option value="0" ${(p.origem_mercadoria || "0") === "0" ? "selected" : ""}>0 - Nacional</option>
            <option value="1" ${p.origem_mercadoria === "1" ? "selected" : ""}>1 - Estrangeira (importação direta)</option>
            <option value="2" ${p.origem_mercadoria === "2" ? "selected" : ""}>2 - Estrangeira (mercado interno)</option>
            <option value="3" ${p.origem_mercadoria === "3" ? "selected" : ""}>3 - Nacional c/ importação 40%–70%</option>
            <option value="4" ${p.origem_mercadoria === "4" ? "selected" : ""}>4 - Nacional (processos produtivos básicos)</option>
            <option value="5" ${p.origem_mercadoria === "5" ? "selected" : ""}>5 - Nacional c/ importação ≤ 40%</option>
            <option value="6" ${p.origem_mercadoria === "6" ? "selected" : ""}>6 - Estrangeira (sem similar nacional)</option>
            <option value="7" ${p.origem_mercadoria === "7" ? "selected" : ""}>7 - Estrangeira (mercado interno, sem similar)</option>
            <option value="8" ${p.origem_mercadoria === "8" ? "selected" : ""}>8 - Nacional c/ importação > 70%</option>
          </select>
        </div>
      </div>

      <label style="margin-top:15px; display:block;"><input id="p_ativo" type="checkbox" style="width:auto" ${p.ativo !== false ? "checked" : ""}> Produto ativo</label>
      <label style="display:block;"><input id="p_catalogo" type="checkbox" style="width:auto" ${p.exibir_catalogo !== false ? "checked" : ""}> Exibir no catálogo</label>
      <label style="display:block;"><input id="p_preco_catalogo" type="checkbox" style="width:auto" ${p.exibir_preco_catalogo !== false ? "checked" : ""}> Exibir preço no catálogo</label>

      <div style="margin-top:15px;">
        <label>Observações</label>
        <textarea id="p_observacoes" rows="3">${escapeHtml(p.observacoes || "")}</textarea>
      </div>

      <button class="btn btn-primary full" type="submit" style="margin-top:20px;">Salvar produto</button>
    </form>
  `;
}

function newProduct() {
  currentProductImageUrl = null;
  productImageOriginalUrl = null;
  productImageRemoved = false;
  productImageNewFile = null;
  productImageNewUrl = null;

  openModal("Novo produto", productForm({
    ativo: true,
    exibir_catalogo: true,
    exibir_preco_catalogo: true,
    cfop: "5102",
    unidade: "UN",
    origem_mercadoria: "0",
    precificacao_margem_percentual: 30
  }));

  atualizarPrecificacao();
}

function editProduct(id) {
  const p = products.find(x => String(x.id) === String(id));
  if (!p) { alert("Produto não encontrado."); return; }

  currentProductImageUrl = p.imagem_principal || null;
  productImageOriginalUrl = p.imagem_principal || null;
  productImageRemoved = false;
  productImageNewFile = null;
  productImageNewUrl = null;

  openModal("Editar produto", productForm(p));
  atualizarPrecificacao();
}

/* ======================================================
   SALVAR PRODUTO (MODO DEMO)
   ====================================================== */

async function saveProduct(ev, id) {
  ev.preventDefault();

  const nomeProduto = $("p_nome").value.trim();
  if (!nomeProduto) { alert("Informe o nome do produto."); return; }

  const ncmValue = $("p_ncm").value.replace(/\D/g, "");
  if (ncmValue && ncmValue.length !== 8) {
    alert("O NCM deve ter exatamente 8 dígitos.");
    return;
  }

  atualizarPrecificacao();
  const precResultado = calcularPrecificacao({
    materiais: Number($("prec_materiais").value) || 0,
    embalagem: Number($("prec_embalagem").value) || 0,
    maoObra:   Number($("prec_mao_obra").value)   || 0,
    outros:    Number($("prec_outros").value)     || 0,
    taxas:     Number($("prec_taxas").value)      || 0,
    impostos:  Number($("prec_impostos").value)   || 0,
    despesas:  Number($("prec_despesas").value)   || 0,
    margem:    Number($("prec_margem").value)     || 0
  });

  if (precResultado.erro) {
    alert("Não foi possível calcular a precificação:\n\n" + precResultado.erro);
    return;
  }

  // MODO DEMONSTRAÇÃO
  const acao = id ? "atualizar este produto" : "cadastrar este novo produto";

  alert(
    "🔒 MODO DEMONSTRAÇÃO\n\n" +
    `Em um ambiente real, ao clicar em "Salvar produto", o sistema iria ${acao}.\n\n` +
    "• Salvar as informações de preço, custo e dados fiscais.\n" +
    "• Gerar o SKU automaticamente.\n" +
    "• Enviar a imagem para o servidor (se houver).\n" +
    "• Atualizar as variações vinculadas (se houver).\n\n" +
    "Nenhuma alteração foi feita."
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
    $("pageSubtitle").textContent = "Cadastre e gerencie seus produtos";
  }

  try {
    await loadCategories();
    await renderProducts();
  } catch (e) {
    console.error(e);
    if ($("productsTable")) {
      $("productsTable").innerHTML = `<div class="message error">${escapeHtml(e.message)}</div>`;
    }
  }
});