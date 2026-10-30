// ============================================================
// catalogo.js — VERSÃO DEMONSTRAÇÃO (SOMENTE VISUALIZAÇÃO)
// Loja fixa: id_loja = 4 | Menu restaurado
// ============================================================

let catalogStoreId = 4;
let catalogStore = null;
let catalogProducts = [];
let catalogCart = [];
let selectedProduct = null;
let selectedVariation = null;
let selectedQuantity = 1;

const VARIATION_SIZE_ORDER = {
  "PP": 1, "P": 2, "M": 3, "G": 4, "GG": 5,
  "XG": 5, "EG": 5, "G1": 6, "XGG": 6, "G2": 7,
  "G3": 8, "G4": 9, "G5": 10, "G6": 11
};

function extractVariationSizeToken(nome) {
  const s = String(nome || "").trim();
  if (!s) return "";
  const match = s.match(/[\s\-\/]+([A-Za-z]+\d*|\d+)$/);
  if (match) return match[1];
  return "";
}

function extractVariationBase(nome) {
  const s = String(nome || "").trim();
  if (!s) return "";
  const base = s.replace(/[\s\-\/]+([A-Za-z]+\d*|\d+)$/, "").trim();
  return (base || s).toLowerCase();
}

function variationSortKey(nome) {
  const token = extractVariationSizeToken(nome).toUpperCase();
  const base = extractVariationBase(nome);
  const original = String(nome || "").toLowerCase();
  let group = 2;
  let rank = 0;
  if (token && Object.prototype.hasOwnProperty.call(VARIATION_SIZE_ORDER, token)) {
    group = 0; rank = VARIATION_SIZE_ORDER[token];
  } else if (token && /^\d+$/.test(token)) {
    group = 1; rank = Number(token);
  }
  return { base, group, rank, original };
}

function compareVariations(a, b) {
  const ka = variationSortKey(a?.nome);
  const kb = variationSortKey(b?.nome);
  if (ka.base !== kb.base) return ka.base.localeCompare(kb.base, "pt-BR", { sensitivity: "base" });
  if (ka.group !== kb.group) return ka.group - kb.group;
  if (ka.rank !== kb.rank) return ka.rank - kb.rank;
  return ka.original.localeCompare(kb.original, "pt-BR", { sensitivity: "base" });
}

function sortVariations(list) {
  if (!Array.isArray(list)) return [];
  return [...list].sort(compareVariations);
}

async function loadCatalog() {
  try {
    // Busca os dados da loja
    const storeResult = await db
      .from("gestao_loja_lojas")
      .select("*")
      .eq("id_loja", catalogStoreId)
      .maybeSingle();

    if (storeResult.error || !storeResult.data) {
      showCatalogMessage("Não foi possível carregar os dados da loja.");
      return false;
    }
    catalogStore = storeResult.data;

    // Busca os produtos ativos
    const productsResult = await db
      .from("gestao_loja_produtos")
      .select("*")
      .eq("id_loja", catalogStoreId)
      .eq("ativo", true);

    if (productsResult.error) {
      showCatalogMessage("Erro ao carregar os produtos.");
      return false;
    }

    const products = productsResult.data || [];

    // Busca todas as variações ativas da loja
    const variationsResult = await db
      .from("gestao_loja_produtos_variacoes")
      .select("*")
      .eq("id_loja", catalogStoreId)
      .eq("ativo", true);

    const variations = variationsResult.data || [];

    // Agrupa as variações dentro de cada produto
    catalogProducts = products.map(product => {
      const productVariations = variations.filter(v => Number(v.produto_id) === Number(product.id));
      return {
        ...product,
        variacoes: sortVariations(productVariations)
      };
    });

    renderStore();
    renderCatalog();
    return true;

  } catch (error) {
    console.error("Erro ao carregar catálogo:", error);
    showCatalogMessage("Não foi possível carregar o catálogo.");
    return false;
  }
}

function renderStore() {
  if (!catalogStore) return;

  const storeName = catalogStore.nome_fantasia || catalogStore.nome || "Catálogo";
  const logoUrl = catalogStore.logo || catalogStore.logo_url || catalogStore.imagem_logo || catalogStore.url_logo || "";

  const nameElement = document.getElementById("catalogStoreName");
  if (nameElement) nameElement.textContent = storeName;

  const logoContainer = document.getElementById("catalogStoreLogo");
  if (logoContainer) {
    if (logoUrl) {
      logoContainer.innerHTML = `
        <img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(storeName)}" class="catalog-store-logo-image" onerror="this.parentElement.style.display='none';">
      `;
      logoContainer.style.display = "flex";
    } else {
      logoContainer.innerHTML = "";
      logoContainer.style.display = "none";
    }
  }
  document.title = storeName + " - Catálogo";
}

function renderCatalog() {
  const container = document.getElementById("catalogProducts");
  if (!container) return;

  const searchElement = document.getElementById("catalogSearch");
  const search = searchElement ? searchElement.value.trim().toLowerCase() : "";

  const filteredProducts = catalogProducts.filter(product => {
    if (!search) return true;
    const name = String(product.nome || "").toLowerCase();
    const description = String(product.descricao || "").toLowerCase();
    const sku = String(product.sku || "").toLowerCase();
    return name.includes(search) || description.includes(search) || sku.includes(search);
  });

  if (!filteredProducts.length) {
    container.innerHTML = `<div class="catalog-empty">Nenhum produto encontrado.</div>`;
    return;
  }

  container.innerHTML = filteredProducts.map(product => {
    const image = product.imagem_principal || "";
    const price = product.preco_venda;
    const hasPrice = price !== null && price !== undefined;

    return `
      <div class="catalog-product">
        ${image 
          ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(product.nome || "")}" class="catalog-product-image">` 
          : `<div class="catalog-product-no-image">Sem imagem</div>`}
        <div class="catalog-product-body">
          <div class="catalog-product-name">${escapeHtml(product.nome || "")}</div>
          <div class="catalog-product-description">${escapeHtml(product.descricao || "")}</div>
          ${hasPrice 
            ? `<div class="catalog-product-price">${money(price)}</div>` 
            : `<div class="catalog-product-price">Consulte</div>`}
          <button type="button" class="catalog-product-action" onclick="openProduct(${Number(product.id)})">
            Ver produto
          </button>
        </div>
      </div>
    `;
  }).join("");
}

function openProduct(productId) {
  const product = catalogProducts.find(p => String(p.id) === String(productId));
  if (!product) return;

  selectedProduct = product;
  selectedVariation = null;
  selectedQuantity = 1;

  const modal = document.getElementById("productModal");
  const title = document.getElementById("productModalTitle");
  const content = document.getElementById("productModalContent");
  if (!modal || !title || !content) return;

  title.textContent = product.nome || "Produto";

  const variations = product.variacoes || [];
  const mainImage = product.imagem_principal || "";

  content.innerHTML = `
    <div class="catalog-product-detail">
      <div class="catalog-product-image">
        ${mainImage 
          ? `<img id="selectedProductImage" src="${escapeHtml(mainImage)}" alt="${escapeHtml(product.nome || "")}">` 
          : `<div class="catalog-no-image">Sem imagem</div>`}
      </div>

      <div class="catalog-product-info">
        <h2>${escapeHtml(product.nome || "")}</h2>
        ${product.descricao ? `<p class="muted">${escapeHtml(product.descricao)}</p>` : ""}

        ${variations.length > 0 ? `
          <div class="catalog-form-group">
            <label>Variação</label>
            <select id="catalogVariationSelect" onchange="selectCatalogVariation(this.value)">
              <option value="">Selecione uma variação</option>
              ${variations.map(variation => `
                <option value="${variation.id}">
                  ${escapeHtml(variation.nome || "Variação")}
                  ${variation.preco_venda !== null && variation.preco_venda !== undefined ? " - " + money(variation.preco_venda) : ""}
                </option>
              `).join("")}
            </select>
          </div>
        ` : ""}

        <div id="catalogSelectedVariationImage"></div>

        <div id="catalogSelectedPrice">
          ${product.preco_venda !== null && product.preco_venda !== undefined 
            ? `<strong>${money(product.preco_venda)}</strong>` 
            : `<span class="muted">Consulte</span>`}
        </div>

        <div class="catalog-form-group">
          <label>Quantidade</label>
          <div class="catalog-quantity">
            <button type="button" onclick="changeCatalogQuantity(-1)">−</button>
            <span id="catalogQuantity">1</span>
            <button type="button" onclick="changeCatalogQuantity(1)">+</button>
          </div>
        </div>

        <div class="catalog-form-group">
          <label>Observação do pedido</label>
          <textarea id="catalogItemObservation" rows="4" placeholder="Ex.: qual arte deseja, cor, tamanho, detalhes do pedido..."></textarea>
        </div>

        <button type="button" class="btn btn-primary catalog-primary" onclick="addCatalogItem()">
          Adicionar ao carrinho
        </button>
      </div>
    </div>
  `;

  modal.classList.remove("hidden");
}

function selectCatalogVariation(variationId) {
  if (!selectedProduct) return;

  const variation = (selectedProduct.variacoes || []).find(item => String(item.id) === String(variationId));
  selectedVariation = variation || null;

  const imageElement = document.getElementById("selectedProductImage");
  const imageContainer = document.getElementById("catalogSelectedVariationImage");
  const priceContainer = document.getElementById("catalogSelectedPrice");

  if (!variation) {
    if (imageElement && selectedProduct.imagem_principal) imageElement.src = selectedProduct.imagem_principal;
    if (imageContainer) imageContainer.innerHTML = "";
    if (priceContainer) {
      priceContainer.innerHTML = selectedProduct.preco_venda !== null && selectedProduct.preco_venda !== undefined
        ? `<strong>${money(selectedProduct.preco_venda)}</strong>`
        : `<span class="muted">Consulte</span>`;
    }
    return;
  }

  const variationImage = variation.imagem || "";
  if (variationImage) {
    if (imageElement) imageElement.src = variationImage;
    if (imageContainer) imageContainer.innerHTML = "";
  } else {
    if (imageElement && selectedProduct.imagem_principal) imageElement.src = selectedProduct.imagem_principal;
    if (imageContainer) imageContainer.innerHTML = "";
  }

  if (priceContainer) {
    if (variation.preco_venda !== null && variation.preco_venda !== undefined) {
      priceContainer.innerHTML = `<strong>${money(variation.preco_venda)}</strong>`;
    } else if (selectedProduct.preco_venda !== null && selectedProduct.preco_venda !== undefined) {
      priceContainer.innerHTML = `<strong>${money(selectedProduct.preco_venda)}</strong>`;
    } else {
      priceContainer.innerHTML = `<span class="muted">Consulte</span>`;
    }
  }
}

function closeProductModal() {
  const modal = document.getElementById("productModal");
  if (modal) modal.classList.add("hidden");
  selectedProduct = null;
  selectedVariation = null;
  selectedQuantity = 1;
}

function changeCatalogQuantity(amount) {
  const element = document.getElementById("catalogQuantity");
  if (!element) return;

  let quantity = Number(element.textContent) || 1;
  quantity += Number(amount);
  if (quantity < 1) quantity = 1;

  element.textContent = quantity;
  selectedQuantity = quantity;
}

function addCatalogItem() {
  if (!selectedProduct) return;

  const quantityElement = document.getElementById("catalogQuantity");
  const quantity = Number(quantityElement?.textContent || 1);

  const variations = selectedProduct.variacoes || [];

  if (variations.length > 0 && !selectedVariation) {
    alert("Selecione uma variação antes de adicionar o produto ao carrinho.");
    return;
  }

  const observationElement = document.getElementById("catalogItemObservation");
  const observation = observationElement?.value.trim() || "";

  const variation = selectedVariation;
  const price = variation?.preco_venda ?? selectedProduct.preco_venda;

  if (price === null || price === undefined) {
    alert("Este produto não possui preço disponível.");
    return;
  }

  catalogCart.push({
    produto_id: Number(selectedProduct.id),
    variacao_id: variation ? Number(variation.id) : null,
    nome_produto: selectedProduct.nome,
    nome_variacao: variation?.nome || "",
    imagem: variation?.imagem || selectedProduct.imagem_principal || "",
    quantidade: quantity,
    preco_unitario: Number(price),
    observacao: observation
  });

  updateCartCount();
  closeProductModal();
  alert("Produto adicionado ao carrinho.");
}

function updateCartCount() {
  const count = catalogCart.reduce((total, item) => total + Number(item.quantidade || 0), 0);
  const element = document.getElementById("cartCount");
  if (element) element.textContent = count;
}

function openCart() {
  renderCart();
  const modal = document.getElementById("cartModal");
  if (modal) modal.classList.remove("hidden");
}

function closeCart() {
  const modal = document.getElementById("cartModal");
  if (modal) modal.classList.add("hidden");
}

function renderCart() {
  const content = document.getElementById("cartContent");
  if (!content) return;

  if (!catalogCart.length) {
    content.innerHTML = `<div style="padding:40px 20px;text-align:center;color:#7b8391;">Seu carrinho está vazio.</div>`;
    return;
  }

  let total = 0;

  content.innerHTML = catalogCart.map((item, index) => {
    const subtotal = Number(item.quantidade) * Number(item.preco_unitario);
    total += subtotal;

    return `
      <div class="cart-item">
        ${item.imagem 
          ? `<img src="${escapeHtml(item.imagem)}" class="cart-item-image">` 
          : `<div class="cart-item-image"></div>`}
        <div>
          <div class="cart-item-name">${escapeHtml(item.nome_produto || "")}</div>
          ${item.nome_variacao ? `<div class="cart-item-variation">Variação: ${escapeHtml(item.nome_variacao)}</div>` : ""}
          <div style="font-size:11px;color:#7b8391;margin-top:4px;">Quantidade: ${item.quantidade}</div>
          ${item.observacao ? `<div class="cart-item-observation">${escapeHtml(item.observacao)}</div>` : ""}
          <button type="button" class="cart-item-remove" onclick="removeCartItem(${index})">Remover</button>
        </div>
        <div class="cart-item-price">${money(subtotal)}</div>
      </div>
    `;
  }).join("") + `
    <div class="cart-total">
      <span>Total</span>
      <span>${money(total)}</span>
    </div>
    <div class="cart-actions">
      <button type="button" class="catalog-primary" onclick="openCheckout()">Finalizar pedido</button>
    </div>
  `;
}

function removeCartItem(index) {
  catalogCart.splice(index, 1);
  updateCartCount();
  renderCart();
}

function openCheckout() {
  if (!catalogCart.length) {
    alert("Adicione pelo menos um produto ao carrinho.");
    return;
  }
  closeCart();
  renderCheckout();
  const modal = document.getElementById("checkoutModal");
  if (modal) modal.classList.remove("hidden");
}

function closeCheckout() {
  const modal = document.getElementById("checkoutModal");
  if (modal) modal.classList.add("hidden");
}

function renderCheckout() {
  const content = document.getElementById("checkoutContent");
  if (!content) return;

  content.innerHTML = `
    <div class="checkout-section">
      <h3>Dados do cliente</h3>
      <div class="catalog-form-grid">
        <div class="catalog-form-group catalog-form-full">
          <label>Tipo de cliente</label>
          <select id="checkoutTipoCliente" onchange="toggleCheckoutPJ()">
            <option value="Pessoa Física">Pessoa Física</option>
            <option value="Pessoa Jurídica">Pessoa Jurídica</option>
          </select>
        </div>
        <div class="catalog-form-group catalog-form-full">
          <label>Nome <span class="checkout-required">*</span></label>
          <input id="checkoutNome" type="text">
        </div>
        <div id="checkoutRazaoSocialGroup" class="catalog-form-group" style="display:none;">
          <label>Razão social <span class="checkout-required">*</span></label>
          <input id="checkoutRazaoSocial" type="text">
        </div>
        <div id="checkoutNomeFantasiaGroup" class="catalog-form-group" style="display:none;">
          <label>Nome fantasia</label>
          <input id="checkoutNomeFantasia" type="text">
        </div>
        <div id="checkoutCnpjGroup" class="catalog-form-group" style="display:none;">
          <label>CNPJ <span class="checkout-required">*</span></label>
          <input id="checkoutCnpj" type="text" placeholder="00.000.000/0000-00">
        </div>
        <div class="catalog-form-group">
          <label>Telefone <span class="checkout-required">*</span></label>
          <input id="checkoutTelefone" type="text">
        </div>
        <div class="catalog-form-group">
          <label>WhatsApp</label>
          <input id="checkoutWhatsapp" type="text">
        </div>
        <div class="catalog-form-group">
          <label>E-mail <span id="checkoutEmailRequired" class="checkout-required" style="display:none;">*</span></label>
          <input id="checkoutEmail" type="email">
        </div>
      </div>
    </div>

    <div class="checkout-section">
      <h3>Endereço de entrega</h3>
      <div class="catalog-form-grid">
        <div class="catalog-form-group">
          <label>CEP <span id="checkoutCepRequired" class="checkout-required" style="display:none;">*</span></label>
          <input id="checkoutCep" type="text">
        </div>
        <div class="catalog-form-group">
          <label>Estado <span id="checkoutEstadoRequired" class="checkout-required" style="display:none;">*</span></label>
          <input id="checkoutEstado" type="text" maxlength="2">
        </div>
        <div class="catalog-form-group">
          <label>Cidade <span id="checkoutCidadeRequired" class="checkout-required" style="display:none;">*</span></label>
          <input id="checkoutCidade" type="text">
        </div>
        <div class="catalog-form-group">
          <label>Bairro <span id="checkoutBairroRequired" class="checkout-required" style="display:none;">*</span></label>
          <input id="checkoutBairro" type="text">
        </div>
        <div class="catalog-form-group catalog-form-full">
          <label>Endereço <span id="checkoutEnderecoRequired" class="checkout-required" style="display:none;">*</span></label>
          <input id="checkoutEndereco" type="text">
        </div>
        <div class="catalog-form-group">
          <label>Número <span id="checkoutNumeroRequired" class="checkout-required" style="display:none;">*</span></label>
          <input id="checkoutNumero" type="text">
        </div>
        <div class="catalog-form-group">
          <label>Complemento</label>
          <input id="checkoutComplemento" type="text">
        </div>
      </div>
    </div>

    <div class="checkout-section">
      <h3>Pedido</h3>
      <div class="catalog-form-grid">
        <div class="catalog-form-group">
          <label>Data desejada para entrega</label>
          <input id="checkoutDataEntrega" type="date">
        </div>
        <div class="catalog-form-group catalog-form-full">
          <label>Observações gerais</label>
          <textarea id="checkoutObservacoes" placeholder="Informações gerais sobre o pedido..."></textarea>
        </div>
      </div>
    </div>

    <div class="checkout-footer">
      <div class="checkout-total">
        <span>Total</span>
        <span>${money(calculateCartTotal())}</span>
      </div>
      <button type="button" class="catalog-primary" onclick="finishCatalogOrder()">Enviar pedido</button>
    </div>
  `;

  toggleCheckoutPJ();
}

function toggleCheckoutPJ() {
  const type = document.getElementById("checkoutTipoCliente")?.value;
  const isPJ = type === "Pessoa Jurídica";

  const groups = ["checkoutRazaoSocialGroup", "checkoutNomeFantasiaGroup", "checkoutCnpjGroup"];
  groups.forEach(id => {
    const element = document.getElementById(id);
    if (element) element.style.display = isPJ ? "" : "none";
  });

  const requiredElements = [
    "checkoutEmailRequired", "checkoutCepRequired", "checkoutEstadoRequired",
    "checkoutCidadeRequired", "checkoutBairroRequired", "checkoutEnderecoRequired", "checkoutNumeroRequired"
  ];
  requiredElements.forEach(id => {
    const element = document.getElementById(id);
    if (element) element.style.display = isPJ ? "inline" : "none";
  });
}

function calculateCartTotal() {
  return catalogCart.reduce((total, item) => total + (Number(item.quantidade) * Number(item.preco_unitario)), 0);
}

function getCheckoutValue(id) {
  return document.getElementById(id)?.value?.trim() || "";
}

// ============================================================
// AVISO CUSTOMIZADO E SEM MENÇÃO AO BANCO
// ============================================================
async function finishCatalogOrder() {
  if (!catalogCart.length) {
    alert("O carrinho está vazio.");
    return;
  }

  const nome = getCheckoutValue("checkoutNome");
  const telefone = getCheckoutValue("checkoutTelefone");

  if (!nome || !telefone) {
    alert("Informe o nome e o telefone.");
    return;
  }

  alert(
    "🔒 MODO DEMONSTRAÇÃO\n\n" +
    "Em um ambiente real, ao clicar em 'Enviar pedido', o sistema iria:\n\n" +
    "• Registrar seu nome, telefone e endereço.\n" +
    "• Gerar um número exclusivo para o seu pedido.\n" +
    "• Salvar a lista de produtos e quantidades.\n" +
    "• Separar os itens no estoque para entrega.\n\n" +
    "Nenhuma alteração foi feita."
  );
  
  catalogCart = [];
  updateCartCount();
  closeCheckout();
  showOrderSuccess({ numero: "DEMO-" + Math.floor(Math.random() * 1000) });
}

function showOrderSuccess(data) {
  const number = data?.numero || "";
  const content = document.getElementById("checkoutContent");
  const modal = document.getElementById("checkoutModal");

  if (modal) modal.classList.remove("hidden");

  if (!content) {
    alert("Pedido enviado com sucesso!");
    return;
  }

  content.innerHTML = `
    <div style="padding:45px 25px;text-align:center;">
      <div style="font-size:50px;margin-bottom:15px;">✓</div>
      <h2>Pedido enviado!</h2>
      <p class="muted" style="margin-top:10px;">Recebemos seu pedido e a loja irá analisá-lo.</p>
      ${number ? `<p style="margin-top:20px;font-weight:700;">Pedido nº ${escapeHtml(String(number))}</p>` : ""}
      <button type="button" class="catalog-primary" style="margin-top:20px;" onclick="closeCheckout()">Fechar</button>
    </div>
  `;
}

function showCatalogMessage(message) {
  const container = document.getElementById("catalogProducts");
  if (!container) return;
  container.innerHTML = `<div class="catalog-empty">${escapeHtml(message)}</div>`;
}

// ============================================================
// INICIALIZAÇÃO COM O MENU RESTAURADO
// ============================================================
document.addEventListener("DOMContentLoaded", async function () {
  // Restaura o menu (como no modo original)
  const menu = document.getElementById("menu");
  if (menu) {
    menu.style.display = "";
    // Se o loadMenu existir no app.js, chama ele para montar os links
    if (typeof loadMenu === "function") {
      try {
        await loadMenu();
        if (typeof setActiveNav === "function") setActiveNav();
      } catch (e) {
        console.warn("Menu não pôde ser carregado:", e);
      }
    }
  }

  // Adiciona a classe para a tela ajustar o layout (afastar o conteúdo do menu)
  document.body.classList.add("has-menu");

  await loadCatalog();
  updateCartCount();
});