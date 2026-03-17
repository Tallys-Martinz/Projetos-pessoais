// ===== CONFIGURAÇÃO =====
const ADMIN_CONFIG = {
    SENHA: "1234",       // SENHA DO PAINEL
    STORAGE_KEY: "devburguer_admin",
    SESSION_HOURS: 24
};

// ===== AUTENTICAÇÃO =====
function isValidSession() {
    try {
        const data = JSON.parse(localStorage.getItem(ADMIN_CONFIG.STORAGE_KEY));
        return data?.token === ADMIN_CONFIG.SENHA && Date.now() < data.expires;
    } catch { return false; }
}

function createSession() {
    localStorage.setItem(ADMIN_CONFIG.STORAGE_KEY, JSON.stringify({
        token: ADMIN_CONFIG.SENHA,
        expires: Date.now() + (ADMIN_CONFIG.SESSION_HOURS * 60 * 60 * 1000)
    }));
}

function clearSession() {
    localStorage.removeItem(ADMIN_CONFIG.STORAGE_KEY);
}

function openLoginModal() {
    const modal = document.getElementById('admin-login');
    if (modal) {
        modal.classList.remove('hidden');
        setTimeout(() => document.getElementById('admin-pass')?.focus(), 100);
        document.body.style.overflow = 'hidden';
    }
}

function closeLoginModal() {
    const modal = document.getElementById('admin-login');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
        const input = document.getElementById('admin-pass');
        const error = document.getElementById('login-error');
        if (input) input.value = '';
        if (error) error.classList.add('hidden');
    }
}

function handleLogin(e) {
    e.preventDefault();
    const input = document.getElementById('admin-pass');
    const error = document.getElementById('login-error');
    if (!input) return;
    
    if (input.value.trim() === ADMIN_CONFIG.SENHA) {
        createSession();
        closeLoginModal();
        
        toggleInteractions(true);


        atualizarInterfaceAdmin(localStorage.getItem("statusLoja") || "aberto");
        carregarPedidos();
        
    } else {
        if (error) error.classList.remove('hidden');
        input.classList.add('border-red-400');
        setTimeout(() => input.classList.remove('border-red-400'), 1500);
        input.select();
    }
}

function logout() {
    clearSession();
    window.location.href = "index.html";
}

// Expor funções para onclick no HTML
window.closeLoginModal = closeLoginModal;
window.handleLogin = handleLogin;
window.logout = logout;

// ===== PAINEL DE PEDIDOS =====
function alterarStatus(status) {
    localStorage.setItem("statusLoja", status);
    atualizarInterfaceAdmin(status);
}

function atualizarInterfaceAdmin(status) {
    const statusText = document.getElementById("status-atual");
    if (statusText) {
        statusText.innerText = status === "aberto" ? "ABERTO" : "FECHADO";
        statusText.style.color = status === "aberto" ? "#16a34a" : "#ef4444";
    }
}

function carregarPedidos() {
    const listaElement = document.getElementById("pedidos-lista");
    const pedidos = JSON.parse(localStorage.getItem("pedidosRecebidos")) || [];

    if (!listaElement) return;
    listaElement.innerHTML = "";

    if (pedidos.length === 0) {
        listaElement.innerHTML = `<div class="col-span-full text-center py-20"><p class="text-gray-400 text-xl italic">Aguardando novos pedidos...</p></div>`;
        return;
    }

    pedidos.forEach((pedido, index) => {
        const isPreparando = pedido.status === "preparando";
        const corBorda = isPreparando ? "border-yellow-400" : "border-green-500";
        const labelStatus = isPreparando ? 
            `<span class="text-yellow-600 font-black text-xs animate-pulse">● PREPARANDO</span>` : 
            `<span class="text-green-600 font-black text-xs">● NOVO PEDIDO</span>`;
        const textoBtn = isPreparando ? "FINALIZAR PEDIDO" : "INICIAR PREPARO";
        const classeBtn = isPreparando ? "bg-red-600 hover:bg-red-700 text-white" : "bg-yellow-400 hover:bg-yellow-500 text-black";
        const acaoBtn = isPreparando ? `removerPedido(${index})` : `prepararPedido(${index})`;

        const cardHtml = `
        <div class="bg-white rounded-2xl shadow-xl border-t-[12px] ${corBorda} flex flex-col h-full overflow-hidden transition-all hover:shadow-2xl">
            <div class="p-5 flex-grow">
                <div class="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
                    <span class="bg-zinc-800 text-white px-3 py-1 rounded-lg font-mono font-bold">#${pedido.id}</span>
                    <span class="text-gray-500 font-medium text-sm flex items-center gap-1">🕒 ${pedido.hora}</span>
                </div>
                <div class="mb-4">${labelStatus}</div>
                <div class="space-y-3 mb-5">
                    <div>
                        <span class="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Cliente</span>
                        <p class="text-xl font-bold text-zinc-900 leading-none">${pedido.cliente}</p>
                    </div>
                    <div>
                        <span class="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Endereço</span>
                        <p class="text-zinc-600 text-xl leading-tight font-bold italic">${pedido.endereco}</p>
                    </div>
                </div>
                <div class="bg-zinc-50 rounded-xl p-4 border border-zinc-100">
                    <span class="text-[10px] font-black text-gray-400 uppercase tracking-tighter block mb-2">Itens</span>
                    <div class="text-zinc-800 font-medium leading-relaxed">
                        ${pedido.itens.split('|').join('<div class="border-b border-zinc-200/50 my-1"></div>')}
                    </div>
                </div>
            </div>
            <div class="bg-zinc-700 p-5 flex flex-col gap-3">
                <div class="flex justify-between items-center">
                    <span class="text-zinc-400 text-xs font-bold uppercase">Total:</span>
                    <span class="text-white text-2xl font-black">${pedido.total}</span>
                </div>
                <button onclick="${acaoBtn}" class="${classeBtn} w-full py-3 rounded-xl font-black text-sm tracking-widest transition-transform active:scale-95 shadow-lg">
                    ${textoBtn}
                </button>
            </div>
        </div>`;
        listaElement.innerHTML += cardHtml;
    });
}

function prepararPedido(index) {
    let pedidos = JSON.parse(localStorage.getItem("pedidosRecebidos"));
    if (pedidos?.[index]) {
        pedidos[index].status = "preparando";
        localStorage.setItem("pedidosRecebidos", JSON.stringify(pedidos));
        carregarPedidos();
    }
}

function removerPedido(index) {
    if(confirm("Finalizar e remover este pedido?")) {
        let pedidos = JSON.parse(localStorage.getItem("pedidosRecebidos"));
        if (pedidos?.[index]) {
            pedidos.splice(index, 1);
            localStorage.setItem("pedidosRecebidos", JSON.stringify(pedidos));
            carregarPedidos();
        }
    }
}

// Expor funções para onclick no HTML
window.alterarStatus = alterarStatus;
window.prepararPedido = prepararPedido;
window.removerPedido = removerPedido;

// ===== INICIALIZAÇÃO =====
function initPainel() {
    atualizarInterfaceAdmin(localStorage.getItem("statusLoja") || "aberto");
    carregarPedidos();
    
    // Botão "Sair" com logout
    const btnSair = document.getElementById('btn-sair');
    if (btnSair) {
        btnSair.onclick = (e) => { e.preventDefault(); logout(); };
    }
}

function initAuth() {
    // Botão flutuante de acesso admin
    const openBtn = document.getElementById('open-admin-login');
    if (openBtn) {
        openBtn.onclick = (e) => {
            e.preventDefault();
            if (isValidSession()) {
                location.href = 'admin.html';
            } else {
                openLoginModal();
            }
        };
    }

    // Fecha modal com ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeLoginModal();
    });

    // ✅ CORREÇÃO: Sempre carrega a UI, independente de auth
    const statusElement = document.getElementById("status-atual");
    const pedidosElement = document.getElementById("pedidos-lista");
    
    if (statusElement || pedidosElement) {
        // Carrega status e pedidos IMEDIATAMENTE
        const statusSalvo = localStorage.getItem("statusLoja");
        atualizarInterfaceAdmin(statusSalvo || "aberto");
        carregarPedidos();
    }

    // ✅ Só mostra modal e bloqueia ações se NÃO autenticado em página admin
    if ((location.pathname.includes('admin.html') || location.pathname.includes('admin')) && !isValidSession()) {
        openLoginModal();
        toggleInteractions(false); // Bloqueia botões
    }
}

// ===== EVENTOS =====
window.addEventListener('load', () => {
    initAuth();
});

window.addEventListener('storage', (e) => {
    if (e.key === 'pedidosRecebidos') carregarPedidos();
    if (e.key === 'statusLoja') atualizarInterfaceAdmin(e.newValue);
});

// ✅ Nova função: controla se botões podem ser clicados
function toggleInteractions(enabled) {
    const botoes = document.querySelectorAll(`
        button[onclick*="alterarStatus"],
        button[onclick*="prepararPedido"],
        button[onclick*="removerPedido"]
    `);
    botoes.forEach(btn => {
        btn.disabled = !enabled;
        btn.style.opacity = enabled ? '1' : '0.5';
        btn.style.cursor = enabled ? 'pointer' : 'not-allowed';
        btn.style.pointerEvents = enabled ? 'auto' : 'none';
    });
}