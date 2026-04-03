// ===== CONFIG =====
const ADMIN_CONFIG = {
    SENHA: "1234", // ⚠️ Em produção: usar backend + hash
    STORAGE_KEY: "devburguer_admin",
    SESSION_HOURS: 24
};

let pedidoParaFinalizar = null;

// ===== UTILITÁRIOS =====
const Utils = {
    // Parse seguro de valores em BRL
    parseBRL: (valorStr) => {
        if (!valorStr) return 0;
        const clean = String(valorStr)
            .replace('R$', '')
            .replace(/\./g, '')      // remove separador de milhar
            .replace(',', '.');       // converte decimal
        return parseFloat(clean) || 0;
    },

    // Formata número para BRL
    formatBRL: (valor) => {
        return valor.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    },

    // Sanitiza texto para evitar XSS básico
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
    
    // Notifica outras abas (cliente)
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

// ===== LISTA DE PEDIDOS =====
function carregarPedidos() {
    const lista = document.getElementById("pedidos-lista");
    if (!lista) return;
    
    const pedidos = JSON.parse(localStorage.getItem("pedidosRecebidos") || "[]");
    lista.innerHTML = "";
    
    // Filtra apenas pedidos não finalizados
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
    
    // Ordena: mais recentes primeiro
    pedidosAtivos.reverse().forEach((p) => {
        const preparando = p.status === "preparando";
        const borda = preparando ? "border-yellow-400" : "border-green-500";
        const badge = preparando
            ? `<span class="text-yellow-700 font-semibold text-xs bg-yellow-100 px-3 py-1.5 rounded-full">🔄 PREPARANDO</span>`
            : `<span class="text-green-700 font-semibold text-xs bg-green-100 px-3 py-1.5 rounded-full">✨ NOVO</span>`;
        
        const btnPrimario = preparando
            ? `<button onclick="abrirModalFinalizado('${p.id}')" class="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg">✅ ENTREGUE</button>`
            : `<button onclick="prepararPedido('${p.id}')" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg">🔄 PREPARAR</button>`;
        
        const btnSecundario = preparando
            ? `<button onclick="cancelarPedido('${p.id}')" class="text-red-600 hover:text-red-800 text-sm font-medium px-3">Cancelar</button>`
            : `<button onclick="cancelarPedido('${p.id}')" class="text-red-600 hover:text-red-800 text-sm font-medium px-3">Cancelar</button>`;

        // Itens formatados com quebra de linha segura
        const itensHTML = p.itens.split('|').map(item => 
            `<span class="block text-sm text-gray-700">• ${Utils.escapeHtml(item.trim())}</span>`
        ).join('');

        lista.innerHTML += `
        <article class="bg-white rounded-2xl shadow-lg border-t-[6px] ${borda} p-5 transition-all hover:shadow-xl border border-gray-100 animate-bounce-in" data-pedido-id="${p.id}">
            <header class="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
                <span class="font-mono font-bold bg-zinc-800 text-white px-3 py-1.5 rounded-lg text-sm">#${p.id}</span>
                <span class="text-sm text-gray-500 font-medium">🕒 ${Utils.escapeHtml(p.hora)}</span>
            </header>
            
            <div class="mb-4">${badge}</div>
            
            <section class="mb-4">
                <p class="text-xs font-extrabold text-gray-500 uppercase tracking-wide mb-1">👤 Cliente</p>
                <p class="font-bold text-lg text-gray-800">${Utils.escapeHtml(p.cliente)}</p>
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
function prepararPedido(pedidoId) {
    if (!isValidSession()) {
        openLoginModal();
        return;
    }
    
    const pedidos = JSON.parse(localStorage.getItem("pedidosRecebidos") || "[]");
    const index = pedidos.findIndex(p => String(p.id) === String(pedidoId));
    
    if (index !== -1) {
        pedidos[index].status = "preparando";
        pedidos[index].atualizadoEm = new Date().toISOString();
        localStorage.setItem("pedidosRecebidos", JSON.stringify(pedidos));
        carregarPedidos();
        
        // Notifica outras abas
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'pedidosRecebidos',
            newValue: localStorage.getItem('pedidosRecebidos')
        }));
        
        console.log(`🔄 Pedido #${pedidoId} marcado como "preparando"`);
    }
}

function cancelarPedido(pedidoId) {
    if (!isValidSession()) {
        openLoginModal();
        return;
    }
    
    if (!confirm(`Deseja realmente CANCELAR o pedido #${pedidoId}?`)) return;
    
    const pedidos = JSON.parse(localStorage.getItem("pedidosRecebidos") || "[]");
    const index = pedidos.findIndex(p => String(p.id) === String(pedidoId));
    
    if (index !== -1) {
        pedidos[index].status = "cancelado";
        pedidos[index].canceladoEm = new Date().toISOString();
        localStorage.setItem("pedidosRecebidos", JSON.stringify(pedidos));
        carregarPedidos();
        
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'pedidosRecebidos',
            newValue: localStorage.getItem('pedidosRecebidos')
        }));
        
        console.log(`❌ Pedido #${pedidoId} cancelado`);
    }
}

// ===== MODAL DE FINALIZAÇÃO =====
function abrirModalFinalizado(pedidoId) {
    if (!isValidSession()) {
        openLoginModal();
        return;
    }
    
    const pedidos = JSON.parse(localStorage.getItem("pedidosRecebidos") || "[]");
    const pedido = pedidos.find(p => String(p.id) === String(pedidoId));
    
    if (!pedido) {
        alert("Pedido não encontrado!");
        return;
    }
    
    const modal = document.getElementById('order-complete-modal');
    if (!modal) {
        // Fallback simples
        if (confirm(`Finalizar pedido #${pedido.id} de ${pedido.cliente}?`)) {
            finalizarPedido(pedido);
        }
        return;
    }
    
    // Armazena para confirmação
    pedidoParaFinalizar = pedido;
    
    // Preenche modal
    const elId = document.getElementById('modal-pedido-id');
    const elCliente = document.getElementById('modal-pedido-cliente');
    const elTotal = document.getElementById('modal-pedido-total');
    const elPedidosHoje = document.getElementById('modal-pedidos-hoje');
    const elFaturamento = document.getElementById('modal-faturamento');
    
    if (elId) elId.textContent = `#${pedido.id}`;
    if (elCliente) elCliente.textContent = pedido.cliente;
    if (elTotal) elTotal.textContent = pedido.total;
    
    // Stats: calcula apenas pedidos de HOJE
    const hoje = new Date().toLocaleDateString('pt-BR');
    const pedidosHoje = pedidos.filter(p => {
        const dataPedido = p.hora ? new Date().toLocaleDateString('pt-BR') : null;
        return p.status === "entregue" || dataPedido === hoje;
    });
    
    const faturamentoHoje = pedidosHoje
        .filter(p => p.status === "entregue")
        .reduce((acc, p) => acc + Utils.parseBRL(p.total), 0);
    
    if (elPedidosHoje) elPedidosHoje.textContent = pedidosHoje.length;
    if (elFaturamento) elFaturamento.textContent = Utils.formatBRL(faturamentoHoje);
    
    // Exibe modal com animação
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
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
    const index = pedidos.findIndex(p => String(p.id) === String(pedido.id));
    
    if (index !== -1) {
        pedidos[index].status = "entregue";
        pedidos[index].finalizadoEm = new Date().toISOString();
        localStorage.setItem("pedidosRecebidos", JSON.stringify(pedidos));
        carregarPedidos();
        
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'pedidosRecebidos',
            newValue: localStorage.getItem('pedidosRecebidos')
        }));
        
        console.log(`✅ Pedido #${pedido.id} finalizado com sucesso!`);
    }
}

// ===== INICIALIZAÇÃO =====
function initAdmin() {
    // Tecla ESC para fechar modais
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
    
    // Verifica autenticação
    if (isValidSession()) {
        unlockPanel();
        console.log("✅ Sessão válida - painel liberado");
    } else {
        openLoginModal();
        console.log("🔐 Login necessário - modal aberto");
    }
    
    console.log("🔐 Admin.js inicializado | Dashboard pronto!");
}

// ===== EVENTOS GLOBAIS =====
window.addEventListener('load', initAdmin);

// Sync entre abas: atualiza UI quando dados mudam em outra aba
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

// ===== GRÁFICOS COM CHART.JS =====
let charts = { horas: null, status: null, produtos: null };

// Destrói gráfico antigo com segurança
function destroyChart(chartInstance) {
    if (chartInstance && typeof chartInstance.destroy === 'function') {
        chartInstance.destroy();
    }
}

// Inicializa todos os gráficos (só se a aba estiver visível)
function initCharts() {
    // Só renderiza se a aba de analytics estiver visível
    const abaAnalytics = document.getElementById('aba-analytics');
    if (!abaAnalytics || abaAnalytics.classList.contains('hidden')) {
        return; // Não renderiza se a aba não estiver ativa
    }
    
    if (typeof Chart === 'undefined') {
        console.warn('⚠️ Chart.js não carregado. Adicione a CDN no admin.html');
        return;
    }
    
    Chart.defaults.font.family = "'Roboto', sans-serif";
    Chart.defaults.color = '#6b7280';
    
    renderChartHoras();
    renderChartStatus();
    renderChartProdutos();
    updateMetricsCards();
}

// 🕐 Gráfico: Pedidos por Hora
function renderChartHoras() {
    const canvas = document.getElementById('chart-horas');
    if (!canvas) return;
    
    destroyChart(charts.horas);
    
    const pedidos = JSON.parse(localStorage.getItem('pedidosRecebidos') || '[]');
    const horasCount = Array(24).fill(0);
    
    pedidos.forEach(p => {
        let h = 0;
        if (p.hora && p.hora.includes(':')) {
            h = parseInt(p.hora.split(':')[0]);
        } else if (p.criadoEm) {
            h = new Date(p.criadoEm).getHours();
        }
        if (h >= 0 && h < 24) horasCount[h]++;
    });
    
    const labels = [];
    const dataValues = [];
    horasCount.forEach((count, h) => {
        if (count > 0) {
            labels.push(`${h.toString().padStart(2, '0')}:00`);
            dataValues.push(count);
        }
    });
    
    charts.horas = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels.length > 0 ? labels : ['Sem dados'],
            datasets: [{
                label: 'Pedidos',
                data: dataValues.length > 0 ? dataValues : [0],
                backgroundColor: 'rgba(59, 130, 246, 0.7)',
                borderColor: 'rgb(59, 130, 246)',
                borderWidth: 2,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } }
            }
        }
    });
}

// 📊 Gráfico: Status dos Pedidos
function renderChartStatus() {
    const canvas = document.getElementById('chart-status');
    if (!canvas) return;
    
    destroyChart(charts.status);
    
    const pedidos = JSON.parse(localStorage.getItem('pedidosRecebidos') || '[]');
    const statusCount = { novo: 0, preparando: 0, entregue: 0, cancelado: 0 };
    
    pedidos.forEach(p => {
        const s = p.status || 'novo';
        if (statusCount[s] !== undefined) {
            statusCount[s]++;
        }
    });
    
    charts.status = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: ['Novo', 'Preparando', 'Entregue', 'Cancelado'],
            datasets: [{
                data: [statusCount.novo, statusCount.preparando, statusCount.entregue, statusCount.cancelado],
                backgroundColor: ['#22c55e', '#eab308', '#3b82f6', '#ef4444'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            },
            cutout: '60%'
        }
    });
}

// 🏆 Gráfico: Top Produtos
function renderChartProdutos() {
    const canvas = document.getElementById('chart-produtos');
    if (!canvas) return;
    
    destroyChart(charts.produtos);
    
    const pedidos = JSON.parse(localStorage.getItem('pedidosRecebidos') || '[]');
    const produtosCount = {};
    
    pedidos.forEach(p => {
        if (p.itens) {
            p.itens.split('|').forEach(item => {
                const match = item.trim().match(/^(.+?)\s*\((\d+)\)$/);
                if (match) {
                    const nome = match[1].trim();
                    const qtd = parseInt(match[2]);
                    produtosCount[nome] = (produtosCount[nome] || 0) + qtd;
                }
            });
        }
    });
    
    const top5 = Object.entries(produtosCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    charts.produtos = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: top5.length > 0 ? top5.map(x => x[0]) : ['Sem dados'],
            datasets: [{
                label: 'Qtd Vendida',
                data: top5.length > 0 ? top5.map(x => x[1]) : [0],
                backgroundColor: 'rgba(168, 85, 247, 0.7)',
                borderColor: 'rgb(168, 85, 247)',
                borderWidth: 2,
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { beginAtZero: true, ticks: { stepSize: 1 } }
            }
        }
    });
}

// 📦 Atualiza Cards de Métricas
function updateMetricsCards() {
    const pedidos = JSON.parse(localStorage.getItem('pedidosRecebidos') || '[]');
    const entregues = pedidos.filter(p => p.status === 'entregue');
    const emPreparo = pedidos.filter(p => p.status === 'preparando');
    
    const faturamento = entregues.reduce((acc, p) => {
        return acc + (Utils?.parseBRL?.(p.total) || 0);
    }, 0);
    
    const ticketMedio = entregues.length > 0 ? faturamento / entregues.length : 0;
    
    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };
    
    set('metric-vendas-hoje', Utils?.formatBRL?.(faturamento) || 'R$ 0,00');
    set('metric-pedidos-hoje', entregues.length);
    set('metric-ticket-medio', Utils?.formatBRL?.(ticketMedio) || 'R$ 0,00');
    set('metric-em-preparo', emPreparo.length);
}

// 🔄 Atualiza todos os gráficos
function refreshCharts() {
    updateMetricsCards();
    renderChartHoras();
    renderChartStatus();
    renderChartProdutos();
}

// Hook: atualiza gráficos após carregar pedidos
const _carregarPedidosOriginal = window.carregarPedidos;
window.carregarPedidos = function() {
    if (typeof _carregarPedidosOriginal === 'function') {
        _carregarPedidosOriginal();
    }
    // Delay mínimo para garantir que o DOM atualizou
    setTimeout(refreshCharts, 50);
};

// Hook: inicializa gráficos ao abrir painel
const _unlockPanelOriginal = window.unlockPanel;
window.unlockPanel = function() {
    if (typeof _unlockPanelOriginal === 'function') {
        _unlockPanelOriginal();
    }
    // Aguarda renderização do DOM antes de criar gráficos
    setTimeout(initCharts, 300);
};

// Sync entre abas: atualiza gráficos quando pedidos mudam
window.addEventListener('storage', (e) => {
    if (!isValidSession()) return;
    if (e.key === 'pedidosRecebidos') {
        setTimeout(refreshCharts, 100);
    }
});

// ===== NAVEGAÇÃO POR ABAS =====
let abaAtiva = 'pedidos';

function mudarAba(aba) {
    abaAtiva = aba;
    
    // Atualiza botões
    const btnPedidos = document.getElementById('tab-pedidos');
    const btnAnalytics = document.getElementById('tab-analytics');
    
    if (btnPedidos) {
        btnPedidos.className = `flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all ${
            aba === 'pedidos' 
            ? 'bg-blue-600 text-white shadow' 
            : 'text-gray-600 hover:bg-gray-100'
        }`;
    }
    
    if (btnAnalytics) {
        btnAnalytics.className = `flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all ${
            aba === 'analytics' 
            ? 'bg-blue-600 text-white shadow' 
            : 'text-gray-600 hover:bg-gray-100'
        }`;
    }
    
    // Mostra/esconde conteúdo
    const divPedidos = document.getElementById('aba-pedidos');
    const divAnalytics = document.getElementById('aba-analytics');
    
    if (divPedidos) divPedidos.classList.toggle('hidden', aba !== 'pedidos');
    if (divAnalytics) divAnalytics.classList.toggle('hidden', aba !== 'analytics');
    
    // Inicializa gráficos ao entrar na aba de analytics
    if (aba === 'analytics' && typeof Chart !== 'undefined') {
        setTimeout(() => {
            initCharts();
            Object.values(charts).forEach(chart => chart?.resize());
        }, 100);
    }
    
    console.log(`📑 Aba alterada para: ${aba}`);
}

// Substitui por uma versão que faz TUDO: gráficos + abas
window.unlockPanel = function() {
    // Chama a lógica original (carregar pedidos, status, etc)
    if (typeof _unlockPanelOriginal === 'function') {
        _unlockPanelOriginal();
    }
    
    // Inicia na aba de pedidos
    mudarAba('pedidos');
    
    // Aguarda DOM e inicializa gráficos (se Chart.js estiver carregado)
    setTimeout(() => {
        if (typeof Chart !== 'undefined') {
            initCharts();
        }
    }, 300);
};

// ===== GRÁFICOS: VENDAS MENSAL E ANUAL =====

// Atualiza o objeto charts para incluir os novos gráficos
charts.vendasMensais = null;
charts.vendasAnuais = null;

// Atualiza o seletor de anos com base nos pedidos existentes
function atualizarFiltroAnos() {
    const select = document.getElementById('filtro-ano-mensal');
    if (!select) return;
    
    const pedidos = JSON.parse(localStorage.getItem('pedidosRecebidos') || '[]');
    const anos = [...new Set(pedidos.map(p => {
        if (p.criadoEm) return new Date(p.criadoEm).getFullYear();
        if (p.hora) return new Date().getFullYear();
        return null;
    }).filter(Boolean))].sort((a,b) => b - a);
    
    if (anos.length === 0) anos.push(new Date().getFullYear());
    
    select.innerHTML = anos.map(ano => 
        `<option value="${ano}" ${ano === new Date().getFullYear() ? 'selected' : ''}>${ano}</option>`
    ).join('');
}

// 💰 Gráfico: Vendas Mensais (por ano selecionado)
function renderChartVendasMensais() {
    const canvas = document.getElementById('chart-vendas-mensais');
    if (!canvas) return;
    
    destroyChart(charts.vendasMensais);
    
    const select = document.getElementById('filtro-ano-mensal');
    const anoSelecionado = select ? parseInt(select.value) : new Date().getFullYear();
    
    const pedidos = JSON.parse(localStorage.getItem('pedidosRecebidos') || '[]');
    const vendasPorMes = Array(12).fill(0);
    
    pedidos.forEach(p => {
        if (p.status !== 'entregue') return;
        
        let dataPedido = null;
        if (p.criadoEm) {
            dataPedido = new Date(p.criadoEm);
        } else if (p.finalizadoEm) {
            dataPedido = new Date(p.finalizadoEm);
        }
        
        if (!dataPedido || isNaN(dataPedido)) {
            dataPedido = new Date();
        }
        
        if (dataPedido.getFullYear() === anoSelecionado) {
            const mes = dataPedido.getMonth();
            vendasPorMes[mes] += Utils.parseBRL(p.total);
        }
    });
    
    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    
    charts.vendasMensais = new Chart(canvas, {
        type: 'bar',
        data: {  // ✅ CHAVE "data:" ADICIONADA
            labels: meses,
            datasets: [{
                label: 'Vendas (R$)',
                data: vendasPorMes,  // ✅ CHAVE "data:" ADICIONADA
                backgroundColor: 'rgba(34, 197, 94, 0.7)',
                borderColor: 'rgb(34, 197, 94)',
                borderWidth: 2,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `R$ ${ctx.parsed.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    ticks: {
                        callback: (val) => `R$ ${val.toLocaleString('pt-BR')}`
                    }
                }
            }
        }
    });
}

// 📅 Gráfico: Vendas Anuais (histórico completo)
function renderChartVendasAnuais() {
    const canvas = document.getElementById('chart-vendas-anuais');
    if (!canvas) return;
    
    destroyChart(charts.vendasAnuais);
    
    const pedidos = JSON.parse(localStorage.getItem('pedidosRecebidos') || '[]');
    const vendasPorAno = {};
    
    pedidos.forEach(p => {
        if (p.status !== 'entregue') return;
        
        let ano = null;
        if (p.criadoEm) {
            ano = new Date(p.criadoEm).getFullYear();
        } else if (p.finalizadoEm) {
            ano = new Date(p.finalizadoEm).getFullYear();
        }
        
        if (ano) {
            vendasPorAno[ano] = (vendasPorAno[ano] || 0) + Utils.parseBRL(p.total);
        }
    });
    
    const anos = Object.keys(vendasPorAno).sort().map(Number);
    const valores = anos.map(ano => vendasPorAno[ano]);
    
    charts.vendasAnuais = new Chart(canvas, {
        type: 'line',
        data: {  // ✅ CHAVE "data:" ADICIONADA
            labels: anos.length ? anos : [new Date().getFullYear()],
            datasets: [{
                label: 'Faturamento Anual',
                data: valores.length ? valores : [0],  // ✅ CHAVE "data:" ADICIONADA
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderColor: 'rgb(59, 130, 246)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: 'rgb(59, 130, 246)',
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `R$ ${ctx.parsed.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (val) => `R$ ${val.toLocaleString('pt-BR')}`
                    }
                }
            }
        }
    });
}

// 🔄 Atualiza todos os gráficos (incluindo os novos)
function refreshCharts() {
    updateMetricsCards();
    atualizarFiltroAnos();
    renderChartHoras();
    renderChartStatus();
    renderChartProdutos();
    renderChartVendasMensais();
    renderChartVendasAnuais();
}

// Inicializa TODOS os gráficos
function initCharts() {
    const abaAnalytics = document.getElementById('aba-analytics');
    if (!abaAnalytics || abaAnalytics.classList.contains('hidden')) return;
    if (typeof Chart === 'undefined') return console.warn('⚠️ Chart.js não carregado');
    
    Chart.defaults.font.family = "'Roboto', sans-serif";
    Chart.defaults.color = '#6b7280';
    
    atualizarFiltroAnos();
    renderChartHoras();
    renderChartStatus();
    renderChartProdutos();
    renderChartVendasMensais();
    renderChartVendasAnuais();
    updateMetricsCards();
}

// Hook: atualiza gráficos ao trocar de aba
const _mudarAbaOriginal = window.mudarAba;
window.mudarAba = function(aba) {
    if (typeof _mudarAbaOriginal === 'function') {
        _mudarAbaOriginal(aba);
    }
    if (aba === 'analytics' && typeof Chart !== 'undefined') {
        setTimeout(() => {
            atualizarFiltroAnos();
            renderChartVendasMensais();
            renderChartVendasAnuais();
            Object.values(charts).forEach(c => c?.resize());
        }, 150);
    }
};

// ===== SISTEMA DE RELATÓRIOS =====

// Calcula dados financeiros com estimativa de custos
function calcularFinanceiro(pedidos, periodoInicio, periodoFim) {
    const filtrados = pedidos.filter(p => {
        if (p.status !== 'entregue') return false;
        let dataPed = null;
        if (p.criadoEm) dataPed = new Date(p.criadoEm);
        else if (p.finalizadoEm) dataPed = new Date(p.finalizadoEm);
        else return false;
        return dataPed >= periodoInicio && dataPed <= periodoFim;
    });
    
    const faturamento = filtrados.reduce((acc, p) => acc + Utils.parseBRL(p.total), 0);
    const custoEstimado = faturamento * 0.30; // Estimativa: 30% de custo
    const lucro = faturamento - custoEstimado;
    const margem = faturamento > 0 ? (lucro / faturamento) * 100 : 0;
    
    return {
        pedidos: filtrados.length,
        faturamento,
        custo: custoEstimado,
        lucro,
        margem,
        ticketMedio: filtrados.length > 0 ? faturamento / filtrados.length : 0
    };
}

// Gera o objeto completo do relatório
function compilarDadosRelatorio(periodo) {
    const pedidos = JSON.parse(localStorage.getItem('pedidosRecebidos') || '[]');
    const agora = new Date();
    let inicio, fim, labelPeriodo;
    
    // Define período conforme seleção
    switch(periodo) {
        case 'hoje':
            inicio = new Date(agora.setHours(0,0,0,0));
            fim = new Date(agora.setHours(23,59,59,999));
            labelPeriodo = `Hoje - ${agora.toLocaleDateString('pt-BR')}`;
            break;
        case 'semana':
            const diaSemana = agora.getDay() || 7;
            inicio = new Date(agora.setDate(agora.getDate() - diaSemana + 1));
            inicio.setHours(0,0,0,0);
            fim = new Date();
            fim.setHours(23,59,59,999);
            labelPeriodo = `Esta Semana`;
            break;
        case 'mes':
            inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
            fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59);
            labelPeriodo = `${agora.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}`;
            break;
        case 'ano':
            inicio = new Date(agora.getFullYear(), 0, 1);
            fim = new Date(agora.getFullYear(), 11, 31, 23, 59, 59);
            labelPeriodo = `${agora.getFullYear()}`;
            break;
        default: // todos
            inicio = new Date(2000, 0, 1);
            fim = new Date();
            labelPeriodo = 'Todos os Dados';
    }
    
    const financeiro = calcularFinanceiro(pedidos, inicio, fim);
    
    // Top produtos no período
    const produtosCount = {};
    pedidos.filter(p => p.status === 'entregue').forEach(p => {
        let dataPed = p.criadoEm ? new Date(p.criadoEm) : (p.finalizadoEm ? new Date(p.finalizadoEm) : null);
        if (dataPed && dataPed >= inicio && dataPed <= fim) {
            p.itens?.split('|').forEach(item => {
                const match = item.trim().match(/^(.+?)\s*\((\d+)\)$/);
                if (match) {
                    const nome = match[1].trim();
                    produtosCount[nome] = (produtosCount[nome] || 0) + parseInt(match[2]);
                }
            });
        }
    });
    const topProdutos = Object.entries(produtosCount).sort((a,b) => b[1] - a[1]).slice(0, 5);
    
    // Pedidos por status
    const statusCount = { novo: 0, preparando: 0, entregue: 0, cancelado: 0 };
    pedidos.forEach(p => { if (statusCount[p.status] !== undefined) statusCount[p.status]++; });
    
    // Horário de pico
    const horasCount = Array(24).fill(0);
    pedidos.filter(p => p.status === 'entregue').forEach(p => {
        let h = p.hora?.includes(':') ? parseInt(p.hora.split(':')[0]) : (p.criadoEm ? new Date(p.criadoEm).getHours() : 0);
        if (h >= 0 && h < 24) horasCount[h]++;
    });
    const horaPicoIndex = horasCount.indexOf(Math.max(...horasCount));
    const horaPico = `${horaPicoIndex.toString().padStart(2,'0')}:00 - ${(horaPicoIndex+1).toString().padStart(2,'0')}:00`;
    
    return {
        periodo: labelPeriodo,
        geradoEm: new Date().toLocaleString('pt-BR'),
        financeiro,
        topProdutos,
        statusCount,
        horaPico,
        totalPedidos: pedidos.filter(p => {
            let dataPed = p.criadoEm ? new Date(p.criadoEm) : null;
            return dataPed && dataPed >= inicio && dataPed <= fim;
        }).length
    };
}

// Gera e baixa relatório em HTML (pronto para imprimir/PDF)
function gerarRelatorioHTML(dados) {
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório - Dev Burguer</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @media print {
            .no-print { display: none; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        @page { margin: 1.5cm; }
    </style>
</head>
<body class="bg-gray-50 p-6 font-sans">
    <div class="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
        
        <!-- Cabeçalho -->
        <header class="bg-gradient-to-r from-zinc-900 to-zinc-700 text-white p-6">
            <div class="flex justify-between items-start">
                <div>
                    <h1 class="text-2xl font-bold">🍔 Dev Burguer</h1>
                    <p class="text-zinc-300 mt-1">Relatório Gerencial</p>
                </div>
                <div class="text-right text-sm text-zinc-300">
                    <p>Gerado em: ${dados.geradoEm}</p>
                    <p class="font-semibold mt-1">Período: ${dados.periodo}</p>
                </div>
            </div>
        </header>
        
        <!-- Resumo Financeiro -->
        <section class="p-6 border-b">
            <h2 class="text-lg font-bold text-gray-800 mb-4">💰 Resumo Financeiro</h2>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="bg-green-50 p-4 rounded-xl border border-green-100">
                    <p class="text-xs text-green-600 uppercase font-bold">Faturamento</p>
                    <p class="text-2xl font-black text-green-700">${Utils.formatBRL(dados.financeiro.faturamento)}</p>
                </div>
                <div class="bg-orange-50 p-4 rounded-xl border border-orange-100">
                    <p class="text-xs text-orange-600 uppercase font-bold">Custos (estim.)</p>
                    <p class="text-2xl font-black text-orange-700">${Utils.formatBRL(dados.financeiro.custo)}</p>
                </div>
                <div class="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <p class="text-xs text-blue-600 uppercase font-bold">Lucro Líquido</p>
                    <p class="text-2xl font-black text-blue-700">${Utils.formatBRL(dados.financeiro.lucro)}</p>
                </div>
                <div class="bg-purple-50 p-4 rounded-xl border border-purple-100">
                    <p class="text-xs text-purple-600 uppercase font-bold">Margem</p>
                    <p class="text-2xl font-black text-purple-700">${dados.financeiro.margem.toFixed(1)}%</p>
                </div>
            </div>
        </section>
        
        <!-- Métricas Operacionais -->
        <section class="p-6 border-b">
            <h2 class="text-lg font-bold text-gray-800 mb-4">📈 Métricas Operacionais</h2>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div class="p-3">
                    <p class="text-3xl font-bold text-gray-800">${dados.financeiro.pedidos}</p>
                    <p class="text-xs text-gray-500 uppercase">Pedidos Entregues</p>
                </div>
                <div class="p-3">
                    <p class="text-3xl font-bold text-gray-800">${Utils.formatBRL(dados.financeiro.ticketMedio)}</p>
                    <p class="text-xs text-gray-500 uppercase">Ticket Médio</p>
                </div>
                <div class="p-3">
                    <p class="text-3xl font-bold text-gray-800">${dados.horaPico}</p>
                    <p class="text-xs text-gray-500 uppercase">Horário de Pico</p>
                </div>
                <div class="p-3">
                    <p class="text-3xl font-bold text-gray-800">${dados.totalPedidos}</p>
                    <p class="text-xs text-gray-500 uppercase">Total de Pedidos</p>
                </div>
            </div>
        </section>
        
        <!-- Status dos Pedidos -->
        <section class="p-6 border-b">
            <h2 class="text-lg font-bold text-gray-800 mb-4">📊 Status dos Pedidos</h2>
            <div class="flex flex-wrap gap-3">
                <span class="px-4 py-2 bg-green-100 text-green-700 rounded-full font-medium">✅ Entregue: ${dados.statusCount.entregue}</span>
                <span class="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-full font-medium">🔄 Preparando: ${dados.statusCount.preparando}</span>
                <span class="px-4 py-2 bg-blue-100 text-blue-700 rounded-full font-medium">✨ Novo: ${dados.statusCount.novo}</span>
                <span class="px-4 py-2 bg-red-100 text-red-700 rounded-full font-medium">❌ Cancelado: ${dados.statusCount.cancelado}</span>
            </div>
        </section>
        
        <!-- Top Produtos -->
        <section class="p-6 border-b">
            <h2 class="text-lg font-bold text-gray-800 mb-4">🏆 Top 5 Produtos Mais Vendidos</h2>
            <ol class="space-y-3">
                ${dados.topProdutos.length > 0 
                    ? dados.topProdutos.map(([nome, qtd], i) => `
                <li class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div class="flex items-center gap-3">
                        <span class="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">${i+1}</span>
                        <span class="font-medium text-gray-800">${Utils.escapeHtml(nome)}</span>
                    </div>
                    <span class="font-bold text-blue-600">${qtd} un.</span>
                </li>`).join('')
                    : '<p class="text-gray-400 text-center py-4">Sem dados no período</p>'
                }
            </ol>
        </section>
        
        <!-- Rodapé -->
        <footer class="bg-zinc-100 p-4 text-center text-xs text-gray-500 no-print">
            <p>Relatório gerado pelo Painel Admin - Dev Burguer</p>
            <p class="mt-1 text-gray-400">Custos estimados em 30% do faturamento • Ajuste conforme sua realidade</p>
            <button onclick="window.print()" class="mt-3 bg-zinc-800 text-white px-6 py-2 rounded-lg hover:bg-zinc-900 transition">
                🖨️ Imprimir / Salvar como PDF
            </button>
        </footer>
        
    </div>
</body>
</html>`;
    
    // Baixa o arquivo
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-devburguer-${new Date().toISOString().slice(0,10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
}

// Gera e baixa relatório em CSV (para Excel/Google Sheets)
function gerarRelatorioCSV(dados) {
    const linhas = [
        ['RELATÓRIO GERENCIAL - DEV BURGUER'],
        [`Período: ${dados.periodo}`, `Gerado em: ${dados.geradoEm}`],
        [],
        ['=== RESUMO FINANCEIRO ==='],
        ['Métrica', 'Valor'],
        ['Faturamento Bruto', `R$ ${dados.financeiro.faturamento.toFixed(2).replace('.', ',')}`],
        ['Custos Estimados (30%)', `R$ ${dados.financeiro.custo.toFixed(2).replace('.', ',')}`],
        ['Lucro Líquido', `R$ ${dados.financeiro.lucro.toFixed(2).replace('.', ',')}`],
        ['Margem de Lucro', `${dados.financeiro.margem.toFixed(2)}%`],
        ['Ticket Médio', `R$ ${dados.financeiro.ticketMedio.toFixed(2).replace('.', ',')}`],
        [],
        ['=== MÉTRICAS OPERACIONAIS ==='],
        ['Pedidos Entregues', dados.financeiro.pedidos],
        ['Total de Pedidos', dados.totalPedidos],
        ['Horário de Pico', dados.horaPico],
        [],
        ['=== STATUS DOS PEDIDOS ==='],
        ['Status', 'Quantidade'],
        ['Entregue', dados.statusCount.entregue],
        ['Preparando', dados.statusCount.preparando],
        ['Novo', dados.statusCount.novo],
        ['Cancelado', dados.statusCount.cancelado],
        [],
        ['=== TOP PRODUTOS ==='],
        ['Posição', 'Produto', 'Quantidade Vendida'],
        ...dados.topProdutos.map(([nome, qtd], i) => [i+1, nome, qtd]),
        [],
        ['=== OBSERVAÇÕES ==='],
        ['* Custos são estimados em 30% do faturamento'],
        ['* Para análise detalhada, consulte o dashboard interativo'],
        ['* Dados extraídos do localStorage do navegador']
    ];
    
    // Converte para CSV
    const csv = linhas.map(linha => 
        linha.map(campo => `"${String(campo).replace(/"/g, '""')}"`).join(';')
    ).join('\n');
    
    // Baixa o arquivo
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-devburguer-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// Função principal chamada pelos botões
function gerarRelatorio(formato) {
    if (!isValidSession()) return openLoginModal();
    
    const periodo = document.getElementById('relatorio-periodo')?.value || 'mes';
    const dados = compilarDadosRelatorio(periodo);
    
    // Feedback visual
    if (typeof Toastify !== 'undefined') {
        Toastify({
            text: `📊 Gerando relatório: ${dados.periodo}...`,
            duration: 2000,
            style: { background: "#3b82f6", borderRadius: "8px" }
        }).showToast();
    }
    
    // Gera no formato escolhido
    setTimeout(() => {
        if (formato === 'html') {
            gerarRelatorioHTML(dados);
        } else if (formato === 'csv') {
            gerarRelatorioCSV(dados);
        }
        
        if (typeof Toastify !== 'undefined') {
            Toastify({
                text: '✅ Relatório baixado com sucesso!',
                duration: 3000,
                style: { background: "#22c55e", borderRadius: "8px" }
            }).showToast();
        }
    }, 500);
}

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

// Modais
function abrirModalProduto(id = null) {
    document.getElementById('modal-produto').classList.remove('hidden');
    document.getElementById('modal-produto').classList.add('flex');
    if (id) {
        const p = getProdutos().find(x => x.id === id);
        document.getElementById('modal-produto-titulo').textContent = 'Editar Produto';
        document.getElementById('prod-id').value = p.id;
        document.getElementById('prod-nome').value = p.nome;
        document.getElementById('prod-preco').value = p.price;
        document.getElementById('prod-categoria').value = p.categoria;
        document.getElementById('prod-imagem').value = p.imagem || '';
    } else {
        document.getElementById('modal-produto-titulo').textContent = 'Novo Produto';
        document.getElementById('prod-id').value = '';
        document.getElementById('prod-nome').value = '';
        document.getElementById('prod-preco').value = '';
        document.getElementById('prod-imagem').value = '';
    }
}
function fecharModalProduto() { document.getElementById('modal-produto').classList.add('hidden'); document.getElementById('modal-produto').classList.remove('flex'); }

function abrirModalDesconto() {
    document.getElementById('modal-desconto').classList.remove('hidden');
    document.getElementById('modal-desconto').classList.add('flex');
    document.getElementById('desc-id').value = '';
    document.getElementById('desc-nome').value = '';
    document.getElementById('desc-valor').value = '';
    document.getElementById('desc-inicio').value = new Date().toISOString().split('T')[0];
    document.getElementById('desc-fim').value = '';
}
function fecharModalDesconto() { document.getElementById('modal-desconto').classList.add('hidden'); document.getElementById('modal-desconto').classList.remove('flex'); }

function salvarProduto() {
    const id = document.getElementById('prod-id').value;
    const nome = document.getElementById('prod-nome').value.trim();
    const price = parseFloat(document.getElementById('prod-preco').value);
    const categoria = document.getElementById('prod-categoria').value;
    const imagem = document.getElementById('prod-imagem').value.trim();
    
    if (!nome || isNaN(price)) return alert('Preencha nome e preço!');
    
    let produtos = getProdutos();
    if (id) {
        const idx = produtos.findIndex(p => p.id == id);
        if (idx !== -1) produtos[idx] = { ...produtos[idx], nome, price, categoria, imagem };
    } else {
        produtos.push({ id: Date.now(), nome, price, categoria, imagem, active: true });
    }
    saveProdutos(produtos);
    fecharModalProduto();
    renderAdminProdutos();
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
    const nome = document.getElementById('desc-nome').value.trim();
    const tipo = document.getElementById('desc-tipo').value;
    const valor = parseFloat(document.getElementById('desc-valor').value);
    const aplicar = document.getElementById('desc-aplicar').value;
    const inicio = document.getElementById('desc-inicio').value;
    const fim = document.getElementById('desc-fim').value;
    
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

// Hook: renderiza ao abrir aba cardápio
function mudarAba(aba) {
    abaAtiva = aba;
    
    // Atualiza botões
    const btnPedidos = document.getElementById('tab-pedidos');
    const btnCardapio = document.getElementById('tab-cardapio');
    const btnAnalytics = document.getElementById('tab-analytics');
    
    [btnPedidos, btnCardapio, btnAnalytics].forEach(btn => {
        if (!btn) return;
        const abaBtn = btn.id.replace('tab-', '');
        btn.className = `flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all ${
            aba === abaBtn 
            ? 'bg-blue-600 text-white shadow' 
            : 'text-gray-600 hover:bg-gray-100'
        }`;
    });
    
    // Mostra/esconde conteúdo
    ['pedidos', 'cardapio', 'analytics'].forEach(nome => {
        const div = document.getElementById(`aba-${nome}`);
        if (div) div.classList.toggle('hidden', aba !== nome);
    });
    
    // Carrega conteúdo específico da aba
    if (aba === 'cardapio') {
        renderAdminProdutos();
        renderAdminDescontos();
    }
    
    if (aba === 'analytics' && typeof Chart !== 'undefined') {
        setTimeout(() => {
            atualizarFiltroAnos();
            initCharts();
            Object.values(charts).forEach(c => c?.resize());
        }, 150);
    }
    
    console.log(`📑 Aba alterada para: ${aba}`);
}

// Exportações
window.abrirModalProduto = abrirModalProduto;
window.fecharModalProduto = fecharModalProduto;
window.salvarProduto = salvarProduto;
window.editarProduto = editarProduto;
window.toggleProduto = toggleProduto;
window.excluirProduto = excluirProduto;
window.abrirModalDesconto = abrirModalDesconto;
window.fecharModalDesconto = fecharModalDesconto;
window.salvarDesconto = salvarDesconto;
window.excluirDesconto = excluirDesconto;

// ===== EXPORTA FUNÇÕES PARA O HTML =====
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
window.renderChartVendasMensais = renderChartVendasMensais;
window.renderChartVendasAnuais = renderChartVendasAnuais;
window.gerarRelatorio = gerarRelatorio;