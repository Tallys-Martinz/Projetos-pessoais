// ===== CONFIGURAÇÕES DE ADICIONAIS E TAMANHOS =====
const CONFIG_ADICIONAIS = {
    potes: {
        minimo: 1,
        maximo: 5,
        opcoes: [
            { nome: "Banana", preco: 0 },
            { nome: "Amendoim", preco: 0 },
            { nome: "Calda de Morango", preco: 0 },
            { nome: "Cereja", preco: 0 },
            { nome: "Chocobol", preco: 0 },
            { nome: "Confete", preco: 0 },
            { nome: "Creme de Ninho", preco: 0 },
            { nome: "Creme de Avelã", preco: 0 },
            { nome: "Creme de Paçoca", preco: 0 },
            { nome: "Farinha Láctea", preco: 0 },
            { nome: "Farofa de Amendoim", preco: 0 },
            { nome: "Granola", preco: 0 },
            { nome: "Leite Condensado", preco: 0 },
            { nome: "Leite em Pó", preco: 0 },
            { nome: "Uva", preco: 0 }
        ]
    },
    copos: {
        minimo: 1,
        maximo: 5,
        opcoes: [
            { nome: "Banana", preco: 0 },
            { nome: "Amendoim", preco: 0 },
            { nome: "Calda de Morango", preco: 0 },
            { nome: "Cereja", preco: 0 },
            { nome: "Chocobol", preco: 0 },
            { nome: "Confete", preco: 0 },
            { nome: "Creme de Ninho", preco: 0 },
            { nome: "Creme de Avelã", preco: 0 },
            { nome: "Creme de Paçoca", preco: 0 },
            { nome: "Farinha Láctea", preco: 0 },
            { nome: "Farofa de Amendoim", preco: 0 },
            { nome: "Granola", preco: 0 },
            { nome: "Leite Condensado", preco: 0 },
            { nome: "Leite em Pó", preco: 0 },
            { nome: "Uva", preco: 0 }
        ]
    }
};

const CONFIG_TAMANHOS = {
    milkshakes: [
        { ml: 300, label: "300ml", acrescimo: 0 },
        { ml: 400, label: "400ml", acrescimo: 0.91 },
        { ml: 500, label: "500ml", acrescimo: 3.00 }
    ],
};

// ===== UTILITÁRIOS =====
const Utils = {
    escapeHtml: (text) => {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// ===== SELETORES DE ELEMENTOS =====
const menuContainer = document.getElementById("menu-container");
const cartBtn = document.getElementById("cart-btn");
const cartModal = document.getElementById("cart-modal");
const cartItemsContainer = document.getElementById("cart-items");
const cartTotal = document.getElementById("cart-total");
const checkoutBtn = document.getElementById("checkout-btn");
const closeModalBtn = document.getElementById("close-modal-btn");
const cartCounter = document.getElementById("cart-count");
const addressInput = document.getElementById("address");
const addressWarn = document.getElementById("address-warn");
const spanHora = document.getElementById("date-span");
const statusText = document.getElementById("status-text");
const clientNameInput = document.getElementById("client-name");
const nameWarn = document.getElementById("name-warn");
const clientNumberInput = document.getElementById("client-number");
const numberWarn = document.getElementById("number-warn");
const paymentMethodInput = document.getElementById("payment-method");

// Seletores dos novos modais
const adicionaisModal = document.getElementById("adicionais-modal");
const adicionaisList = document.getElementById("adicionais-list");
const adicionaisCounter = document.getElementById("adicionais-counter");
const adicionaisError = document.getElementById("adicionais-error");
const adicionaisConfirm = document.getElementById("adicionais-confirm");
const adicionaisCancel = document.getElementById("adicionais-cancel");

const tamanhoModal = document.getElementById("tamanho-modal");
const tamanhosList = document.getElementById("tamanhos-list");
const tamanhoPrecoBase = document.getElementById("tamanho-preco-base");
const tamanhoPrecoTotal = document.getElementById("tamanho-preco-total");
const tamanhoConfirm = document.getElementById("tamanho-confirm");
const tamanhoCancel = document.getElementById("tamanho-cancel");

let cart = [];
let produtoAtual = null;
let adicionaisSelecionados = [];
let tamanhoSelecionado = null;

// ===== DADOS: PRODUTOS E DESCONTOS (localStorage) =====
function getProdutos() {
    try {
        const dados = localStorage.getItem('devburguer_menu');
        return dados ? JSON.parse(dados) : [];
    } catch { return []; }
}

function getDescontos() {
    try {
        const dados = localStorage.getItem('devburguer_descontos');
        return dados ? JSON.parse(dados) : [];
    } catch { return []; }
}

function getDescontoAtivo(categoria) {
    const hoje = new Date().toISOString().split('T')[0];
    return getDescontos().find(d => {
        if (!d.active) return false;
        if (hoje < d.startDate || hoje > d.endDate) return false;
        return d.applyTo === 'all' || d.applyTo === `category:${categoria}`;
    });
}

function calcularPrecoFinal(price, desconto) {
    if (!desconto) return price;
    if (desconto.type === 'percent') {
        return price * (1 - desconto.value / 100);
    }
    return Math.max(0, price - desconto.value);
}

// ===== RENDERIZAÇÃO DINÂMICA DO MENU =====
function renderizarMenu() {
    if (!menuContainer) {
        console.warn('⚠️ Container #menu-container não encontrado no HTML');
        return;
    }

    const produtos = getProdutos().filter(p => p.active);

    if (!produtos.length) {
        menuContainer.innerHTML = `
            <div class="text-center py-16 px-4">
                <div class="text-6xl mb-4">🥤</div>
                <p class="text-gray-500 text-lg">Cardápio em atualização</p>
                <p class="text-gray-400 text-sm mt-2">Volte em breve para ver nossas delícias!</p>
            </div>`;
        return;
    }

    const categorias = {};
    produtos.forEach(p => {
        if (!categorias[p.categoria]) categorias[p.categoria] = [];
        categorias[p.categoria].push(p);
    });

    const labels = {
        potes: '🫙 Potes',
        copos: '🧉 Copos',
        milkshakes: '🥤 Milkshakes 300-500ml',
        milkshakesespecial: '🥤 Milkshakes Especial',
        picoles: '🍦 Picolés',
    };

    let html = '';

    Object.keys(labels).forEach(cat => {
        if (!categorias[cat]) return;
        html += `<div class="mx-auto max-w-7xl px-2 my-6" id="${cat}-section">
    <h2 class="inline-block font-bold text-xl md:text-2xl bg-gray-900 text-white px-6 py-3 border-l-4 border-orange-500 border-b-4 rounded-full shadow-lg">
        ${labels[cat]}
    </h2>
</div>`;
        html += `<div class="grid grid-cols-1 md:grid-cols-2 gap-7 md:gap-10 mx-auto max-w-7xl px-2 mb-16" id="${cat}-grid"></div>`;
    });

    menuContainer.innerHTML = html;

    Object.keys(categorias).forEach(cat => {
        const grid = document.getElementById(`${cat}-grid`);
        if (!grid) return;

        categorias[cat].forEach(p => {
            const desconto = getDescontoAtivo(cat);
            const precoFinal = calcularPrecoFinal(p.price, desconto);
            const temDesconto = desconto && precoFinal < p.price;

            grid.innerHTML += `
            <div class="bg-white flex gap-2 p-2 rounded-lg border-l-4 border-yellow-300 shadow-lg hover:shadow-2xl transition-shadow duration-300 relative group">
                ${temDesconto ? `
                    <span class="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full z-10">
                        -${desconto.type === 'percent' ? desconto.value + '%' : 'R$' + desconto.value}
                    </span>` : ''}
                
                <img src="${p.imagem || 'assets/hamb-1.png'}" 
                     alt="${p.nome}" 
                     class="w-24 h-24 sm:w-28 sm:h-28 rounded-md hover:scale-110 hover:-rotate-2 duration-300 object-cover">
                
                <div class="flex flex-col justify-between flex-grow">
                    <div>
                        <p class="font-extrabold text-gray-800">${p.nome}</p>
                        <p class="text-sm text-gray-600 line-clamp-2 min-h-[40px]">
                            ${p.descricao ? Utils.escapeHtml(p.descricao) : 'Sem descrição'}
                        </p>
                    </div>
                    
                    <div class="flex items-center gap-2 justify-between mt-2">
                        <div class="flex flex-col">
                            ${temDesconto ? `
                                <p class="text-xs text-gray-400 line-through">R$ ${p.price.toFixed(2)}</p>
                            ` : ''}
                            <p class="font-extrabold text-xl ${temDesconto ? 'text-red-600' : 'text-green-700'}">
                                R$ ${precoFinal.toFixed(2)}
                            </p>
                        </div>
                        
                        <button class="add-to-cart-btn bg-gray-900 hover:bg-gray-800 text-white border-l-4 border-b-4 border-orange-500 px-5 py-2 rounded-lg 
                                     transition-all duration-300 hover:scale-110 active:scale-95 shadow-md"
                            data-name="${p.nome}" 
                            data-price="${precoFinal}" 
                            data-original="${p.price}"
                            data-categoria="${p.categoria}"
                            data-adicionais='${JSON.stringify(p.adicionais || null)}'
                            data-tamanhos='${JSON.stringify(p.tamanhos || null)}'>
                            <i class="fa fa-cart-plus"></i>
                        </button>
                    </div>
                </div>
            </div>`;
        });
    });

    console.log(`✅ Menu renderizado: ${produtos.length} produtos`);
}

// ===== MODAL DE ADICIONAIS (Potes/Copos) =====
function openAdicionaisModal(produto) {
    produtoAtual = produto;
    adicionaisSelecionados = [];

    const config = CONFIG_ADICIONAIS[produto.categoria] || CONFIG_ADICIONAIS.potes;
    const opcoes = produto.adicionais?.opcoes || config.opcoes;
    const minimo = produto.adicionais?.minimo ?? config.minimo ?? 1;
    const maximo = produto.adicionais?.maximo ?? config.maximo ?? 5;

    adicionaisList.innerHTML = opcoes.map((adicional, index) => `
        <label class="adicional-item" data-index="${index}">
            <input type="checkbox" class="checkbox-adicional w-4 h-4" value="${index}">
            <div class="flex-1 pointer-events-none">
                <span class="font-medium">${adicional.nome}</span>
                <span class="text-sm text-gray-500 ml-2">+ R$ ${adicional.preco.toFixed(2)}</span>
            </div>
        </label>
    `).join('');

    updateAdicionaisCounter(0, minimo, maximo);
    if (adicionaisError) adicionaisError.classList.add('hidden');
    if (adicionaisConfirm) adicionaisConfirm.disabled = true;

    document.querySelectorAll('#adicionais-list .checkbox-adicional').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const item = e.target.closest('.adicional-item');
            if (item) item.classList.toggle('selected', e.target.checked);
            updateAdicionaisSelection();
        });
    });

    document.querySelectorAll('#adicionais-list .adicional-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('checkbox-adicional')) return;
            const checkbox = item.querySelector('.checkbox-adicional');
            checkbox.checked = !checkbox.checked;
            checkbox.dispatchEvent(new Event('change'));
        });
    });

    if (adicionaisModal) {
        adicionaisModal.classList.remove('hidden');
    }
    document.body.style.overflow = 'hidden';
}

function updateAdicionaisSelection() {
    if (!produtoAtual) return;

    const checkboxes = document.querySelectorAll('#adicionais-list .checkbox-adicional');
    adicionaisSelecionados = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => {
            const config = CONFIG_ADICIONAIS[produtoAtual.categoria] || CONFIG_ADICIONAIS.potes;
            const opcoes = produtoAtual.adicionais?.opcoes || config.opcoes;
            return opcoes[cb.value];
        });

    const config = CONFIG_ADICIONAIS[produtoAtual.categoria] || CONFIG_ADICIONAIS.potes;
    const minimo = produtoAtual.adicionais?.minimo ?? config.minimo ?? 1;
    const maximo = produtoAtual.adicionais?.maximo ?? config.maximo ?? 5;

    updateAdicionaisCounter(adicionaisSelecionados.length, minimo, maximo);

    if (adicionaisSelecionados.length >= minimo && adicionaisSelecionados.length <= maximo) {
        if (adicionaisConfirm) adicionaisConfirm.disabled = false;
        if (adicionaisError) adicionaisError.classList.add('hidden');
    } else {
        if (adicionaisConfirm) adicionaisConfirm.disabled = true;
        if (adicionaisError) {
            if (adicionaisSelecionados.length < minimo) {
                adicionaisError.textContent = `⚠️ Selecione pelo menos ${minimo} adicional!`;
            } else if (adicionaisSelecionados.length > maximo) {
                adicionaisError.textContent = `⚠️ Máximo de ${maximo} adicionais permitido!`;
            }
            adicionaisError.classList.remove('hidden');
        }
    }
}

function updateAdicionaisCounter(selecionados, minimo, maximo) {
    if (!adicionaisCounter) return;
    adicionaisCounter.textContent = `${selecionados} selecionados (mín. ${minimo}, máx. ${maximo})`;

    if (selecionados >= minimo && selecionados <= maximo) {
        adicionaisCounter.className = 'selection-counter valid';
    } else {
        adicionaisCounter.className = 'selection-counter invalid';
    }
}

// ===== MODAL DE TAMANHOS (Milkshakes) =====
function openTamanhoModal(produto) {
    produtoAtual = produto;
    tamanhoSelecionado = null;

    const config = CONFIG_TAMANHOS[produto.categoria] || CONFIG_TAMANHOS.milkshakes;
    const tamanhos = produto.tamanhos || config;

    if (tamanhoPrecoBase) tamanhoPrecoBase.textContent = `R$ ${produto.price.toFixed(2)}`;
    if (tamanhoPrecoTotal) tamanhoPrecoTotal.textContent = `R$ ${produto.price.toFixed(2)}`;

    tamanhosList.innerHTML = tamanhos.map((tamanho, index) => `
        <label class="tamanho-option" data-index="${index}">
            <input type="radio" name="tamanho-milkshake" value="${index}" class="radio-tamanho w-4 h-4">
            <div class="flex-1 pointer-events-none">
                <span class="font-bold">${tamanho.label}</span>
                <span class="text-sm text-gray-500 ml-2">
                    ${tamanho.acrescimo > 0 ? `+ R$ ${tamanho.acrescimo.toFixed(2)}` : '(preço base)'}
                </span>
            </div>
        </label>
    `).join('');

    if (tamanhoConfirm) tamanhoConfirm.disabled = true;

    document.querySelectorAll('#tamanhos-list .radio-tamanho').forEach(radio => {
        radio.addEventListener('change', (e) => {
            document.querySelectorAll('#tamanhos-list .tamanho-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            const item = e.target.closest('.tamanho-option');
            if (item) item.classList.add('selected');
            updateTamanhoSelection();
        });
    });

    document.querySelectorAll('#tamanhos-list .tamanho-option').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('radio-tamanho')) return;
            const radio = item.querySelector('.radio-tamanho');
            radio.checked = true;
            radio.dispatchEvent(new Event('change'));
        });
    });

    if (tamanhoModal) {
        tamanhoModal.classList.remove('hidden');
    }
    document.body.style.overflow = 'hidden';
}

function updateTamanhoSelection() {
    const selected = document.querySelector('#tamanhos-list .radio-tamanho:checked');
    if (!selected || !produtoAtual) {
        if (tamanhoConfirm) tamanhoConfirm.disabled = true;
        return;
    }

    const config = CONFIG_TAMANHOS[produtoAtual.categoria] || CONFIG_TAMANHOS.milkshakes;
    const tamanhos = produtoAtual.tamanhos || config;
    tamanhoSelecionado = tamanhos[selected.value];

    const total = produtoAtual.price + (tamanhoSelecionado.acrescimo || 0);
    if (tamanhoPrecoTotal) {
        tamanhoPrecoTotal.textContent = `R$ ${total.toFixed(2)}`;
    }
    if (tamanhoConfirm) {
        tamanhoConfirm.disabled = false;
    }
}

// ===== FUNÇÕES DE FECHAR MODAIS (CORRIGIDAS) =====
function closeAdicionaisModal() {
    if (adicionaisModal) {
        adicionaisModal.classList.add('hidden');
    }
    document.body.style.overflow = '';

    document.querySelectorAll('#adicionais-list .checkbox-adicional').forEach(cb => {
        cb.checked = false;
        cb.closest('.adicional-item')?.classList.remove('selected');
    });

    produtoAtual = null;
    adicionaisSelecionados = [];
    console.log('✅ Modal de adicionais fechado');
}

function closeTamanhoModal() {
    if (tamanhoModal) {
        tamanhoModal.classList.add('hidden');
    }
    document.body.style.overflow = '';

    document.querySelectorAll('#tamanhos-list .radio-tamanho').forEach(radio => {
        radio.checked = false;
        radio.closest('.tamanho-option')?.classList.remove('selected');
    });

    produtoAtual = null;
    tamanhoSelecionado = null;
    console.log('✅ Modal de tamanhos fechado');
}

// ===== CARRINHO =====
if (cartBtn) {
    cartBtn.addEventListener("click", function () {
        updateHeaderStatus();
        if (cartModal) cartModal.style.display = "flex";
        updateCartModal();
    });
}

if (cartModal) {
    cartModal.addEventListener("click", function (event) {
        if (event.target === cartModal) cartModal.style.display = "none";
    });
}

if (closeModalBtn) {
    closeModalBtn.addEventListener("click", function () {
        if (cartModal) cartModal.style.display = "none";
    });
}

// Event listeners para os novos modais 
if (adicionaisCancel) {
    adicionaisCancel.addEventListener('click', closeAdicionaisModal);
}
if (adicionaisConfirm) {
    adicionaisConfirm.addEventListener('click', () => {
        if (!produtoAtual) return;

        const config = CONFIG_ADICIONAIS[produtoAtual.categoria] || CONFIG_ADICIONAIS.potes;
        const minimo = produtoAtual.adicionais?.minimo ?? config.minimo ?? 1;
        const maximo = produtoAtual.adicionais?.maximo ?? config.maximo ?? 5;

        if (adicionaisSelecionados.length >= minimo && adicionaisSelecionados.length <= maximo) {
            const adicionaisNomes = adicionaisSelecionados.map(a => a.nome).join(', ');
            const adicionalPrice = adicionaisSelecionados.reduce((sum, a) => sum + a.preco, 0);
            const finalPrice = produtoAtual.price + adicionalPrice;

            addToCart(`${produtoAtual.nome} + [${adicionaisNomes}]`, finalPrice);
            closeAdicionaisModal();
        } else {
            if (adicionaisError) {
                adicionaisError.textContent = `⚠️ Selecione entre ${minimo} e ${maximo} adicionais!`;
                adicionaisError.classList.remove('hidden');
            }
        }
    });
}

if (tamanhoCancel) {
    tamanhoCancel.addEventListener('click', closeTamanhoModal);
}
if (tamanhoConfirm) {
    tamanhoConfirm.addEventListener('click', () => {
        if (tamanhoSelecionado && produtoAtual) {
            const finalPrice = produtoAtual.price + (tamanhoSelecionado.acrescimo || 0);
            addToCart(`${produtoAtual.nome} - ${tamanhoSelecionado.label}`, finalPrice);
            closeTamanhoModal();
        }
    });
}

// Fechar modais ao clicar fora
if (adicionaisModal) {
    adicionaisModal.addEventListener('click', (e) => {
        if (e.target === adicionaisModal) closeAdicionaisModal();
    });
}
if (tamanhoModal) {
    tamanhoModal.addEventListener('click', (e) => {
        if (e.target === tamanhoModal) closeTamanhoModal();
    });
}

// Listener principal para botões "Add to Cart"
if (menuContainer) {
    menuContainer.addEventListener("click", function (event) {
        const btn = event.target.closest(".add-to-cart-btn");
        if (btn) {
            const name = btn.getAttribute("data-name");
            const price = parseFloat(btn.getAttribute("data-price"));
            const categoria = btn.getAttribute("data-categoria");

            if (name && !isNaN(price)) {
                // Potes/Copos → modal de adicionais
                if (categoria === 'potes' || categoria === 'copos') {
                    const produto = {
                        nome: name,
                        price: price,
                        categoria: categoria,
                        adicionais: JSON.parse(btn.getAttribute("data-adicionais") || "null")
                    };
                    openAdicionaisModal(produto);
                }
                //  Milkshakes NORMAIS → modal de tamanhos
                else if (categoria === 'milkshakes') {
                    const produto = {
                        nome: name,
                        price: price,
                        categoria: categoria,
                        tamanhos: JSON.parse(btn.getAttribute("data-tamanhos") || "null")
                    };
                    openTamanhoModal(produto);
                }

                else if (categoria === 'milkshakesespecial') {
                    addToCart(name, price);
                }

                else {
                    addToCart(name, price);
                }
            }
        }
    });
}

function addToCart(name, price) {
    if (!name || !price) return;
    const existingItem = cart.find(item => item.name === name);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ name, price, quantity: 1 });
    }
    updateCartModal();

    if (typeof Toastify !== 'undefined') {
        Toastify({
            text: `"${name}" adicionado! 🛒`,
            duration: 3000,
            style: { background: "#16a34a", borderRadius: "8px", fontWeight: "500" }
        }).showToast();
    }
}

function updateCartModal() {
    if (!cartItemsContainer) return;
    cartItemsContainer.innerHTML = "";
    let total = 0;

    cart.forEach(item => {
        const cartItemElement = document.createElement("div");
        cartItemElement.classList.add("flex", "justify-between", "mb-4", "flex-col", "p-3", "bg-gray-50", "rounded-lg");
        cartItemElement.innerHTML = `
            <div class="flex items-center justify-between">
                <div>
                    <p class="font-medium text-gray-800">${item.name}</p>
                    <p class="text-sm text-gray-500">Qtd: ${item.quantity}</p> 
                    <p class="font-medium mt-1 text-green-700">R$ ${item.price.toFixed(2)}</p>
                </div>
                <button class="remove-from-cart-btn text-red-500 hover:text-red-700 font-medium text-sm px-3 py-1 
                             hover:bg-red-50 rounded transition" data-name="${item.name}">
                    Remover
                </button>
            </div>`;
        total += item.price * item.quantity;
        cartItemsContainer.appendChild(cartItemElement);
    });

    if (cartTotal) {
        cartTotal.textContent = total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }
    if (cartCounter) {
        cartCounter.innerHTML = cart.reduce((acc, item) => acc + item.quantity, 0);
    }
}

if (cartItemsContainer) {
    cartItemsContainer.addEventListener("click", function (event) {
        if (event.target.classList.contains("remove-from-cart-btn")) {
            const name = event.target.getAttribute("data-name");
            removeItemCart(name);
        }
    });
}

function removeItemCart(name) {
    if (!name) return;
    const index = cart.findIndex(item => item.name === name);
    if (index !== -1) {
        if (cart[index].quantity > 1) {
            cart[index].quantity -= 1;
        } else {
            cart.splice(index, 1);
        }
        updateCartModal();
    }
}

// ===== STATUS DA LOJA =====
function checkOpen() {
    const statusManual = localStorage.getItem("statusLoja");
    if (statusManual === "fechado") return false;
    if (statusManual === "aberto") return true;
    const hora = new Date().getHours();
    return hora >= 14 && hora < 23;
}

function updateHeaderStatus() {
    if (!statusText || !spanHora) return;
    const isOpen = checkOpen();
    if (isOpen) {
        spanHora.classList.remove("bg-red-500");
        spanHora.classList.add("bg-green-600");
        statusText.innerText = "ABERTO ✅";
    } else {
        spanHora.classList.remove("bg-green-600");
        spanHora.classList.add("bg-red-500");
        statusText.innerText = "FECHADO 🔒";
    }
}

// ===== SALVAR PEDIDO =====
function salvarPedidoNoSistema(pedido) {
    try {
        let pedidos = JSON.parse(localStorage.getItem("pedidosRecebidos")) || [];
        pedidos.push(pedido);
        localStorage.setItem("pedidosRecebidos", JSON.stringify(pedidos));
        return true;
    } catch (error) {
        console.error("❌ Erro ao salvar pedido:", error);
        return false;
    }
}

// ===== FUNÇÃO PARA ENCONTRAR PEDIDO =====
function encontrarPedido(pedidos, pedidoRef) {
    return pedidos.findIndex(p =>
        p.cliente === pedidoRef.cliente &&
        p.hora === pedidoRef.hora &&
        p.total === pedidoRef.total &&
        p.itens === pedidoRef.itens
    );
}

// ===== FINALIZAR PEDIDO =====
if (checkoutBtn) {
    function enviarParaWhatsApp(pedido) {
        const numeroLoja = "5562985044345";
        const itensFormatados = pedido.itens.split(" | ").map(item => `• ${item.trim()}`).join("\n");

        const mensagem = `
*🛒 NOVO PEDIDO*

👤 *Cliente:* ${pedido.cliente}
📱 *Número:* ${pedido.numero}
📍 *Endereço:* ${pedido.endereco}

🥤 *Itens:*
${itensFormatados}

💰 *Total:* ${pedido.total}
⏰ *Horário:* ${pedido.hora}
💳 *Pagamento:* ${pedido.pagamento}

_Obrigado pela preferência!_ 🙌
`.trim();

        const numeroLimpo = numeroLoja.replace(/\D/g, '');
        const url = `https://wa.me/${numeroLimpo}?text=${encodeURIComponent(mensagem)}`;

        const novaAba = window.open(url, "_blank");
        if (!novaAba) {
            alert("⚠️ Pop-up bloqueado! Permita pop-ups e tente novamente.");
        }
    }

    checkoutBtn.addEventListener("click", function () {
        if (!checkOpen()) {
            if (typeof Toastify !== 'undefined') {
                Toastify({ text: "Ops! A loja está fechada no momento.", duration: 5000, style: { background: "#ef4444", borderRadius: "8px" } }).showToast();
            } else { alert("Loja fechada no momento!"); }
            return;
        }

        if (cart.length === 0) {
            if (typeof Toastify !== 'undefined') {
                Toastify({ text: "Seu carrinho está vazio!", duration: 3000, style: { background: "#f59e0b" } }).showToast();
            }
            return;
        }

        let hasError = false;

        if (clientNameInput && clientNameInput.value.trim() === "") {
            if (nameWarn) nameWarn.classList.remove("hidden");
            hasError = true;
        } else if (nameWarn) nameWarn.classList.add("hidden");

        if (clientNumberInput && clientNumberInput.value.trim() === "") {
            if (numberWarn) numberWarn.classList.remove("hidden");
            hasError = true;
        } else if (numberWarn) numberWarn.classList.add("hidden");

        if (addressInput && addressInput.value.trim() === "") {
            if (addressWarn) addressWarn.classList.remove("hidden");
            hasError = true;
        } else if (addressWarn) addressWarn.classList.add("hidden");

        if (paymentMethodInput && paymentMethodInput.value.trim() === "") {
            alert("Por favor, selecione uma forma de pagamento.");
            hasError = true;
        }

        if (hasError) {
            alert("Por favor, preencha todos os campos para continuar.");
            return;
        }

        const cartItems = cart.map((item) => `${item.name} (${item.quantity})`).join(" | ");
        const pagamentoSelecionado = paymentMethodInput?.value || "Não informado";

        const novoPedido = {
            cliente: clientNameInput.value.trim(),
            numero: clientNumberInput?.value.trim() || "Não informado",
            endereco: addressInput.value.trim(),
            itens: cartItems,
            total: cartTotal?.textContent || "R$ 0,00",
            hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            pagamento: pagamentoSelecionado,
            status: "novo",
            criadoEm: new Date().toISOString()
        };

        const salvo = salvarPedidoNoSistema(novoPedido);

        if (salvo) {
            if (typeof Toastify !== 'undefined') {
                Toastify({ text: "✅ Pedido enviado com sucesso!", duration: 4000, style: { background: "#16a34a" } }).showToast();
            }
            enviarParaWhatsApp(novoPedido);

            cart = [];
            if (clientNameInput) clientNameInput.value = "";
            if (clientNumberInput) clientNumberInput.value = "";
            if (addressInput) addressInput.value = "";
            updateCartModal();
            if (cartModal) cartModal.style.display = "none";
        } else {
            alert("Erro ao salvar pedido. Tente novamente.");
        }
    });
}

// ===== SYNC =====
window.addEventListener('storage', (e) => {
    if (e.key === 'statusLoja') updateHeaderStatus();
    if (e.key === 'devburguer_menu' || e.key === 'devburguer_descontos') {
        console.log('🔄 Cardápio atualizado, renderizando...');
        renderizarMenu();
    }
});

// ===== INICIALIZAÇÃO =====
function initClientPage() {
    updateHeaderStatus();
    renderizarMenu();
    if (cartCounter) cartCounter.innerHTML = cart.length;
    console.log("✅ Página do cliente inicializada");
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initClientPage);
} else {
    initClientPage();
}