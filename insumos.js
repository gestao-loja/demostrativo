let insumos = [];
let categoriasInsumos = [];
let fornecedoresCache = null;

/*
 * Carrega as categorias específicas de insumos da loja
 */
async function loadCategoriasInsumos() {
  if (!currentStore || !currentStore.id_loja) return;

  const result = await db
    .from("gestao_loja_categorias_insumos")
    .select("id, nome")
    .eq("id_loja", currentStore.id_loja)
    .order("nome");

  if (result.error) {
    console.warn("Aviso: Erro ao carregar categorias de insumos:", result.error.message);
    categoriasInsumos = [];
    return;
  }
  categoriasInsumos = result.data || [];
}

/*
 * Carrega a lista de insumos
 */
async function loadInsumos() {
  if (!currentStore || !currentStore.id_loja) return;

  const result = await db
    .from("gestao_loja_insumos")
    .select("*")
    .eq("id_loja", currentStore.id_loja)
    .order("nome");

  if (result.error) {
    console.warn("Aviso: Erro ao carregar insumos:", result.error.message);
    insumos = [];
    return;
  }
  insumos = result.data || [];
}

/*
 * Renderiza a tabela de insumos
 */
async function renderInsumos() {
  try {
    await loadInsumos();
    await loadCategoriasInsumos();
  } catch (e) {
    if ($("productsTable")) {
      $("productsTable").innerHTML = `<div class="message error">${escapeHtml(e.message)}</div>`;
    }
    return;
  }

  if (!insumos.length) {
    if ($("productsTable")) {
      $("productsTable").innerHTML = '<div class="empty">Nenhum insumo cadastrado.</div>';
    }
    return;
  }

  if ($("productsTable")) {
    $("productsTable").innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Insumo</th>
              <th>SKU</th>
              <th>Categoria</th>
              <th>Unidade</th>
              <th>Custo (R$)</th>
              <th>Estoque Atual</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${insumos.map(function(i) {
              const categoria = categoriasInsumos.find(c => String(c.id) === String(i.categoria_id));
              const badgeClass = i.ativo ? "badge-green" : "badge-red";
              const estoqueFormatado = Number(i.estoque_atual || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });

              return `
                <tr>
                  <td><strong>${escapeHtml(i.nome)}</strong></td>
                  <td><strong>${escapeHtml(i.sku || "-")}</strong></td>
                  <td>${categoria ? escapeHtml(categoria.nome) : "-"}</td>
                  <td>${escapeHtml(i.unidade_medida || "UN")}</td>
                  <td>${money(i.preco_custo)}</td>
                  <td>
                    ${estoqueFormatado}
                    ${Number(i.estoque_atual) <= Number(i.estoque_minimo) 
                      ? '<span style="color: #ef4444; font-size: 11px; margin-left: 4px;" title="Estoque abaixo do mínimo!">⚠️ Baixo</span>' 
                      : ''}
                  </td>
                  <td>
                    <span class="badge ${badgeClass}">
                      ${i.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td>
                    <div style="display:flex; gap:6px; flex-wrap:wrap;">
                      <button class="btn btn-secondary" onclick="editInsumo('${i.id}')">Editar</button>
                      <button class="btn btn-primary" onclick="openMovimentarInsumo('${i.id}')">Movimentar</button>
                    </div>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }
}

/*
 * Formulário de cadastro/edição de Insumo
 */
function insumoForm(i = {}) {
  const categoryOptions = categoriasInsumos.map(function(c) {
    return `<option value="${c.id}" ${String(i.categoria_id || "") === String(c.id) ? "selected" : ""}>${escapeHtml(c.nome)}</option>`;
  }).join("");

  return `
    <form onsubmit="saveInsumo(event, ${i.id ? `'${i.id}'` : "null"})">
      
      <div class="grid2">
        <div>
          <label>Nome do insumo *</label>
          <input id="i_nome" required value="${escapeHtml(i.nome || "")}">
        </div>
        <div>
          <label>Categoria (Insumos)</label>
          <select id="i_categoria">
            <option value="">Sem categoria</option>
            ${categoryOptions}
          </select>
        </div>
      </div>

      <div class="grid2">
        <div>
          <label>SKU (Opcional)</label>
          <input id="i_sku" value="${escapeHtml(i.sku || "")}">
        </div>
        <div>
          <label>Unidade de Medida</label>
          <select id="i_unidade">
            <option value="UN" ${i.unidade_medida === 'UN' ? 'selected' : ''}>UN - Unidade</option>
            <option value="KG" ${i.unidade_medida === 'KG' ? 'selected' : ''}>KG - Quilograma</option>
            <option value="G" ${i.unidade_medida === 'G' ? 'selected' : ''}>G - Grama</option>
            <option value="M" ${i.unidade_medida === 'M' ? 'selected' : ''}>M - Metro</option>
            <option value="M2" ${i.unidade_medida === 'M2' ? 'selected' : ''}>M² - Metro Quadrado</option>
            <option value="L" ${i.unidade_medida === 'L' ? 'selected' : ''}>L - Litro</option>
            <option value="ML" ${i.unidade_medida === 'ML' ? 'selected' : ''}>ML - Mililitro</option>
            <option value="CX" ${i.unidade_medida === 'CX' ? 'selected' : ''}>CX - Caixa</option>
          </select>
        </div>
      </div>

      <div class="grid2">
        <div>
          <label>Preço de Custo (R$)</label>
          <input id="i_custo" type="number" step="0.01" min="0" value="${i.preco_custo ?? 0}">
        </div>
        <div>
          <label>Estoque Mínimo (Alerta)</label>
          <input id="i_minimo" type="number" step="0.001" min="0" value="${i.estoque_minimo ?? 0}">
        </div>
      </div>

      <div class="grid2">
        <div>
          <label>Estoque Atual</label>
          <input id="i_estoque" type="number" step="0.001" min="0" value="${i.estoque_atual ?? 0}">
        </div>
        <div>
          <label style="margin-top: 28px; display: flex; align-items: center; gap: 8px;">
            <input id="i_ativo" type="checkbox" style="width:auto" ${i.ativo !== false ? "checked" : ""}>
            Insumo Ativo
          </label>
        </div>
      </div>

      <div>
        <label>Observações</label>
        <textarea id="i_obs" rows="3">${escapeHtml(i.observacoes || "")}</textarea>
      </div>

      <button class="btn btn-primary full" type="submit" style="margin-top:16px;">
        Salvar insumo
      </button>

    </form>
  `;
}

/*
 * Abrir modal de NOVO insumo
 */
function newInsumo() {
  openModal("Novo insumo", insumoForm({ ativo: true }));
}

/*
 * Abrir modal de EDIÇÃO de insumo
 */
function editInsumo(id) {
  const insumo = insumos.find(i => String(i.id) === String(id));
  if (!insumo) {
    alert("Insumo não encontrado.");
    return;
  }
  openModal("Editar insumo", insumoForm(insumo));
}

/*
 * Salvar Insumo (MODO DEMO)
 */
async function saveInsumo(ev, id) {
  ev.preventDefault();
  if (!currentStore) return;

  const nome = $("i_nome").value.trim();
  if (!nome) {
    alert("Informe o nome do insumo.");
    return;
  }

  const acao = id ? "atualizar os dados deste insumo" : "cadastrar este novo insumo";

  // MODO DEMONSTRAÇÃO
  alert(
    "🔒 MODO DEMONSTRAÇÃO\n\n" +
    `Em um ambiente real, ao clicar em "Salvar insumo", o sistema iria ${acao}.\n\n` +
    "• Salvar as informações de preço, unidade e estoque.\n" +
    "• Atualizar a lista de matéria-prima disponível.\n" +
    "• Registrar as alterações para controle interno.\n\n" +
    "Nenhuma alteração foi feita."
  );

  closeModal();
}

/* ======================================================
   MOVIMENTAÇÃO DE ESTOQUE (ENTRADA / SAÍDA / AJUSTE)
   ====================================================== */

async function loadFornecedoresInsumo() {
  if (fornecedoresCache !== null) return fornecedoresCache;
  if (!currentStore || !currentStore.id_loja) return [];

  try {
    const query = db
      .from("gestao_loja_fornecedores")
      .select("id, razao_social, nome_fantasia, ativo")
      .eq("id_loja", currentStore.id_loja)
      .order("razao_social");

    const timeout = new Promise((_, rej) =>
      setTimeout(() => rej(new Error("timeout ao consultar fornecedores")), 2500)
    );

    const result = await Promise.race([query, timeout]);

    if (result.error) {
      console.warn("[fornecedores] erro Supabase:", result.error.message);
      fornecedoresCache = [];
      return [];
    }

    fornecedoresCache = (result.data || [])
      .filter(f => f.ativo !== false)
      .map(f => {
        const fantasia = (f.nome_fantasia || "").trim();
        const razao = (f.razao_social || "").trim();
        let label;
        if (fantasia && razao && fantasia.toLowerCase() !== razao.toLowerCase()) {
          label = `${fantasia} (${razao})`;
        } else {
          label = fantasia || razao || `Fornecedor #${f.id}`;
        }
        return { id: f.id, nome: label };
      });

    return fornecedoresCache;
  } catch (e) {
    console.warn("[fornecedores] falha:", e.message);
    fornecedoresCache = [];
    return [];
  }
}

/*
 * Abre o modal de movimentação de um insumo
 */
async function openMovimentarInsumo(id) {
  const insumo = insumos.find(i => String(i.id) === String(id));
  if (!insumo) {
    alert("Insumo não encontrado.");
    return;
  }

  let fornecedores = [];
  try {
    fornecedores = await loadFornecedoresInsumo();
  } catch (e) {
    fornecedores = [];
  }

  const unidade = insumo.unidade_medida || "UN";
  const estoqueAtual = Number(insumo.estoque_atual || 0);
  const custoPadrao = Number(insumo.preco_custo || 0);

  const fornecedorOptions = fornecedores.length
    ? `<option value="">— Selecione —</option>` +
      fornecedores.map(f =>
        `<option value="${escapeHtml(f.id)}" data-nome="${escapeHtml(f.nome)}">${escapeHtml(f.nome)}</option>`
      ).join("") +
      `<option value="__manual__">✏️ Digitar manualmente…</option>`
    : `<option value="__manual__">✏️ Digitar manualmente…</option>`;

  openModal(
    `Movimentar estoque — ${escapeHtml(insumo.nome)}`,
    `
    <form onsubmit="saveMovimentacaoInsumo(event, '${insumo.id}')">

      <div style="background:#f3f4f6;border-radius:8px;padding:12px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:13px;color:#6b7280;">Estoque atual</span>
        <strong style="font-size:18px;">
          ${estoqueAtual.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} ${escapeHtml(unidade)}
        </strong>
      </div>

      <div class="grid2">
        <div>
          <label>Tipo de movimentação *</label>
          <select id="m_tipo" required onchange="onTipoMovimentacaoChange('${insumo.id}')">
            <option value="entrada">Entrada (+)</option>
            <option value="saida">Saída (−)</option>
            <option value="ajuste_mais">Ajuste para mais (+)</option>
            <option value="ajuste_menos">Ajuste para menos (−)</option>
          </select>
        </div>
        <div>
          <label>Quantidade *</label>
          <input id="m_quantidade" type="number" step="0.001" min="0" required value="0" oninput="updateMovimentacaoPreview('${insumo.id}')">
        </div>
      </div>

      <div id="m_preview" style="margin:12px 0 16px;padding:10px 12px;border-radius:8px;background:#eff6ff;border:1px solid #bfdbfe;font-size:14px;color:#1e3a8a;">
        Novo estoque: <strong>${estoqueAtual.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} ${escapeHtml(unidade)}</strong>
      </div>

      <div>
        <label>Preço de custo unitário (R$)</label>
        <input id="m_custo" type="number" step="0.01" min="0" value="${custoPadrao}" oninput="updateMovimentacaoPreview('${insumo.id}')">
        <small style="color:#6b7280;font-size:12px;">
          Se informado em entradas, atualiza o custo do insumo.
        </small>
      </div>

      <div style="margin-top:12px;">
        <label>Observação do estoque</label>
        <textarea id="m_obs" rows="2" placeholder="Ex.: Compra fornecedor XYZ, perda, inventário..."></textarea>
      </div>

      <div id="m_financeiro_bloco" style="margin-top:20px;padding:14px;border-radius:10px;background:#fefce8;border:1px solid #fde68a;display:none;">
        <label style="display:flex;align-items:center;gap:8px;font-weight:600;margin-bottom:12px;">
          <input id="m_fin_ativo" type="checkbox" checked style="width:auto" onchange="toggleFinanceiroBloco()">
          Registrar movimentação financeira (compra)
        </label>

        <div id="m_fin_fields">
          <div class="grid2">
            <div>
              <label>Fornecedor</label>
              <select id="m_fornecedor_select" onchange="onFornecedorChange()">
                ${fornecedorOptions}
              </select>
              <input id="m_fornecedor_manual" type="text" placeholder="Digite o nome do fornecedor" style="display:none;margin-top:6px;" maxlength="120">
            </div>
            <div>
              <label>Forma de pagamento</label>
              <select id="m_forma_pagamento">
                <option value="">— Selecione —</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="PIX">PIX</option>
                <option value="Cartão de Débito">Cartão de Débito</option>
                <option value="Cartão de Crédito">Cartão de Crédito</option>
                <option value="Boleto">Boleto</option>
                <option value="Transferência">Transferência</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
          </div>

          <div class="grid2" style="margin-top:10px;">
            <div>
              <label>Valor total (R$)</label>
              <input id="m_fin_valor" type="number" step="0.01" min="0" value="0">
              <small style="color:#6b7280;font-size:12px;">Calculado como quantidade × custo unitário. Pode ajustar (frete, desconto...).</small>
            </div>
            <div>
              <label>Data do movimento financeiro</label>
              <input id="m_fin_data" type="datetime-local">
            </div>
          </div>

          <div style="margin-top:10px;">
            <label>Descrição financeira</label>
            <input id="m_fin_descricao" type="text" maxlength="200">
          </div>
        </div>
      </div>

      <button class="btn btn-primary full" type="submit" style="margin-top:16px;">
        Confirmar movimentação
      </button>

    </form>
    `
  );

  const now = new Date();
  const pad2 = n => String(n).padStart(2, "0");
  const isoLocal = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}T${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

  if ($("m_fin_data")) $("m_fin_data").value = isoLocal;
  if ($("m_fin_descricao")) $("m_fin_descricao").value = `Compra de insumo: ${insumo.nome}`;
  
  if ($("m_fin_valor")) {
    $("m_fin_valor").addEventListener("input", () => {
      $("m_fin_valor").dataset.touched = "1";
    });
  }

  onTipoMovimentacaoChange(insumo.id);
  onFornecedorChange();
}

function onTipoMovimentacaoChange(insumoId) {
  const tipo = $("m_tipo")?.value;
  const bloco = $("m_financeiro_bloco");
  if (!bloco) return;
  bloco.style.display = (tipo === "entrada") ? "block" : "none";
  updateMovimentacaoPreview(insumoId);
}

function toggleFinanceiroBloco() {
  const ativo = $("m_fin_ativo")?.checked;
  const fields = $("m_fin_fields");
  if (fields) fields.style.display = ativo ? "block" : "none";
}

function onFornecedorChange() {
  const sel = $("m_fornecedor_select");
  const manual = $("m_fornecedor_manual");
  if (!sel || !manual) return;
  const isManual = sel.value === "__manual__";
  manual.style.display = isManual ? "block" : "none";
  if (isManual) manual.focus();
}

function updateMovimentacaoPreview(insumoId) {
  const insumo = insumos.find(i => String(i.id) === String(insumoId));
  if (!insumo) return;

  const tipo = $("m_tipo")?.value || "entrada";
  const qtd = Number($("m_quantidade")?.value) || 0;
  const atual = Number(insumo.estoque_atual || 0);
  const unidade = insumo.unidade_medida || "UN";

  let novo = atual;
  if (tipo === "entrada" || tipo === "ajuste_mais") novo = atual + qtd;
  else if (tipo === "saida" || tipo === "ajuste_menos") novo = atual - qtd;

  const cor = novo < 0 ? "#ef4444" : "#1e3a8a";
  const preview = $("m_preview");
  if (preview) {
    preview.style.color = cor;
    preview.innerHTML = `Novo estoque: <strong style="color:${cor};">${novo.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} ${escapeHtml(unidade)}</strong>`;
    if (novo < 0) preview.innerHTML += ` <span style="font-size:12px;">(ficará negativo!)</span>`;
  }
  updateFinanceiroPreview();
}

function updateFinanceiroPreview() {
  const valorInput = $("m_fin_valor");
  if (!valorInput) return;
  if (valorInput.dataset.touched === "1") return;

  const qtd = Number($("m_quantidade")?.value) || 0;
  const custo = Number($("m_custo")?.value) || 0;
  valorInput.value = (qtd * custo).toFixed(2);
}

/*
 * Salvar Movimentação (MODO DEMO)
 */
async function saveMovimentacaoInsumo(ev, insumoId) {
  ev.preventDefault();
  if (!currentStore) return;

  const insumo = insumos.find(i => String(i.id) === String(insumoId));
  if (!insumo) { alert("Insumo não encontrado."); return; }

  const tipo = $("m_tipo").value;
  const quantidade = Number($("m_quantidade").value) || 0;
  const custoUnitario = Number($("m_custo").value) || 0;

  if (quantidade <= 0) {
    alert("Informe uma quantidade maior que zero.");
    return;
  }

  const estoqueAtual = Number(insumo.estoque_atual || 0);
  let novoEstoque = estoqueAtual;
  if (tipo === "entrada" || tipo === "ajuste_mais") novoEstoque = estoqueAtual + quantidade;
  else if (tipo === "saida" || tipo === "ajuste_menos") novoEstoque = estoqueAtual - quantidade;

  if (novoEstoque < 0) {
    if (!confirm(`Atenção: o estoque ficará negativo (${novoEstoque}). Deseja continuar?`)) return;
  }

  let temFinanceiro = false;
  let valorFin = 0;
  
  if (tipo === "entrada" && $("m_fin_ativo")?.checked) {
    valorFin = Number($("m_fin_valor").value) || 0;
    if (valorFin > 0) temFinanceiro = true;
  }

  // MODO DEMONSTRAÇÃO
  let textoAcao = "";
  if (tipo === "entrada") textoAcao = "adicionar a quantidade ao estoque";
  else if (tipo === "saida") textoAcao = "remover a quantidade do estoque";
  else if (tipo === "ajuste_mais") textoAcao = "corrigir o estoque para cima";
  else if (tipo === "ajuste_menos") textoAcao = "corrigir o estoque para baixo";

  let extraFin = temFinanceiro 
    ? `\n• Registrar uma saída financeira de ${valorFin.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} referente à compra.` 
    : "";

  alert(
    "🔒 MODO DEMONSTRAÇÃO\n\n" +
    `Em um ambiente real, ao confirmar esta movimentação, o sistema iria:\n\n` +
    `• ${textoAcao.charAt(0).toUpperCase() + textoAcao.slice(1)} do insumo "${insumo.nome}".\n` +
    `• Atualizar o saldo atual para ${novoEstoque.toLocaleString('pt-BR')} ${insumo.unidade_medida || 'UN'}.\n` +
    `• Gerar um registro no histórico de movimentações.` + extraFin + `\n\n` +
    "Nenhuma alteração foi feita."
  );

  closeModal();
}

/* ======================================================
   CATEGORIA DE INSUMOS (MODO DEMO)
   ====================================================== */

function newCategoryInsumo() {
  openModal(
    "Nova categoria de insumo",
    `
    <form onsubmit="saveCategoryInsumo(event)">
      <div>
        <label for="ci_nome">Nome da categoria *</label>
        <input id="ci_nome" type="text" required maxlength="100" placeholder="Ex.: Embalagens, Tecidos, Metais" autocomplete="off">
      </div>
      <button class="btn btn-primary full" type="submit" style="margin-top:16px;">
        Salvar categoria
      </button>
    </form>
    `
  );
}

async function saveCategoryInsumo(ev) {
  ev.preventDefault();
  if (!currentStore) return;

  const nome = $("ci_nome").value.trim();
  if (!nome) return;

  // MODO DEMONSTRAÇÃO
  alert(
    "🔒 MODO DEMONSTRAÇÃO\n\n" +
    "Em um ambiente real, ao clicar em 'Salvar categoria', o sistema iria:\n\n" +
    "• Criar uma nova classificação de insumos.\n" +
    "• Disponibilizá-la no momento de cadastrar ou editar um insumo.\n\n" +
    "Nenhuma alteração foi feita."
  );

  closeModal();
}

/* ======================================================
   BOOT DA PÁGINA
   ====================================================== */
document.addEventListener("DOMContentLoaded", async function() {
  // No modo demo, não exige login.
  if (!currentStore && typeof loadUserContext === "function") {
    await loadUserContext();
  }

  if (typeof setActiveNav === "function") setActiveNav();
  
  if ($("pageSubtitle")) {
    $("pageSubtitle").textContent = "Cadastre e gerencie a matéria-prima da sua loja";
  }

  await renderInsumos();
});