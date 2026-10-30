(() => {
  "use strict";

  const TABLE = "gestao_loja_movimentos_financeiros";
  let movements = [], filteredMovements = [];

  const $ = id => document.getElementById(id),
    money = n => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
    pad = n => String(n).padStart(2, "0"),
    iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])),
    toDate = v => { if (!v) return null; const d = new Date(v); return isNaN(d) ? null : d };

  function db() {
    return window.db
      || (typeof window.supabaseClient !== "undefined" ? window.supabaseClient : null)
      || (typeof globalThis.db !== "undefined" ? globalThis.db : null);
  }
  
  function store() { 
    // Fallback seguro caso o app.js não tenha carregado currentStore a tempo
    return window.currentStore || { id_loja: 4 }; 
  }

  function error(s) {
    if ($("reportMessage")) {
      $("reportMessage").textContent = s;
      $("reportMessage").className = "message error";
    }
  }
  function success(s) {
    if ($("reportMessage")) {
      $("reportMessage").textContent = s;
      $("reportMessage").className = "message success";
    }
  }
  function clearMessage() {
    if ($("reportMessage")) {
      $("reportMessage").textContent = "";
      $("reportMessage").className = "message";
    }
  }

  /* ---------------------------------------------------------------
     NUMERAÇÃO SEQUENCIAL POR LOJA
     --------------------------------------------------------------- */
  let numeroPorId = new Map();

  function calcularNumeracaoSequencial() {
    numeroPorId = new Map();
    const ordenadas = [...movements].sort((a, b) => Number(a.id) - Number(b.id));
    let seq = 0;
    ordenadas.forEach(m => {
      seq++;
      numeroPorId.set(String(m.id), seq);
    });
  }

  function getNumero(m) {
    return numeroPorId.get(String(m.id)) || "?";
  }

  /* ---------------------------------------------------------------
     REGIME DE CAIXA POR EVENTO
     --------------------------------------------------------------- */
  function signed(m) {
    const v = +m.valor || 0;
    if (m.tipo === "Estorno") {
      return m.estorno_de_tipo === "Saída" ? v : -v;
    }
    return m.tipo === "Saída" ? -v : v;
  }

  function displayInfo(m) {
    const v = +m.valor || 0;
    if (m.tipo === "Estorno") {
      return m.estorno_de_tipo === "Saída" ? { neg: false, value: v } : { neg: true, value: v };
    }
    return m.tipo === "Saída" ? { neg: true, value: v } : { neg: false, value: v };
  }

  /* ---------- Filtros ---------- */
  function preset(v) {
    const n = new Date();
    let a = "", b = "";
    if (v === "today") a = b = iso(n);
    if (v === "week") {
      let d = new Date(n);
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      a = iso(d); b = iso(n);
    }
    if (v === "month") { a = `${n.getFullYear()}-${pad(n.getMonth() + 1)}-01`; b = iso(n); }
    if (v === "year") { a = `${n.getFullYear()}-01-01`; b = iso(n); }
    if (v === "all") { a = ""; b = ""; }
    if ($("dateStart")) $("dateStart").value = a;
    if ($("dateEnd")) $("dateEnd").value = b;
    if ($("monthFilter")) $("monthFilter").value = "";
    if ($("yearFilter")) $("yearFilter").value = v === "year" ? String(n.getFullYear()) : "";
  }

  function years() {
    if (!$("yearFilter")) return;
    let s = $("yearFilter"), old = s.value,
      set = new Set([new Date().getFullYear()]);
    movements.forEach(m => {
      let d = toDate(m.data_movimento);
      if (d) set.add(d.getFullYear());
    });
    s.innerHTML = '<option value="">Todos os anos</option>' +
      [...set].sort((a, b) => b - a)
        .map(y => `<option value="${y}">${y}</option>`).join("");
    if ([...set].some(y => String(y) === old)) s.value = old;
  }

  function matches(m) {
    let d = toDate(m.data_movimento);
    if (!d) return false;
    let day = iso(d), a = $("dateStart")?.value, b = $("dateEnd")?.value;
    if (a && day < a || b && day > b) return false;
    if ($("monthFilter")?.value && d.getMonth() + 1 !== +$("monthFilter").value) return false;
    if ($("yearFilter")?.value && d.getFullYear() !== +$("yearFilter").value) return false;
    if ($("typeFilter")?.value !== "all" && m.tipo !== $("typeFilter").value) return false;
    if ($("statusFilter")?.value !== "all" && m.status !== $("statusFilter").value) return false;
    return true;
  }

  /* ---------- Render ---------- */
  function render() {
    calcularNumeracaoSequencial();
    filteredMovements = movements.filter(matches);

    let t = { entries: 0, expenses: 0, reversals: 0, balance: 0, count: 0, expenseCount: 0, reversalCount: 0 };

    filteredMovements.forEach(m => {
      const v = +m.valor || 0;
      if (m.tipo === "Estorno") {
        t.reversals += v;
        t.reversalCount++;
      } else if (m.tipo === "Entrada") {
        t.entries += v;
        if (m.status !== "Estornado") t.count++;
      } else if (m.tipo === "Saída") {
        t.expenses += v;
        if (m.status !== "Estornado") t.expenseCount++;
      }
      t.balance += signed(m);
    });

    if ($("grossRevenue")) $("grossRevenue").textContent = money(t.entries - t.reversals);
    if ($("totalEntries")) $("totalEntries").textContent = money(t.entries);
    if ($("entryCount")) $("entryCount").textContent = `${t.count} movimento(s)`;
    if ($("totalExpenses")) $("totalExpenses").textContent = money(t.expenses);
    if ($("expenseCount")) $("expenseCount").textContent = `${t.expenseCount} movimento(s)`;
    if ($("totalReversals")) $("totalReversals").textContent = money(t.reversals);
    if ($("reversalCount")) $("reversalCount").textContent = `${t.reversalCount} estorno(s)`;
    if ($("netBalance")) $("netBalance").textContent = money(t.balance);

    let g = $("groupBy")?.value || "month", groups = new Map();
    filteredMovements.forEach(m => {
      let d = toDate(m.data_movimento);
      if (!d) return;
      let k = g === "year" ? String(d.getFullYear())
        : g === "month" ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
        : iso(d);
      if (!groups.has(k)) groups.set(k, { e: 0, s: 0, r: 0, b: 0 });
      let x = groups.get(k), v = +m.valor || 0;
      if (m.tipo === "Estorno") x.r += v;
      else if (m.tipo === "Entrada") x.e += v;
      else if (m.tipo === "Saída") x.s += v;
      x.b += signed(m);
    });

    if ($("breakdownDescription")) {
      $("breakdownDescription").textContent =
        `Totais agrupados por ${g === "day" ? "dia" : g === "month" ? "mês" : "ano"}.`;
    }

    let rows = [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
    if ($("summaryRows")) {
      $("summaryRows").innerHTML = rows.length
        ? rows.map(([k, x]) => {
            let label = k;
            if (g === "month") {
              let [y, m] = k.split("-");
              label = new Date(+y, +m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
            } else if (g === "day") {
              let [y, m, d] = k.split("-");
              label = `${d}/${m}/${y}`;
            }
            return `<tr>
              <td>${esc(label)}</td>
              <td class="money positive">${money(x.e)}</td>
              <td class="money negative">${money(x.s)}</td>
              <td class="money reversal">${money(x.r)}</td>
              <td class="money ${x.b >= 0 ? "positive" : "negative"}">${money(x.b)}</td>
            </tr>`;
          }).join("")
        : '<tr><td colspan="5" class="empty">Nenhum movimento neste período.</td></tr>';
    }

    let sorted = [...filteredMovements].sort((a, b) => new Date(b.data_movimento) - new Date(a.data_movimento));
    if ($("movementCount")) $("movementCount").textContent = `${sorted.length} movimentação(ões) encontrada(s).`;

    if ($("movementRows")) {
      $("movementRows").innerHTML = sorted.length
        ? sorted.map(m => {
            let d = toDate(m.data_movimento),
              podeEditar = m.status !== "Estornado" && m.tipo !== "Estorno",
              podeEstornar = m.status !== "Estornado" && m.tipo !== "Estorno";

            const numeroAmigavel = getNumero(m);

            let badge = "";
            if (m.tipo === "Estorno") {
              const originalId = String(m.movimento_original_id);
              const numeroOriginal = numeroPorId.get(originalId);
              badge = numeroOriginal
                ? ` <small class="badge-estorno">estorno de #${numeroOriginal}</small>`
                : ` <small class="badge-estorno">estorno</small>`;
            } else if (m.status === "Estornado") {
              badge = ` <small class="badge-estornado">estornado</small>`;
            }

            const info = displayInfo(m);
            const sinal = info.neg ? "−" : "+";
            const cor = info.neg ? "negative" : "positive";

            let acoes = "";
            if (podeEditar) acoes += `<button class="btn-icon" data-action="edit" data-id="${m.id}" title="Editar">✏️</button>`;
            if (podeEstornar) acoes += `<button class="btn-icon" data-action="reverse" data-id="${m.id}" title="Estornar">↩️</button>`;
            if (!acoes) acoes = '<span class="muted">—</span>';

            return `<tr>
              <td class="id-cell">#${numeroAmigavel}</td>
              <td>${d ? d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "-"}</td>
              <td>${esc(m.descricao)}${badge}</td>
              <td>${esc(m.categoria)}</td>
              <td>${m.pedido_id ? "#" + esc(m.pedido_id) : "-"}</td>
              <td>${esc(m.forma_pagamento || "Não informado")}</td>
              <td>${esc(m.status || "Registrado")}</td>
              <td class="text-right money ${cor}">${sinal}${money(info.value)}</td>
              <td class="text-right actions-cell">${acoes}</td>
            </tr>`;
          }).join("")
        : '<tr><td colspan="9" class="empty">Nenhuma movimentação encontrada.</td></tr>';
    }

    if ($("periodCaption")) {
      $("periodCaption").textContent = `Período: ${$("dateStart")?.value || "início"} até ${$("dateEnd")?.value || "hoje"}.`;
    }
    clearMessage();
  }

  /* ---------- Carregar ---------- */
  async function load() {
    let client = db(), s = store();
    if (!client || !s?.id_loja) {
      error("Conexão ou loja ainda não carregada.");
      return;
    }
    try {
      let { data, error: e } = await client
        .from(TABLE)
        .select("id,id_loja,pedido_id,tipo,categoria,descricao,valor,forma_pagamento,status,data_movimento,criado_em,movimento_original_id,estorno_de_tipo")
        .eq("id_loja", s.id_loja)
        .order("data_movimento", { ascending: false });
      if (e) throw e;
      movements = (data || []).filter(m => {
          const descricao = String(m.descricao || "").trim().toLowerCase();
          return descricao !== "cartão de crédito";
      });
      years();
      render();
    } catch (e) {
      console.error(e);
      error("Erro ao carregar movimentações: " + e.message);
    }
  }

  /* ---------- Nova movimentação (MODO DEMO) ---------- */
  function openModal() {
    if ($("movementForm")) $("movementForm").reset();
    if ($("movementFormMessage")) {
      $("movementFormMessage").textContent = "";
      $("movementFormMessage").className = "form-message";
    }
    let d = new Date();
    if ($("newDate")) $("newDate").value = `${iso(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    if ($("movementModal")) $("movementModal").classList.remove("hidden");
  }
  function closeModal() { if ($("movementModal")) $("movementModal").classList.add("hidden"); }

  async function save(e) {
    e.preventDefault();
    let msg = $("movementFormMessage");
    
    let payload = {
      tipo: $("newType")?.value,
      categoria: $("newCategory")?.value,
      descricao: $("newDescription")?.value.trim(),
      valor: Number($("newAmount")?.value),
      forma_pagamento: $("newPayment")?.value || null
    };

    if (!payload.descricao || payload.valor <= 0) {
      if (msg) msg.textContent = "Preencha a descrição e um valor maior que zero.";
      return;
    }

    // MODO DEMONSTRAÇÃO
    alert(
      "🔒 MODO DEMONSTRAÇÃO\n\n" +
      "Em um ambiente real, ao salvar esta movimentação, o sistema iria:\n\n" +
      "• Registrar a entrada ou saída no fluxo de caixa.\n" +
      "• Atualizar o saldo financeiro da loja.\n" +
      "• Guardar a categoria e a forma de pagamento para relatórios.\n\n" +
      "Nenhuma alteração foi feita."
    );

    if (msg) {
      msg.className = "form-message success";
      msg.textContent = "Movimentação simulada com sucesso (Modo Demo)!";
    }
    
    // Simula o recarregamento fechando o modal após um tempo
    setTimeout(closeModal, 1000);
  }

  /* ---------- Editar (MODO DEMO) ---------- */
  function findMovement(id) {
    return movements.find(m => String(m.id) === String(id));
  }

  function openEditModal(id) {
    const m = findMovement(id);
    if (!m) return;
    if (m.tipo === "Estorno" || m.status === "Estornado") {
      error("Movimentações estornadas ou de estorno não podem ser editadas.");
      return;
    }

    const numeroAmigavel = getNumero(m);
    const titulo = document.querySelector("#editMovementModal h2, #editMovementModal .modal-title, #editMovementModal h3");
    if (titulo) titulo.textContent = `Editar movimentação #${numeroAmigavel}`;

    if ($("editId")) $("editId").value = m.id;
    if ($("editType")) $("editType").value = m.tipo;
    if ($("editCategory")) $("editCategory").value = m.categoria || "Outros";
    if ($("editDescription")) $("editDescription").value = m.descricao || "";
    if ($("editAmount")) $("editAmount").value = m.valor || "";
    if ($("editPayment")) $("editPayment").value = m.forma_pagamento || "";
    
    const d = toDate(m.data_movimento) || new Date();
    if ($("editDate")) $("editDate").value = `${iso(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    
    if ($("editMovementFormMessage")) {
      $("editMovementFormMessage").textContent = "";
      $("editMovementFormMessage").className = "form-message";
    }
    
    if ($("editMovementModal")) $("editMovementModal").classList.remove("hidden");
  }

  function closeEditModal() { if ($("editMovementModal")) $("editMovementModal").classList.add("hidden"); }

  async function saveEdit(e) {
    e.preventDefault();
    const msg = $("editMovementFormMessage");
    const id = $("editId")?.value;
    const original = findMovement(id);
    
    if (!original) {
      if (msg) msg.textContent = "Movimentação não encontrada.";
      return;
    }
    
    const valor = Number($("editAmount")?.value);
    const descricao = $("editDescription")?.value.trim();
    if (!descricao || valor <= 0) {
      if (msg) msg.textContent = "Preencha a descrição e um valor maior que zero.";
      return;
    }

    // MODO DEMONSTRAÇÃO
    alert(
      "🔒 MODO DEMONSTRAÇÃO\n\n" +
      "Em um ambiente real, ao salvar as alterações, o sistema iria:\n\n" +
      "• Atualizar os dados desta movimentação.\n" +
      "• Recalcular o saldo financeiro automaticamente.\n\n" +
      "Nenhuma alteração foi feita."
    );

    if (msg) {
      msg.className = "form-message success";
      msg.textContent = "Edição simulada com sucesso (Modo Demo)!";
    }
    setTimeout(closeEditModal, 1000);
  }

  /* ---------- Estornar (MODO DEMO) ---------- */
  async function reverseMovement(id) {
    const m = findMovement(id);
    if (!m) return;
    if (m.tipo === "Estorno" || m.status === "Estornado") {
      error("Esta movimentação não pode ser estornada.");
      return;
    }

    const numeroAmigavel = getNumero(m);

    const ok = confirm(
      `🔒 MODO DEMONSTRAÇÃO\n\n` +
      `Em um ambiente real, ao estornar a movimentação #${numeroAmigavel} "${m.descricao}" de ${money(m.valor)}, o sistema iria:\n\n` +
      `• Criar um lançamento de estorno oposto.\n` +
      `• Devolver o valor ao saldo financeiro.\n` +
      `• Marcar a movimentação original como "Estornada".\n\n` +
      `Deseja simular esta ação?`
    );
    
    if (!ok) return;

    success(`Estorno simulado com sucesso (Modo Demo).`);
  }

  /* ---------- Export CSV ---------- */
  function csv() {
    if (!filteredMovements.length) {
      error("Não há movimentações para exportar.");
      return;
    }

    function formatDecimal(value) {
      return Number(value || 0).toFixed(2).replace(".", ",");
    }

    const data = [
      ["Nº", "Data", "Descrição", "Categoria", "Pedido", "Tipo", "Pagamento", "Status", "Valor"],
      ...filteredMovements.map(m => [
        getNumero(m),
        m.data_movimento,
        m.descricao,
        m.categoria,
        m.pedido_id,
        m.tipo,
        m.forma_pagamento,
        m.status,
        formatDecimal(m.valor)
      ])
    ];

    const c = data.map(row => row.map(value => `"${String(value ?? "").replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const u = URL.createObjectURL(new Blob(["\ufeff" + c], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = u;
    a.download = `financeiro-${iso(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(u);
  }

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    preset("month");

    if ($("periodPreset")) {
      $("periodPreset").addEventListener("change", () => {
        if ($("periodPreset").value !== "custom") {
          preset($("periodPreset").value);
          render();
        }
      });
    }

    if ($("applyFilters")) {
      $("applyFilters").addEventListener("click", () => {
        if ($("dateStart")?.value && $("dateEnd")?.value && $("dateStart").value > $("dateEnd").value) {
          error("Data inicial posterior à data final.");
          return;
        }
        render();
      });
    }

    if ($("clearFilters")) {
      $("clearFilters").addEventListener("click", () => {
        if ($("periodPreset")) $("periodPreset").value = "all";
        if ($("typeFilter")) $("typeFilter").value = "all";
        if ($("statusFilter")) $("statusFilter").value = "all";
        preset("all");
        render();
      });
    }

    if ($("refreshReport")) $("refreshReport").addEventListener("click", load);
    if ($("groupBy")) $("groupBy").addEventListener("change", render);
    if ($("exportCsv")) $("exportCsv").addEventListener("click", csv);

    if ($("newMovement")) $("newMovement").addEventListener("click", openModal);
    if ($("closeMovementModal")) $("closeMovementModal").addEventListener("click", closeModal);
    if ($("cancelMovement")) $("cancelMovement").addEventListener("click", closeModal);
    if ($("movementForm")) $("movementForm").addEventListener("submit", save);
    
    if ($("movementModal")) {
      $("movementModal").addEventListener("click", e => {
        if (e.target === $("movementModal")) closeModal();
      });
    }

    if ($("closeEditModal")) $("closeEditModal").addEventListener("click", closeEditModal);
    if ($("cancelEdit")) $("cancelEdit").addEventListener("click", closeEditModal);
    if ($("editMovementForm")) $("editMovementForm").addEventListener("submit", saveEdit);
    
    if ($("editMovementModal")) {
      $("editMovementModal").addEventListener("click", e => {
        if (e.target === $("editMovementModal")) closeEditModal();
      });
    }

    if ($("movementRows")) {
      $("movementRows").addEventListener("click", e => {
        const btn = e.target.closest("button[data-action]");
        if (!btn) return;
        const id = btn.dataset.id;
        if (btn.dataset.action === "edit") openEditModal(id);
        if (btn.dataset.action === "reverse") reverseMovement(id);
      });
    }

    document.addEventListener("keydown", e => {
      if (e.key === "Escape") { closeModal(); closeEditModal(); }
    });

    ["monthFilter", "yearFilter", "typeFilter", "statusFilter"].forEach(id => {
      if ($(id)) {
        $(id).addEventListener("change", () => { 
          if ($("periodPreset")) $("periodPreset").value = "custom"; 
        });
      }
    });

    // Aguarda o app.js carregar o currentStore
    let n = 0, t = setInterval(() => {
      n++;
      if (db() && store()?.id_loja) { 
        clearInterval(t); 
        load(); 
      } else if (n > 60) {
        clearInterval(t);
        error("Não foi possível carregar a loja.");
      }
    }, 250);
  });
})();