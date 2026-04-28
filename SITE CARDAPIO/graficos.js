// ===== GRÁFICOS COM CHART.JS =====
let charts = { horas: null, status: null, produtos: null, vendasMensais: null, vendasAnuais: null, quantidade: null };

function destroyChart(chartInstance) {
    if (chartInstance && typeof chartInstance.destroy === 'function') {
        chartInstance.destroy();
    }
}

// ===== FUNÇÕES AUXILIARES PARA QUANTIDADE DE VENDAS (MOVED TO GLOBAL SCOPE) =====

function getPeriodoDatas(filtro) {
    const agora = new Date();
    let inicio, fim, label;

    switch (filtro) {
        case 'diario':
            inicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
            inicio.setHours(0, 0, 0, 0);
            fim = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1);
            fim.setHours(0, 0, 0, 0);
            label = `Hoje - ${agora.toLocaleDateString('pt-BR')}`;
            break;
        case 'semanal':
            const diaSemana = agora.getDay() || 7;
            inicio = new Date(agora);
            inicio.setDate(agora.getDate() - diaSemana + 1);
            inicio.setHours(0, 0, 0, 0);
            fim = new Date(agora);
            fim.setDate(agora.getDate() + (7 - diaSemana) + 1);
            fim.setHours(0, 0, 0, 0);
            label = `Esta Semana`;
            break;
        case 'mensal':
            inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
            fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 1);
            label = `${agora.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}`;
            break;
        case 'anual':
            inicio = new Date(agora.getFullYear(), 0, 1);
            fim = new Date(agora.getFullYear() + 1, 0, 1);
            label = `${agora.getFullYear()}`;
            break;
        default:
            inicio = new Date(2000, 0, 1);
            fim = new Date();
            label = 'Todos os Dados';
    }
    return { inicio, fim, label };
}

function extrairQuantidadeItem(itemStr) {
    const match = itemStr.trim().match(/\((\d+)\)$/);
    return match ? parseInt(match[1]) : 1;
}

function extrairNomeProduto(itemStr) {
    return itemStr.trim().replace(/\s*\(\d+\)$/, '');
}

function renderTabelaQuantidade(produtosCount, totalUnidades) {
    const tbody = document.getElementById('tabela-quantidade-produtos');
    if (!tbody) return;

    const produtos = Object.entries(produtosCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

    if (produtos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="px-3 py-4 text-center text-gray-400">Sem vendas</td></tr>';
        return;
    }

    tbody.innerHTML = produtos.map(([nome, qtd], idx) => {
        const percentual = totalUnidades > 0 ? ((qtd / totalUnidades) * 100).toFixed(0) : 0;
        return `
    <tr class="border-t hover:bg-gray-50">
        <td class="px-3 py-2 font-medium text-gray-700 truncate max-w-xs">${Utils.escapeHtml(nome)}</td>
        <td class="px-3 py-2 text-center">
            <span class="bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold text-xs">${qtd}</span>
        </td>
        <td class="px-3 py-2 text-right text-gray-500">${percentual}%</td>
    </tr>`;
    }).join('');
}

// ===== GRÁFICO: QUANTIDADE DE PRODUTOS VENDIDOS (MOVED TO GLOBAL SCOPE) =====
function renderQuantidadeVendas(filtro = 'mensal') {
    const canvas = document.getElementById('chart-quantidade');
    if (!canvas) return;

    // Atualiza botões ativos
    ['diario', 'semanal', 'mensal', 'anual'].forEach(f => {
        const btn = document.getElementById(`btn-qty-${f}`);
        if (btn) {
            if (f === filtro) {
                btn.className = 'px-3 py-1.5 text-xs font-medium rounded-lg transition bg-purple-600 text-white border border-purple-600';
            } else {
                btn.className = 'px-3 py-1.5 text-xs font-medium rounded-lg transition border border-gray-200 hover:bg-gray-100';
            }
        }
    });

    const { inicio, fim, label } = getPeriodoDatas(filtro);

    const pedidos = JSON.parse(localStorage.getItem('pedidosRecebidos') || '[]');
    const pedidosPeriodo = pedidos.filter(p => {
        if (p.status !== 'entregue') return false;
        const dataPedido = p.criadoEm ? new Date(p.criadoEm) : null;
        return dataPedido && dataPedido >= inicio && dataPedido < fim;
    });

    // Calcula estatísticas
    const produtosCount = {};
    let totalUnidades = 0;

    pedidosPeriodo.forEach(p => {
        if (p.itens) {
            p.itens.split('|').forEach(item => {
                const nome = extrairNomeProduto(item);
                const qtd = extrairQuantidadeItem(item);
                produtosCount[nome] = (produtosCount[nome] || 0) + qtd;
                totalUnidades += qtd;
            });
        }
    });

    // Atualiza cards
    const elTotalUnidades = document.getElementById('qty-total-unidades');
    const elTotalPedidos = document.getElementById('qty-total-pedidos');
    const elMediaDia = document.getElementById('qty-media-dia');
    const elTopProduto = document.getElementById('qty-top-produto');
    const elTopQtd = document.getElementById('qty-top-qtd');

    if (elTotalUnidades) elTotalUnidades.textContent = totalUnidades.toLocaleString('pt-BR');
    if (elTotalPedidos) elTotalPedidos.textContent = pedidosPeriodo.length.toLocaleString('pt-BR');

    const diasPeriodo = Math.max(1, Math.ceil((fim - inicio) / (1000 * 60 * 60 * 24)));
    if (elMediaDia) elMediaDia.textContent = Math.round(totalUnidades / diasPeriodo).toLocaleString('pt-BR');

    const topEntry = Object.entries(produtosCount).sort((a, b) => b[1] - a[1])[0];
    if (topEntry && elTopProduto && elTopQtd) {
        elTopProduto.textContent = topEntry[0].length > 12 ? topEntry[0].substring(0, 12) + '...' : topEntry[0];
        elTopQtd.textContent = `${topEntry[1]} un.`;
    } else if (elTopProduto && elTopQtd) {
        elTopProduto.textContent = '-';
        elTopQtd.textContent = '0 un.';
    }

    // Prepara dados do gráfico (Top 8 produtos)
    const topProdutos = Object.entries(produtosCount).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const labels = topProdutos.map(p => p[0].length > 15 ? p[0].substring(0, 15) + '...' : p[0]);
    const dataValues = topProdutos.map(p => p[1]);

    // Destroi gráfico anterior
    if (charts.quantidade && typeof charts.quantidade.destroy === 'function') {
        charts.quantidade.destroy();
    }

    // Renderiza novo gráfico
    if (labels.length > 0) {
        charts.quantidade = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Quantidade Vendida',
                    data: dataValues,
                    backgroundColor: 'rgba(168, 85, 247, 0.7)',
                    borderColor: 'rgb(168, 85, 247)',
                    borderWidth: 2,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.y} unidades` } }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 }, title: { display: true, text: 'Unidades' } },
                    x: { ticks: { maxRotation: 45, minRotation: 45, font: { size: 10 } } }
                }
            }
        });
    } else {
        // Gráfico vazio com mensagem
        charts.quantidade = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: ['Sem dados'],
                datasets: [{
                    label: 'Quantidade Vendida',
                    data: [0],
                    backgroundColor: 'rgba(156, 163, 175, 0.3)',
                    borderColor: 'rgb(156, 163, 175)',
                    borderWidth: 2,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, display: false }, x: { display: false } }
            }
        });
    }

    // Preenche tabela
    renderTabelaQuantidade(produtosCount, totalUnidades);
}

// ===== GRÁFICOS: OUTROS =====
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
    renderQuantidadeVendas('mensal');
    updateMetricsCards();
}

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

function renderChartStatus() {
    const canvas = document.getElementById('chart-status');
    if (!canvas) return;

    destroyChart(charts.status);

    const pedidos = JSON.parse(localStorage.getItem('pedidosRecebidos') || '[]');
    const statusCount = { novo: 0, preparando: 0, entregue: 0, cancelado: 0 };

    pedidos.forEach(p => {
        const s = p.status || 'novo';
        if (statusCount[s] !== undefined) statusCount[s]++;
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
            plugins: { legend: { position: 'bottom' } },
            cutout: '60%'
        }
    });
}

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

function refreshCharts() {
    updateMetricsCards();
    atualizarFiltroAnos();
    renderChartHoras();
    renderChartStatus();
    renderChartProdutos();
    renderChartVendasMensais();
    renderChartVendasAnuais();
    renderQuantidadeVendas('mensal');
}

// ===== GRÁFICOS: VENDAS MENSAL E ANUAL =====
function atualizarFiltroAnos() {
    const select = document.getElementById('filtro-ano-mensal');
    if (!select) return;

    const pedidos = JSON.parse(localStorage.getItem('pedidosRecebidos') || '[]');
    const anos = [...new Set(pedidos.map(p => {
        if (p.criadoEm) return new Date(p.criadoEm).getFullYear();
        if (p.hora) return new Date().getFullYear();
        return null;
    }).filter(Boolean))].sort((a, b) => b - a);

    if (anos.length === 0) anos.push(new Date().getFullYear());

    select.innerHTML = anos.map(ano =>
        `<option value="${ano}" ${ano === new Date().getFullYear() ? 'selected' : ''}>${ano}</option>`
    ).join('');
}

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

    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    charts.vendasMensais = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: meses,
            datasets: [{
                label: 'Vendas (R$)',
                data: vendasPorMes,
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
        data: {
            labels: anos.length ? anos : [new Date().getFullYear()],
            datasets: [{
                label: 'Faturamento Anual',
                data: valores.length ? valores : [0],
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

// ===== NAVEGAÇÃO POR ABAS =====
let abaAtiva = 'pedidos';

function mudarAba(aba) {
    abaAtiva = aba;

    const btnPedidos = document.getElementById('tab-pedidos');
    const btnCardapio = document.getElementById('tab-cardapio');
    const btnAnalytics = document.getElementById('tab-analytics');

    [btnPedidos, btnCardapio, btnAnalytics].forEach(btn => {
        if (!btn) return;
        const abaBtn = btn.id.replace('tab-', '');
        btn.className = `flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all ${aba === abaBtn
            ? 'bg-blue-600 text-white shadow'
            : 'text-gray-600 hover:bg-gray-100'
            }`;
    });

    ['pedidos', 'cardapio', 'analytics'].forEach(nome => {
        const div = document.getElementById(`aba-${nome}`);
        if (div) div.classList.toggle('hidden', aba !== nome);
    });

    if (aba === 'cardapio') {
        renderAdminProdutos();
        renderAdminDescontos();
    }

    if (aba === 'analytics' && typeof Chart !== 'undefined') {
        setTimeout(() => {
            initCharts();
            Object.values(charts).forEach(chart => chart?.resize());
        }, 100);
    }

    console.log(`📑 Aba alterada para: ${aba}`);
}

// ===== SISTEMA DE RELATÓRIOS =====
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
    const custoEstimado = faturamento * 0.30;
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

function compilarDadosRelatorio(periodo) {
    const pedidos = JSON.parse(localStorage.getItem('pedidosRecebidos') || '[]');
    const agora = new Date();
    let inicio, fim, labelPeriodo;

    switch (periodo) {
        case 'hoje':
            inicio = new Date(agora.setHours(0, 0, 0, 0));
            fim = new Date(agora.setHours(23, 59, 59, 999));
            labelPeriodo = `Hoje - ${agora.toLocaleDateString('pt-BR')}`;
            break;
        case 'semana':
            const diaSemana = agora.getDay() || 7;
            inicio = new Date(agora.setDate(agora.getDate() - diaSemana + 1));
            inicio.setHours(0, 0, 0, 0);
            fim = new Date();
            fim.setHours(23, 59, 59, 999);
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
        default:
            inicio = new Date(2000, 0, 1);
            fim = new Date();
            labelPeriodo = 'Todos os Dados';
    }

    const financeiro = calcularFinanceiro(pedidos, inicio, fim);

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
    const topProdutos = Object.entries(produtosCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const statusCount = { novo: 0, preparando: 0, entregue: 0, cancelado: 0 };
    pedidos.forEach(p => { if (statusCount[p.status] !== undefined) statusCount[p.status]++; });

    const horasCount = Array(24).fill(0);
    pedidos.filter(p => p.status === 'entregue').forEach(p => {
        let h = p.hora?.includes(':') ? parseInt(p.hora.split(':')[0]) : (p.criadoEm ? new Date(p.criadoEm).getHours() : 0);
        if (h >= 0 && h < 24) horasCount[h]++;
    });
    const horaPicoIndex = horasCount.indexOf(Math.max(...horasCount));
    const horaPico = `${horaPicoIndex.toString().padStart(2, '0')}:00 - ${(horaPicoIndex + 1).toString().padStart(2, '0')}:00`;

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
        }).length,
        pedidosAmostra: pedidos.filter(p => {
            let dataPed = p.criadoEm ? new Date(p.criadoEm) : null;
            return dataPed && dataPed >= inicio && dataPed <= fim;
        }).slice(0, 10)
    };
}

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
        @media print { .no-print { display: none; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        @page { margin: 1.5cm; }
    </style>
</head>
<body class="bg-gray-50 p-6 font-sans">
    <div class="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
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
        
        <section class="p-6 border-b">
            <h2 class="text-lg font-bold text-gray-800 mb-4">👥 Dados dos Clientes (Amostra)</h2>
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-2 text-left">Cliente</th>
                            <th class="px-4 py-2 text-left">Número</th>
                            <th class="px-4 py-2 text-left">Endereço</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${dados.pedidosAmostra?.map(p => `
                        <tr class="border-t">
                            <td class="px-4 py-2">${Utils.escapeHtml(p.cliente)}</td>
                            <td class="px-4 py-2">${Utils.escapeHtml(p.numero || '-')}</td>
                            <td class="px-4 py-2 truncate max-w-xs">${Utils.escapeHtml(p.endereco)}</td>
                        </tr>
                        `).join('') || '<tr><td colspan="3" class="px-4 py-2 text-gray-400">Sem dados</td></tr>'}
                    </tbody>
                </table>
            </div>
        </section>
        
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
        
        <section class="p-6 border-b">
            <h2 class="text-lg font-bold text-gray-800 mb-4">📊 Status dos Pedidos</h2>
            <div class="flex flex-wrap gap-3">
                <span class="px-4 py-2 bg-green-100 text-green-700 rounded-full font-medium">✅ Entregue: ${dados.statusCount.entregue}</span>
                <span class="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-full font-medium">🔄 Preparando: ${dados.statusCount.preparando}</span>
                <span class="px-4 py-2 bg-blue-100 text-blue-700 rounded-full font-medium">✨ Novo: ${dados.statusCount.novo}</span>
                <span class="px-4 py-2 bg-red-100 text-red-700 rounded-full font-medium">❌ Cancelado: ${dados.statusCount.cancelado}</span>
            </div>
        </section>
        
        <section class="p-6 border-b">
            <h2 class="text-lg font-bold text-gray-800 mb-4">🏆 Top 5 Produtos Mais Vendidos</h2>
            <ol class="space-y-3">
                ${dados.topProdutos.length > 0
            ? dados.topProdutos.map(([nome, qtd], i) => `
                <li class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div class="flex items-center gap-3">
                        <span class="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">${i + 1}</span>
                        <span class="font-medium text-gray-800">${Utils.escapeHtml(nome)}</span>
                    </div>
                    <span class="font-bold text-blue-600">${qtd} un.</span>
                </li>`).join('')
            : '<p class="text-gray-400 text-center py-4">Sem dados no período</p>'
        }
            </ol>
        </section>
        
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

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-devburguer-${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
}

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
        ['=== DADOS DOS CLIENTES (amostra) ==='],
        ['Cliente', 'Número', 'Endereço'],
        ...(dados.pedidosAmostra?.map(p => [p.cliente, p.numero || 'Não informado', p.endereco]) || []),
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
        ...dados.topProdutos.map(([nome, qtd], i) => [i + 1, nome, qtd]),
        [],
        ['=== OBSERVAÇÕES ==='],
        ['* Custos são estimados em 30% do faturamento'],
        ['* Para análise detalhada, consulte o dashboard interativo'],
        ['* Dados extraídos do localStorage do navegador']
    ];

    const csv = linhas.map(linha =>
        linha.map(campo => `"${String(campo).replace(/"/g, '""')}"`).join(';')
    ).join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-devburguer-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

function gerarRelatorio(formato) {
    if (!isValidSession()) return openLoginModal();

    const periodo = document.getElementById('relatorio-periodo')?.value || 'mes';
    const dados = compilarDadosRelatorio(periodo);

    if (typeof Toastify !== 'undefined') {
        Toastify({
            text: `📊 Gerando relatório: ${dados.periodo}...`,
            duration: 2000,
            style: { background: "#3b82f6", borderRadius: "8px" }
        }).showToast();
    }

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

window.renderChartVendasMensais = renderChartVendasMensais;
window.renderChartVendasAnuais = renderChartVendasAnuais;
window.gerarRelatorio = gerarRelatorio;
// ✅ NOVAS EXPORTAÇÕES PARA O GRÁFICO DE QUANTIDADE
window.renderQuantidadeVendas = renderQuantidadeVendas;
window.renderTabelaQuantidade = renderTabelaQuantidade;
window.getPeriodoDatas = getPeriodoDatas;
window.extrairQuantidadeItem = extrairQuantidadeItem;
window.extrairNomeProduto = extrairNomeProduto;