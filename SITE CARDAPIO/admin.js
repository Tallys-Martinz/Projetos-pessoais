// ===== CONFIG =====
const ADMIN_CONFIG = {
    SENHA: "1234",
    STORAGE_KEY: "devburguer_admin",
    SESSION_HOURS: 24
};

let pedidoParaFinalizar = null;

// ===== UTILITÁRIOS =====
const Utils = {
    parseBRL: (valorStr) => {
        if (!valorStr) return 0;
        const clean = String(valorStr)
            .replace('R$', '')
            .replace(/\./g, '')
            .replace(',', '.');
        return parseFloat(clean) || 0;
    },
    formatBRL: (valor) => {
        return valor.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    },
    escapeHtml: (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// ===== AUTENTICAÇÃO =====
function isValidSession() {
    try {
        const raw = sessionStorage.getItem(ADMIN_CONFIG.STORAGE_KEY);
        if (!raw) return false;
        const data = JSON.parse(raw);
        return data?.token === ADMIN_CONFIG.SENHA && Date.now() < data.expires;
    } catch {
        return false;
    }
}

function createSession() {
    sessionStorage.setItem(ADMIN_CONFIG.STORAGE_KEY, JSON.stringify({
        token: ADMIN_CONFIG.SENHA,
        expires: Date.now() + (ADMIN_CONFIG.SESSION_HOURS * 60 * 60 * 1000)
    }));
}

function clearSession() {
    sessionStorage.removeItem(ADMIN_CONFIG.STORAGE_KEY);
}

// ===== MODAL DE LOGIN =====
function openLoginModal() {
    const modal = document.getElementById('admin-login');
    const painel = document.getElementById('painel-conteudo');

    if (modal) modal.classList.remove('hidden');
    if (painel) painel.classList.add('hidden');

    setTimeout(() => {
        const input = document.getElementById('admin-pass');
        if (input) {
            input.focus();
            input.select();
        }
    }, 100);

    document.body.style.overflow = 'hidden';
}

function closeLoginModal() {
    const modal = document.getElementById('admin-login');
    const painel = document.getElementById('painel-conteudo');

    if (modal) modal.classList.add('hidden');
    if (painel) painel.classList.remove('hidden');

    document.body.style.overflow = '';
}

function cancelarLogin() {
    window.location.href = "index.html";
}

function handleLogin(e) {
    if (e) e.preventDefault();

    const input = document.getElementById('admin-pass');
    const error = document.getElementById('login-error');

    if (!input) return;

    if (input.value.trim() === ADMIN_CONFIG.SENHA) {
        createSession();
        closeLoginModal();
        unlockPanel();

        if (error) error.classList.add('hidden');
        input.value = '';
        console.log("✅ Login realizado com sucesso");
    } else {
        if (error) {
            error.classList.remove('hidden');
            error.textContent = "❌ Senha incorreta. Tente novamente.";
        }
        input.classList.add('border-red-500', 'ring-4', 'ring-red-500/20');
        setTimeout(() => {
            input.classList.remove('border-red-500', 'ring-4', 'ring-red-500/20');
        }, 1000);
        input.select();
        console.warn("❌ Senha incorreta");
    }
}

function logout() {
    clearSession();
    window.location.href = "index.html";
}

// ===== DESBLOQUEAR PAINEL =====
function unlockPanel() {
    const painel = document.getElementById('painel-conteudo');
    if (painel) {
        painel.classList.remove('hidden');
    }
    const statusSalvo = localStorage.getItem("statusLoja") || "aberto";
    atualizarInterfaceAdmin(statusSalvo);
    carregarPedidos();
    console.log("🔓 Painel desbloqueado");
}

// ===== CONTROLE DA LOJA =====
function alterarStatus(status) {
    if (!isValidSession()) {
        openLoginModal();
        return;
    }
    localStorage.setItem("statusLoja", status);
    atualizarInterfaceAdmin(status);

    window.dispatchEvent(new StorageEvent('storage', {
        key: 'statusLoja',
        newValue: status
    }));
}

function atualizarInterfaceAdmin(status) {
    const el = document.getElementById("status-atual");
    if (!el) return;

    el.innerText = status === "aberto" ? "ABERTO ✅" : "FECHADO 🔒";
    el.className = `text-xl font-bold ${status === "aberto" ? "text-green-600" : "text-red-600"}`;
}

// ===== FUNÇÃO AUXILIAR =====
function encontrarPedidoPorDados(pedidos, pedidoRef) {
    return pedidos.findIndex(p =>
        p.cliente === pedidoRef.cliente &&
        p.hora === pedidoRef.hora &&
        p.total === pedidoRef.total &&
        p.criadoEm === pedidoRef.criadoEm
    );
}

// ===== LISTA DE PEDIDOS =====
function carregarPedidos() {
    const lista = document.getElementById("pedidos-lista");
    if (!lista) return;

    const pedidos = JSON.parse(localStorage.getItem("pedidosRecebidos") || "[]");
    lista.innerHTML = "";

    const pedidosAtivos = pedidos.filter(p => p.status !== "entregue" && p.status !== "cancelado");

    if (pedidosAtivos.length === 0) {
        lista.innerHTML = `
            <div class="col-span-full text-center py-20">
                <div class="text-6xl mb-4">📭</div>
                <p class="text-gray-400 text-xl font-medium">Aguardando novos pedidos...</p>
                <p class="text-gray-300 text-sm mt-2">Os pedidos aparecem aqui em tempo real!</p>
            </div>`;
        return;
    }

    pedidosAtivos.reverse().forEach((p) => {
        const preparando = p.status === "preparando";
        const borda = preparando ? "border-yellow-400" : "border-green-500";
        const badge = preparando
            ? `<span class="text-yellow-700 font-semibold text-xs bg-yellow-100 px-3 py-1.5 rounded-full">🔄 PREPARANDO</span>`
            : `<span class="text-green-700 font-semibold text-xs bg-green-100 px-3 py-1.5 rounded-full">✨ NOVO</span>`;

        const btnPrimario = preparando
            ? `<button onclick="abrirModalFinalizado('${encodeURIComponent(JSON.stringify(p))}')" class="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg">✅ ENTREGUE</button>`
            : `<button onclick="prepararPedido('${encodeURIComponent(JSON.stringify(p))}')" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg">🔄 PREPARAR</button>`;

        const btnSecundario = `<button onclick="cancelarPedido('${encodeURIComponent(JSON.stringify(p))}')" class="text-red-600 hover:text-red-800 text-sm font-medium px-3">Cancelar</button>`;

        const itensHTML = p.itens.split('|').map(item =>
            `<span class="block text-sm text-gray-700">• ${Utils.escapeHtml(item.trim())}</span>`
        ).join('');

        lista.innerHTML += `
        <article class="bg-white rounded-2xl shadow-lg border-t-[6px] ${borda} p-5 transition-all hover:shadow-xl border border-gray-100 animate-bounce-in">
            <header class="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
                <span class="text-sm text-gray-500 font-medium">🕒 ${Utils.escapeHtml(p.hora)}</span>
                ${badge}
            </header>
            
            <div class="mb-4">${badge}</div>
            
            <section class="mb-4">
                <p class="text-xs font-extrabold text-gray-500 uppercase tracking-wide mb-1">👤 Cliente</p>
                <p class="font-bold text-lg text-gray-800">${Utils.escapeHtml(p.cliente)}</p>
            </section>
            
            <section class="mb-4">
                <p class="text-xs font-extrabold text-gray-500 uppercase tracking-wide mb-1">📱 Número</p>
                <p class="font-bold text-lg text-gray-800">${Utils.escapeHtml(p.numero || 'Não informado')}</p>
            </section>
            
            <section class="mb-4">
                <p class="text-xs font-extrabold text-gray-500 uppercase tracking-wide mb-1">📍 Endereço</p>
                <p class="font-bold text-lg text-gray-800">${Utils.escapeHtml(p.endereco)}</p>
            </section>
            
            <section class="mb-4 bg-gray-100 p-4 rounded-xl border border-gray-100">
                <p class="text-xs font-extrabold text-gray-500 uppercase tracking-wide mb-2">🍔 Itens</p>
                <div class="space-y-1 font-bold">${itensHTML}</div>
            </section>
            
            <footer class="flex justify-between items-center pt-4 border-t border-gray-100">
                <div>
                    <p class="text-xs font-bold text-gray-400 uppercase">💰 Total</p>
                    <p class="font-black text-2xl text-green-600">${Utils.escapeHtml(p.total)}</p>
                    <p class="text-lg text-gray-400 mt-1">💳 ${Utils.escapeHtml(p.pagamento)}</p>
                </div>
                <div class="text-right space-y-2">
                    ${btnPrimario}
                    ${btnSecundario}
                </div>
            </footer>
        </article>`;
    });
}

// ===== AÇÕES DOS PEDIDOS =====
function prepararPedido(pedidoEncoded) {
    if (!isValidSession()) {
        openLoginModal();
        return;
    }

    try {
        const pedidoRef = JSON.parse(decodeURIComponent(pedidoEncoded));
        const pedidos = JSON.parse(localStorage.getItem("pedidosRecebidos") || "[]");
        const index = encontrarPedidoPorDados(pedidos, pedidoRef);

        if (index !== -1) {
            pedidos[index].status = "preparando";
            pedidos[index].atualizadoEm = new Date().toISOString();
            localStorage.setItem("pedidosRecebidos", JSON.stringify(pedidos));
            carregarPedidos();

            window.dispatchEvent(new StorageEvent('storage', {
                key: 'pedidosRecebidos',
                newValue: localStorage.getItem('pedidosRecebidos')
            }));

            console.log(`🔄 Pedido de ${pedidoRef.cliente} marcado como "preparando"`);
        }
    } catch (e) {
        console.error("Erro ao preparar pedido:", e);
        alert("Erro ao processar ação. Tente novamente.");
    }
}

function cancelarPedido(pedidoEncoded) {
    if (!isValidSession()) {
        openLoginModal();
        return;
    }

    try {
        const pedidoRef = JSON.parse(decodeURIComponent(pedidoEncoded));
        if (!confirm(`Deseja realmente CANCELAR o pedido de ${pedidoRef.cliente}?`)) return;

        const pedidos = JSON.parse(localStorage.getItem("pedidosRecebidos") || "[]");
        const index = encontrarPedidoPorDados(pedidos, pedidoRef);

        if (index !== -1) {
            pedidos[index].status = "cancelado";
            pedidos[index].canceladoEm = new Date().toISOString();
            localStorage.setItem("pedidosRecebidos", JSON.stringify(pedidos));
            carregarPedidos();

            window.dispatchEvent(new StorageEvent('storage', {
                key: 'pedidosRecebidos',
                newValue: localStorage.getItem('pedidosRecebidos')
            }));

            console.log(`❌ Pedido de ${pedidoRef.cliente} cancelado`);
        }
    } catch (e) {
        console.error("Erro ao cancelar pedido:", e);
        alert("Erro ao processar ação. Tente novamente.");
    }
}

// ===== MODAL DE FINALIZAÇÃO =====
function abrirModalFinalizado(pedidoEncoded) {
    if (!isValidSession()) {
        openLoginModal();
        return;
    }

    try {
        const pedidoRef = JSON.parse(decodeURIComponent(pedidoEncoded));
        const pedidos = JSON.parse(localStorage.getItem("pedidosRecebidos") || "[]");
        const index = encontrarPedidoPorDados(pedidos, pedidoRef);
        const pedido = index !== -1 ? pedidos[index] : null;

        if (!pedido) {
            alert("Pedido não encontrado!");
            return;
        }

        const modal = document.getElementById('order-complete-modal');
        if (!modal) {
            if (confirm(`Finalizar pedido de ${pedido.cliente}?`)) {
                finalizarPedido(pedido);
            }
            return;
        }

        pedidoParaFinalizar = pedido;

        const elCliente = document.getElementById('modal-pedido-cliente');
        const elTotal = document.getElementById('modal-pedido-total');
        const elPedidosHoje = document.getElementById('modal-pedidos-hoje');
        const elFaturamento = document.getElementById('modal-faturamento');

        const elId = document.getElementById('modal-pedido-id');
        if (elId && elId.parentElement) {
            elId.parentElement.classList.add('hidden');
        }

        if (elCliente) elCliente.textContent = pedido.cliente;
        if (elTotal) elTotal.textContent = pedido.total;

        const clienteContainer = elCliente?.parentElement;
        if (clienteContainer) {
            const existing = clienteContainer.querySelector('.modal-cliente-numero');
            if (existing) existing.remove();

            const numeroEl = document.createElement('p');
            numeroEl.className = 'text-sm text-gray-600 mt-1 modal-cliente-numero';
            numeroEl.innerHTML = `📱 ${Utils.escapeHtml(pedido.numero || 'Não informado')}`;
            clienteContainer.appendChild(numeroEl);
        }

        const hoje = new Date().toLocaleDateString('pt-BR');
        const pedidosHoje = pedidos.filter(p => {
            const dataPedido = p.criadoEm ? new Date(p.criadoEm).toLocaleDateString('pt-BR') : null;
            return p.status === "entregue" || dataPedido === hoje;
        });

        const faturamentoHoje = pedidosHoje
            .filter(p => p.status === "entregue")
            .reduce((acc, p) => acc + Utils.parseBRL(p.total), 0);

        if (elPedidosHoje) elPedidosHoje.textContent = pedidosHoje.length;
        if (elFaturamento) elFaturamento.textContent = Utils.formatBRL(faturamentoHoje);

        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.style.overflow = 'hidden';
    } catch (e) {
        console.error("Erro ao abrir modal:", e);
        alert("Erro ao carregar pedido.");
    }
}

function fecharModalFinalizado() {
    const modal = document.getElementById('order-complete-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    document.body.style.overflow = '';
    pedidoParaFinalizar = null;
}

function confirmarRemocaoPedido() {
    if (!pedidoParaFinalizar) return;
    finalizarPedido(pedidoParaFinalizar);
    fecharModalFinalizado();
}

function finalizarPedido(pedido) {
    const pedidos = JSON.parse(localStorage.getItem("pedidosRecebidos") || "[]");
    const index = encontrarPedidoPorDados(pedidos, pedido);

    if (index !== -1) {
        pedidos[index].status = "entregue";
        pedidos[index].finalizadoEm = new Date().toISOString();
        localStorage.setItem("pedidosRecebidos", JSON.stringify(pedidos));
        carregarPedidos();

        window.dispatchEvent(new StorageEvent('storage', {
            key: 'pedidosRecebidos',
            newValue: localStorage.getItem('pedidosRecebidos')
        }));

        console.log(`✅ Pedido de ${pedido.cliente} finalizado!`);
    }
}

// ===== INICIALIZAÇÃO =====
function initAdmin() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modalFinalizado = document.getElementById('order-complete-modal');
            const modalLogin = document.getElementById('admin-login');

            if (modalFinalizado && !modalFinalizado.classList.contains('hidden')) {
                fecharModalFinalizado();
            } else if (modalLogin && !modalLogin.classList.contains('hidden')) {
                cancelarLogin();
            }
        }
    });

    if (isValidSession()) {
        unlockPanel();
        console.log("✅ Sessão válida - painel liberado");
    } else {
        openLoginModal();
        console.log("🔐 Login necessário - modal aberto");
    }

    console.log("🔐 Admin.js inicializado | Dashboard pronto!");
}

window.addEventListener('load', initAdmin);

window.addEventListener('storage', (e) => {
    if (!isValidSession()) return;

    if (e.key === 'pedidosRecebidos') {
        carregarPedidos();
        console.log("🔄 Pedidos atualizados via sync");
    }
    if (e.key === 'statusLoja') {
        atualizarInterfaceAdmin(e.newValue);
        console.log(`🔄 Status da loja atualizado: ${e.newValue}`);
    }
});

// ===== GESTÃO DE CARDÁPIO E DESCONTOS =====
function getProdutos() { return JSON.parse(localStorage.getItem('devburguer_menu') || '[]'); }
function saveProdutos(p) { localStorage.setItem('devburguer_menu', JSON.stringify(p)); }
function getDescontos() { return JSON.parse(localStorage.getItem('devburguer_descontos') || '[]'); }
function saveDescontos(d) { localStorage.setItem('devburguer_descontos', JSON.stringify(d)); }

function renderAdminProdutos() {
    const list = document.getElementById('admin-produtos-list');
    if (!list) return;
    const produtos = getProdutos();
    if (!produtos.length) { list.innerHTML = '<p class="text-gray-400 text-center py-4">Nenhum produto cadastrado</p>'; return; }

    list.innerHTML = produtos.map(p => `
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
            <div class="flex items-center gap-3">
                <img src="${p.imagem || 'assets/hamb-1.png'}" class="w-10 h-10 rounded object-cover">
                <div>
                    <p class="font-medium text-sm">${p.nome}</p>
                    <p class="text-xs text-gray-500">${p.categoria} • ${p.active ? '✅ Ativo' : '⏸️ Inativo'}</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <span class="font-bold text-green-600">R$ ${p.price.toFixed(2)}</span>
                <button onclick="editarProduto(${p.id})" class="text-blue-500 hover:text-blue-700 text-sm">✏️</button>
                <button onclick="toggleProduto(${p.id})" class="text-yellow-500 hover:text-yellow-700 text-sm">${p.active ? '⏸️' : '▶️'}</button>
                <button onclick="excluirProduto(${p.id})" class="text-red-500 hover:text-red-700 text-sm">🗑️</button>
            </div>
        </div>
    `).join('');
}

function renderAdminDescontos() {
    const list = document.getElementById('admin-descontos-list');
    if (!list) return;
    const descontos = getDescontos();
    if (!descontos.length) { list.innerHTML = '<p class="text-gray-400 text-center py-4">Nenhum desconto criado</p>'; return; }

    const hoje = new Date().toISOString().split('T')[0];
    list.innerHTML = descontos.map(d => {
        const ativo = d.active && hoje >= d.startDate && hoje <= d.endDate;
        const valorTxt = d.type === 'percent' ? `${d.value}%` : `R$ ${d.value.toFixed(2)}`;
        return `
        <div class="p-3 bg-purple-50 rounded-lg border ${!ativo ? 'opacity-60' : ''}">
            <div class="flex justify-between items-start">
                <div>
                    <p class="font-medium text-sm">${d.name}</p>
                    <p class="text-xs text-gray-500">${ativo ? '🟢 Ativo' : '⏸️ Expirado/Inativo'} • ${valorTxt} • ${d.applyTo}</p>
                    <p class="text-xs text-gray-400">${d.startDate} até ${d.endDate}</p>
                </div>
                <button onclick="excluirDesconto(${d.id})" class="text-red-400 hover:text-red-600 text-sm">🗑️</button>
            </div>
        </div>`;
    }).join('');
}

// ===== FUNÇÕES AUXILIARES PARA CAMPOS DINÂMICOS =====
function _limparCamposAdicionais() {
    const container = document.getElementById('adicionais-container');
    if (container) container.innerHTML = '';
}

function _limparCamposTamanhos() {
    const container = document.getElementById('tamanhos-container');
    if (container) container.innerHTML = '';
}

function _preencherCamposAdicionais(adicionais) {
    if (!adicionais?.opcoes) return;
    const obrigatoriosInput = document.getElementById('adicionais-obrigatorios');
    if (obrigatoriosInput && adicionais.obrigatorios) {
        obrigatoriosInput.value = adicionais.obrigatorios;
    }
    adicionais.opcoes.forEach(op => {
        if (typeof window.addAdicionalField === 'function') {
            window.addAdicionalField(op.nome, op.preco);
        }
    });
}

function _preencherCamposTamanhos(tamanhos) {
    if (!Array.isArray(tamanhos)) return;
    tamanhos.forEach(t => {
        if (typeof window.addTamanhoField === 'function') {
            window.addTamanhoField(t.ml, t.label, t.acrescimo);
        }
    });
}

function _coletarCamposAdicionais() {
    const container = document.getElementById('adicionais-container');
    if (!container) return null;

    const opcoes = [];
    container.querySelectorAll('.adicional-row').forEach(row => {
        const nome = row.querySelector('.adicional-nome')?.value.trim();
        const preco = parseFloat(row.querySelector('.adicional-preco')?.value);
        if (nome && !isNaN(preco)) {
            opcoes.push({ nome, preco });
        }
    });

    if (opcoes.length === 0) return null;

    const obrigatorios = parseInt(document.getElementById('adicionais-obrigatorios')?.value) || 5;
    return { obrigatorios, opcoes };
}

function _coletarCamposTamanhos() {
    const container = document.getElementById('tamanhos-container');
    if (!container) return null;

    const lista = [];
    container.querySelectorAll('.tamanho-row').forEach(row => {
        const ml = parseInt(row.querySelector('.tamanho-ml')?.value);
        const label = row.querySelector('.tamanho-label')?.value.trim();
        const acrescimo = parseFloat(row.querySelector('.tamanho-acrescimo')?.value) || 0;
        if (ml && label) {
            lista.push({ ml, label, acrescimo });
        }
    });

    return lista.length > 0 ? lista : null;
}

// ===== MODAL PRODUTO (COM ADICIONAIS/TAMANHOS) =====
function abrirModalProduto(id = null) {
    document.getElementById('modal-produto')?.classList.remove('hidden');
    document.getElementById('modal-produto')?.classList.add('flex');

    _limparCamposAdicionais();
    _limparCamposTamanhos();

    if (id) {
        const p = getProdutos().find(x => x.id === id);
        if (!p) return;

        document.getElementById('modal-produto-titulo').textContent = 'Editar Produto';
        document.getElementById('prod-id').value = p.id;
        document.getElementById('prod-nome').value = p.nome;
        document.getElementById('prod-preco').value = p.price;
        document.getElementById('prod-categoria').value = p.categoria;
        document.getElementById('prod-imagem').value = p.imagem || '';
        document.getElementById('prod-descricao').value = p.descricao || '';

        if (p.adicionais) {
            _preencherCamposAdicionais(p.adicionais);
        }
        if (p.tamanhos) {
            _preencherCamposTamanhos(p.tamanhos);
        }

        document.getElementById('prod-categoria')?.dispatchEvent(new Event('change'));
    } else {
        document.getElementById('modal-produto-titulo').textContent = 'Novo Produto';
        document.getElementById('prod-id').value = '';
        document.getElementById('prod-nome').value = '';
        document.getElementById('prod-preco').value = '';
        document.getElementById('prod-categoria').value = '';
        document.getElementById('prod-imagem').value = '';
        document.getElementById('prod-descricao').value = '';
        const obrigInput = document.getElementById('adicionais-obrigatorios');
        if (obrigInput) obrigInput.value = '5';

        document.getElementById('prod-categoria')?.dispatchEvent(new Event('change'));
    }
}

function fecharModalProduto() {
    document.getElementById('modal-produto')?.classList.add('hidden');
    document.getElementById('modal-produto')?.classList.remove('flex');
}

function abrirModalDesconto() {
    document.getElementById('modal-desconto')?.classList.remove('hidden');
    document.getElementById('modal-desconto')?.classList.add('flex');
    document.getElementById('desc-id').value = '';
    document.getElementById('desc-nome').value = '';
    document.getElementById('desc-valor').value = '';
    document.getElementById('desc-inicio').value = new Date().toISOString().split('T')[0];
    document.getElementById('desc-fim').value = '';
}
function fecharModalDesconto() {
    document.getElementById('modal-desconto')?.classList.add('hidden');
    document.getElementById('modal-desconto')?.classList.remove('flex');
}

// ===== SALVAR PRODUTO =====
function salvarProduto() {
    const id = document.getElementById('prod-id')?.value;
    const nome = document.getElementById('prod-nome')?.value.trim();
    const price = parseFloat(document.getElementById('prod-preco')?.value);
    const categoria = document.getElementById('prod-categoria')?.value;
    const imagem = document.getElementById('prod-imagem')?.value.trim();
    const descricao = document.getElementById('prod-descricao')?.value.trim();

    if (!nome || isNaN(price)) return alert('Preencha nome e preço!');

    // Coletar adicionais (se categoria for potes/copos)
    let adicionais = null;
    if (categoria === 'potes' || categoria === 'copos') {
        adicionais = _coletarCamposAdicionais();
    }

    // Coletar tamanhos (se categoria for milkshakes)
    let tamanhos = null;
    if (categoria === 'milkshakes' || categoria === 'milkshakesespecial') {
        tamanhos = _coletarCamposTamanhos();
    }

    let produtos = getProdutos();

    if (id) {
        const idx = produtos.findIndex(p => p.id == id);
        if (idx !== -1) {
            produtos[idx] = {
                ...produtos[idx],
                nome,
                price,
                categoria,
                imagem,
                descricao,
                adicionais,
                tamanhos
            };
        }
    } else {
        produtos.push({
            id: Date.now(),
            nome,
            price,
            categoria,
            imagem,
            descricao,
            active: true,
            adicionais,
            tamanhos
        });
    }

    saveProdutos(produtos);
    fecharModalProduto();
    renderAdminProdutos();

    window.dispatchEvent(new StorageEvent('storage', {
        key: 'devburguer_menu',
        newValue: localStorage.getItem('devburguer_menu')
    }));
}

function editarProduto(id) { abrirModalProduto(id); }
function toggleProduto(id) {
    const produtos = getProdutos();
    const p = produtos.find(x => x.id === id);
    if (p) { p.active = !p.active; saveProdutos(produtos); renderAdminProdutos(); }
}
function excluirProduto(id) {
    if (!confirm('Excluir produto?')) return;
    saveProdutos(getProdutos().filter(p => p.id !== id));
    renderAdminProdutos();
}

function salvarDesconto() {
    const nome = document.getElementById('desc-nome')?.value.trim();
    const tipo = document.getElementById('desc-tipo')?.value;
    const valor = parseFloat(document.getElementById('desc-valor')?.value);
    const aplicar = document.getElementById('desc-aplicar')?.value;
    const inicio = document.getElementById('desc-inicio')?.value;
    const fim = document.getElementById('desc-fim')?.value;

    if (!nome || isNaN(valor) || !inicio || !fim) return alert('Preencha todos os campos!');

    let descontos = getDescontos();
    descontos.push({ id: Date.now(), name: nome, type: tipo, value: valor, applyTo: aplicar, startDate: inicio, endDate: fim, active: true });
    saveDescontos(descontos);
    fecharModalDesconto();
    renderAdminDescontos();
}

function excluirDesconto(id) {
    if (!confirm('Excluir desconto?')) return;
    saveDescontos(getDescontos().filter(d => d.id !== id));
    renderAdminDescontos();
}

// ===== EXPORTAÇÕES PARA O HTML =====
window.cancelarLogin = cancelarLogin;
window.handleLogin = handleLogin;
window.logout = logout;
window.alterarStatus = alterarStatus;
window.prepararPedido = prepararPedido;
window.cancelarPedido = cancelarPedido;
window.abrirModalFinalizado = abrirModalFinalizado;
window.fecharModalFinalizado = fecharModalFinalizado;
window.confirmarRemocaoPedido = confirmarRemocaoPedido;
window.mudarAba = mudarAba;

const _carregarPedidosOriginal = window.carregarPedidos;
window.carregarPedidos = function () {
    if (typeof _carregarPedidosOriginal === 'function') {
        _carregarPedidosOriginal();
    }
    setTimeout(refreshCharts, 50);
};

const _unlockPanelOriginal = window.unlockPanel;
window.unlockPanel = function () {
    if (typeof _unlockPanelOriginal === 'function') {
        _unlockPanelOriginal();
    }
    setTimeout(initCharts, 300);
};

window.addEventListener('storage', (e) => {
    if (!isValidSession()) return;
    if (e.key === 'pedidosRecebidos') {
        setTimeout(() => {
            refreshCharts();
            renderQuantidadeVendas('mensal');
        }, 100);
    }
    if (e.key === 'statusLoja') {
        atualizarInterfaceAdmin(e.newValue);
        console.log(`🔄 Status da loja atualizado: ${e.newValue}`);
    }
});