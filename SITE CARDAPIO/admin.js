// ===== CONFIG =====
const ADMIN_CONFIG = {
    SENHA: "1234",
    STORAGE_KEY: "devburguer_admin",
    SESSION_HOURS: 24
};

// ===== VARIÁVEL PARA ARMAZENAR PEDIDO PENDENTE =====
let pedidoParaFinalizar = null;

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
    atualizarInterfaceAdmin(localStorage.getItem("statusLoja") || "aberto");
    carregarPedidos();
    console.log("🔓 Painel desbloqueado");
}

// ===== FUNÇÕES DO PAINEL =====
function alterarStatus(status) {
    if (!isValidSession()) {
        openLoginModal();
        return;
    }
    localStorage.setItem("statusLoja", status);
    atualizarInterfaceAdmin(status);
}

function atualizarInterfaceAdmin(status) {
    const el = document.getElementById("status-atual");
    if (!el) return;

    el.innerText = status === "aberto" ? "ABERTO ✅" : "FECHADO 🔒";
    el.className = `text-xl font-bold ${status === "aberto" ? "text-green-600" : "text-red-600"}`;
}

function carregarPedidos() {
    const lista = document.getElementById("pedidos-lista");
    if (!lista) return;

    const pedidos = JSON.parse(localStorage.getItem("pedidosRecebidos") || "[]");
    lista.innerHTML = "";

    if (pedidos.length === 0) {
        lista.innerHTML = `
            <div class="col-span-full text-center py-20">
                <div class="text-6xl mb-4">📭</div>
                <p class="text-gray-400 text-xl font-medium">Aguardando novos pedidos...</p>
            </div>`;
        return;
    }

    pedidos.forEach((p, i) => {
        const preparando = p.status === "preparando";
        const borda = preparando ? "border-yellow-400" : "border-green-500";
        const label = preparando
            ? `<span class="text-yellow-600 font-black text-xs animate-pulse bg-yellow-50 px-2 py-1 rounded">● PREPARANDO</span>`
            : `<span class="text-green-600 font-black text-xs bg-green-50 px-2 py-1 rounded">● NOVO PEDIDO</span>`;
        const btnTexto = preparando ? "FINALIZAR" : "PREPARAR";
        const btnClass = preparando
            ? "bg-red-600 hover:bg-red-700 text-white"
            : "bg-yellow-400 hover:bg-yellow-500 text-black";
        const acao = preparando ? `abrirModalFinalizado(${JSON.stringify(p).replace(/"/g, '&quot;')})` : `prepararPedido(${i})`;

        lista.innerHTML += `
        <div class="bg-white rounded-2xl shadow-lg border-t-[12px] ${borda} p-5 transition-all hover:shadow-xl border border-gray-100">
            <div class="flex justify-between items-center mb-3 pb-3 border-b border-gray-100">
                <span class="font-mono font-bold bg-zinc-800 text-white px-3 py-1 rounded-lg text-sm">#${p.id}</span>
                <span class="text-sm text-gray-500 font-medium">🕒 ${p.hora}</span>
            </div>
            <div class="mb-3">${label}</div>
            <div class="mb-2">
                <p class="text-xs font-bold text-gray-400 uppercase tracking-wide">Cliente</p>
                <p class="font-bold text-lg text-gray-800">${p.cliente}</p>
            </div>
            <div class="mb-3">
                <p class="text-xs font-bold text-gray-400 uppercase tracking-wide">Endereço</p>
                <p class="font-bold text-lg text-gray-800">${p.endereco}</p>
            </div>
            <div class="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <p class="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Itens</p>
                <p class="text-sm text-gray-700">${p.itens.split('|').join('<br>')}</p>
            </div>
            <div class="flex justify-between items-center pt-3 border-t border-gray-100">
                <div>
                    <p class="text-xs font-bold text-gray-400 uppercase">Total</p>
                    <p class="font-black text-2xl text-green-600">${p.total}</p>
                </div>
                <button onclick="${acao}" 
                    class="${btnClass} px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg">
                    ${btnTexto}
                </button>
            </div>
        </div>`;
    });
}

function prepararPedido(i) {
    if (!isValidSession()) {
        openLoginModal();
        return;
    }
    const pedidos = JSON.parse(localStorage.getItem("pedidosRecebidos") || "[]");
    if (pedidos[i]) {
        pedidos[i].status = "preparando";
        localStorage.setItem("pedidosRecebidos", JSON.stringify(pedidos));
        carregarPedidos();
    }
}

function abrirModalFinalizado(pedido) {
    if (!isValidSession()) {
        openLoginModal();
        return;
    }

    const modal = document.getElementById('order-complete-modal');
    if (!modal) {
        // Fallback se modal não existir
        if (confirm(`Finalizar pedido #${pedido.id} de ${pedido.cliente}?`)) {
            removerPedidoDoSistema(pedido);
        }
        return;
    }

    // Armazena pedido para confirmar depois
    pedidoParaFinalizar = pedido;

    // Preenche dados no modal
    const elId = document.getElementById('modal-pedido-id');
    const elCliente = document.getElementById('modal-pedido-cliente');
    const elTotal = document.getElementById('modal-pedido-total');
    const elPedidosHoje = document.getElementById('modal-pedidos-hoje');
    const elFaturamento = document.getElementById('modal-faturamento');

    if (elId) elId.textContent = `#${pedido.id}`;
    if (elCliente) elCliente.textContent = pedido.cliente;
    if (elTotal) elTotal.textContent = pedido.total;

    // CÁLCULO DE FATURAMENTO
    const pedidos = JSON.parse(localStorage.getItem("pedidosRecebidos") || "[]");
    const totalPedidos = pedidos.length;

    const faturamento = pedidos.reduce((acc, p) => {
        let valorStr = String(p.total).replace('R$', '').trim();
        const valor = parseFloat(valorStr.replace(',', '.')) || 0;
        return acc + valor;
    }, 0);

    const faturamentoFormatado = faturamento.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    if (elPedidosHoje) elPedidosHoje.textContent = totalPedidos;
    if (elFaturamento) elFaturamento.textContent = `R$ ${faturamentoFormatado}`;

    // Mostra modal
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function fecharModalFinalizado() {
    const modal = document.getElementById('order-complete-modal');
    if (modal) modal.classList.add('hidden');
    document.body.style.overflow = '';
    pedidoParaFinalizar = null;
}

function confirmarRemocaoPedido() {
    if (!pedidoParaFinalizar) return;

    removerPedidoDoSistema(pedidoParaFinalizar);
    fecharModalFinalizado();
}

function removerPedidoDoSistema(pedido) {
    const pedidos = JSON.parse(localStorage.getItem("pedidosRecebidos") || "[]");
    const index = pedidos.findIndex(p => p.id === pedido.id);

    if (index !== -1) {
        pedidos.splice(index, 1);
        localStorage.setItem("pedidosRecebidos", JSON.stringify(pedidos));
        carregarPedidos();
        console.log(`✅ Pedido #${pedido.id} finalizado`);
    }
}

function removerPedido(i) {
    if (!isValidSession()) {
        openLoginModal();
        return;
    }
    const pedidos = JSON.parse(localStorage.getItem("pedidosRecebidos") || "[]");
    if (pedidos[i]) {
        pedidos[i].status = "preparando";
        localStorage.setItem("pedidosRecebidos", JSON.stringify(pedidos));
        carregarPedidos();
    }
}

window.cancelarLogin = cancelarLogin;
window.closeLoginModal = closeLoginModal;
window.handleLogin = handleLogin;
window.logout = logout;
window.alterarStatus = alterarStatus;
window.prepararPedido = prepararPedido;
window.removerPedido = removerPedido;
window.abrirModalFinalizado = abrirModalFinalizado;
window.fecharModalFinalizado = fecharModalFinalizado;
window.confirmarRemocaoPedido = confirmarRemocaoPedido;

// ===== INICIALIZAÇÃO =====
function initAdmin() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modalLogin = document.getElementById('admin-login');
            const modalFinalizado = document.getElementById('order-complete-modal');
            if (modalFinalizado && !modalFinalizado.classList.contains('hidden')) {
                fecharModalFinalizado();
            } else if (modalLogin && !modalLogin.classList.contains('hidden')) {
                cancelarLogin();
            }
        }
    });

    // Verifica autenticação
    if (isValidSession()) {
        unlockPanel();
        console.log("✅ Sessão válida - painel liberado");
    } else {
        openLoginModal();
        console.log("🔐 Login necessário - modal aberto");
    }
}

window.addEventListener('load', initAdmin);
window.addEventListener('storage', (e) => {
    if (e.key === 'pedidosRecebidos') carregarPedidos();
    if (e.key === 'statusLoja') atualizarInterfaceAdmin(e.newValue);
});

console.log("🔐 Admin.js carregado | Modal de finalização: ATIVO");