// Simula a lista de produtos
let produtos = [];

// Array para armazenar produtos arquivados (lixeira)
let produtosArquivados = [];

// Variável global para a instância do Chart.js
let distribuicaoEstoqueChart; 

// --- Configuração das Colunas ---
const COLUNAS = [
    { key: 'Id', label: 'ID', isEditable: true, isSortable: true },
    { key: 'Nome', label: 'Nome', isEditable: true, isSortable: true },
    { key: 'Categoria', label: 'Categoria', isEditable: true, isSortable: true },
    { key: 'Quantidade', label: 'Qtd.', isEditable: true, isSortable: true },
    { key: 'Preço', label: 'Preço Unitário', isEditable: true, isSortable: true },
    { key: 'Total', label: 'Total (R$)', isEditable: false, isSortable: true },
    { key: 'Acoes', label: 'Ações', isEditable: false, isSortable: false }
];

let estadoOrdenacao = { campo: 'Id', direcao: 'asc' }; 

// --- ESTADO DA PAGINAÇÃO (NOVO) ---
let estadoPaginacao = {
    paginaAtual: 1,
    tamanhoPagina: 10, 
    totalPaginas: 1,
    produtosVisiveis: [] 
};


// --- Seleção de Elementos do HTML ---
const formProduto = document.getElementById('form-produto');
const tabelaBody = document.querySelector('#tabela-produtos tbody');
const tabelaHeadRow = document.querySelector('#tabela-produtos thead tr');
const contadorProdutosSpan = document.getElementById('contador-produtos');
const filtroCategoriaSelect = document.getElementById('filtro-categoria');
const valorTotalEstoqueSpan = document.getElementById('valor-total-estoque');
const barraPesquisaInput = document.getElementById('barra-pesquisa');

const toggleConfigBtn = document.getElementById('toggle-config-btn');
const columnCheckboxesPanel = document.getElementById('column-checkboxes');

const totalProdutosUnicosSpan = document.getElementById('total-produtos-unicos');
const precoMedioUnitarioSpan = document.getElementById('preco-medio-unitario');
const categoriaMaisValiosaSpan = document.getElementById('categoria-mais-valiosa');

const btnExportar = document.getElementById('btn-exportar');
const btnImportar = document.getElementById('btn-importar');
const inputImportar = document.getElementById('input-importar'); 

// ELEMENTOS DO MODAL DA LIXEIRA
const btnAbrirLixeira = document.getElementById('btn-abrir-lixeira');
const lixeiraModal = document.getElementById('lixeira-modal');
const btnFecharLixeira = document.getElementById('btn-fechar-lixeira');
const lixeiraBody = document.getElementById('lixeira-body');
const contadorLixeiraSpan = document.getElementById('contador-lixeira'); 
const contadorLixeiraModalSpan = document.getElementById('contador-lixeira-modal'); 
const btnLimparLixeira = document.getElementById('btn-limpar-lixeira');

// ELEMENTOS DE PAGINAÇÃO (NOVO)
const pageSizeSelect = document.getElementById('page-size');
const prevPageBtn = document.getElementById('prev-page-btn');
const nextPageBtn = document.getElementById('next-page-btn');
const pageInfoSpan = document.getElementById('page-info');


// --- Funções de Persistência (localStorage) ---

function salvarProdutos() {
    localStorage.setItem('listaProdutos', JSON.stringify(produtos));
    localStorage.setItem('produtosArquivados', JSON.stringify(produtosArquivados));
}

function carregarProdutos() {
    const saved = localStorage.getItem('listaProdutos');
    if (saved) {
        try {
            produtos = JSON.parse(saved);
        } catch (e) {
            console.error("Erro ao carregar dados do localStorage:", e);
            produtos = [];
        }
    }
    const savedArquivados = localStorage.getItem('produtosArquivados');
    if (savedArquivados) {
        try {
            produtosArquivados = JSON.parse(savedArquivados);
        } catch (e) {
            console.error("Erro ao carregar lixeira do localStorage:", e);
            produtosArquivados = [];
        }
    }
}

function salvarStatusColunas(status) {
    localStorage.setItem('statusColunas', JSON.stringify(status));
}

function carregarStatusColunas() {
    const saved = localStorage.getItem('statusColunas');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            return {}; 
        }
    }
    return {};
}


// --- Funções de Ajuda e Validação ---

const formatarMoeda = (valor) => {
    if (typeof valor !== 'number' || isNaN(valor)) {
        valor = 0;
    }
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// FUNÇÃO DE EXCLUSÃO MODIFICADA PARA ARQUIVAR
function excluirProduto(produtoId) {
    const produtoIndex = produtos.findIndex(p => p.Id === produtoId);
    
    if (produtoIndex === -1) return;

    const produto = produtos[produtoIndex];
    
    if (confirm(`ATENÇÃO: Você está prestes a MOVER o produto [ID: ${produto.Id}] - [NOME: ${produto.Nome}] para a LIXEIRA. Confirma?`)) {
        
        produtos.splice(produtoIndex, 1);
        produtosArquivados.push(produto);

        salvarProdutos(); 
        atualizarExibicao();
        console.log(`Produto com ID ${produtoId} arquivado.`);
    }
}

function editarProduto(id, campo, novoValor) {
    const index = produtos.findIndex(item => item.Id === id);

    if (index === -1) {
        console.error("Erro ao editar: Produto não encontrado.");
        return;
    }

    let valorFinal = novoValor;
    let campoOriginal = produtos[index][campo]; 

    // --- VALIDAÇÃO E CONVERSÃO ---
    if (campo === 'Id' || campo === 'Nome') {
        valorFinal = novoValor.trim();
        if (valorFinal === "") {
            alert(`O campo ${campo} não pode ser vazio.`);
            atualizarExibicao(); 
            return;
        }
        if (campo === 'Id' && valorFinal !== campoOriginal && produtos.some((p, i) => p.Id === valorFinal && i !== index)) {
            alert(`O ID ${valorFinal} já está sendo usado por outro produto.`);
            atualizarExibicao(); 
            return;
        }

    } else if (campo === 'Quantidade') {
        let valorNumerico = parseInt(novoValor);
        if (isNaN(valorNumerico) || valorNumerico < 0) {
            alert("A quantidade deve ser um número inteiro positivo ou zero.");
            atualizarExibicao(); 
            return;
        }
        valorFinal = valorNumerico;

    } else if (campo === 'Preço') {
        let stringLimpa = novoValor.toString().replace('R$', '').trim();
        stringLimpa = stringLimpa.replace(/\./g, '').replace(',', '.'); 
        
        let valorNumerico = parseFloat(stringLimpa);
        
        if (isNaN(valorNumerico) || valorNumerico < 0) {
            alert("O preço deve ser um valor numérico válido e positivo.");
            atualizarExibicao(); 
            return;
        }
        valorFinal = valorNumerico;

    } else if (campo === 'Categoria') {
         valorFinal = novoValor;
    } else {
        return; 
    }

    // Aplica a alteração no array
    produtos[index][campo] = valorFinal;
    
    // Salva e atualiza a exibição
    salvarProdutos();
    atualizarExibicao();
}

function ordenarProdutos(campo, direcao) {
    if (!campo) return;

    produtos.sort((a, b) => {
        let valA = a[campo];
        let valB = b[campo];

        if (campo === 'Preço' || campo === 'Quantidade') {
            valA = parseFloat(valA);
            valB = parseFloat(valB);
        }
        if (campo === 'Total') {
            valA = a.Preço * a.Quantidade;
            valB = b.Preço * b.Quantidade;
        }
        
        if (typeof valA === 'string') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
        }

        if (valA < valB) {
            return direcao === 'asc' ? -1 : 1;
        }
        if (valA > valB) {
            return direcao === 'asc' ? 1 : -1;
        }
        return 0;
    });

    salvarProdutos();
}


// --- Funções do Dashboard e Gráfico ---

function gerarCoresAleatorias(num) {
    const cores = [
        '#0077B6', '#48CAE4', '#00B8D9', '#00C853', '#FFAB00', 
        '#E65100', '#D50000', '#AA00FF', '#6200EE', '#00C4FF'
    ];
    let result = [];
    for (let i = 0; i < num; i++) {
        result.push(cores[i % cores.length]);
    }
    return result;
}

function calcularDadosDoChart() {
    const totalPorCategoria = {};

    produtos.forEach(item => {
        const totalItem = item.Preço * item.Quantidade;
        const categoria = item.Categoria || 'Outros'; 
        
        if (totalPorCategoria[categoria]) {
            totalPorCategoria[categoria] += totalItem;
        } else {
            totalPorCategoria[categoria] = totalItem;
        }
    });

    const labels = Object.keys(totalPorCategoria).filter(cat => totalPorCategoria[cat] > 0);
    const data = labels.map(cat => totalPorCategoria[cat]);
    const backgroundColors = gerarCoresAleatorias(labels.length);
    
    return { labels, data, backgroundColors };
}

function renderizarChart() {
    const ctx = document.getElementById('distribuicao-estoque-chart');
    const chartData = calcularDadosDoChart();
    
    if (distribuicaoEstoqueChart) {
        distribuicaoEstoqueChart.destroy();
    }
    
    if (chartData.labels.length === 0) {
        ctx.style.display = 'none';
        return; 
    } else {
        ctx.style.display = 'block';
    }

    const isDarkMode = document.body.classList.contains('dark-mode');
    const textColor = isDarkMode ? '#F8F9FA' : '#212529';
    
    distribuicaoEstoqueChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: chartData.labels,
            datasets: [{
                data: chartData.data,
                backgroundColor: chartData.backgroundColors,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right', 
                    labels: {
                        color: textColor,
                        font: {
                            family: 'Poppins'
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Valor Total do Estoque por Categoria',
                    color: textColor,
                    font: {
                        family: 'Poppins',
                        size: 16
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            label += formatarMoeda(context.parsed);
                            return label;
                        }
                    }
                }
            }
        }
    });
}


function calcularMetricasDashboard() {
    if (produtos.length === 0) {
        totalProdutosUnicosSpan.textContent = '0';
        precoMedioUnitarioSpan.textContent = formatarMoeda(0);
        categoriaMaisValiosaSpan.textContent = 'N/D';
        return;
    }

    let somaPrecosUnitarios = 0;
    const totalPorCategoria = {};

    produtos.forEach(item => {
        somaPrecosUnitarios += item.Preço;
        
        const totalItem = item.Preço * item.Quantidade;
        const categoria = item.Categoria || 'Outros'; 
        
        if (totalPorCategoria[categoria]) {
            totalPorCategoria[categoria] += totalItem;
        } else {
            totalPorCategoria[categoria] = totalItem;
        }
    });

    totalProdutosUnicosSpan.textContent = produtos.length.toString();

    const precoMedio = somaPrecosUnitarios / produtos.length;
    precoMedioUnitarioSpan.textContent = formatarMoeda(precoMedio);

    let categoriaMaisValiosa = 'N/D';
    let maiorValor = 0;

    for (const categoria in totalPorCategoria) {
        if (totalPorCategoria[categoria] > maiorValor) {
            maiorValor = totalPorCategoria[categoria];
            categoriaMaisValiosa = categoria;
        }
    }

    if (maiorValor > 0) {
        categoriaMaisValiosaSpan.textContent = `${categoriaMaisValiosa} (${formatarMoeda(maiorValor)})`;
    } else {
         categoriaMaisValiosaSpan.textContent = 'N/D';
    }
}


// --- Funções de Modal ---

function abrirLixeira() {
    lixeiraModal.classList.remove('hidden-modal');
    document.body.style.overflow = 'hidden'; 
}

function fecharLixeira() {
    lixeiraModal.classList.add('hidden-modal');
    document.body.style.overflow = 'auto'; 
}


// --- Funções da Lixeira ---

function restaurarProduto(produtoId) {
    const produtoIndex = produtosArquivados.findIndex(p => p.Id === produtoId);
    
    if (produtoIndex === -1) return;

    const produto = produtosArquivados[produtoIndex];

    if (produtos.some(p => p.Id === produtoId)) {
        alert(`Não foi possível restaurar. O ID ${produtoId} já está em uso na lista principal.`);
        return;
    }

    produtosArquivados.splice(produtoIndex, 1);
    produtos.push(produto);

    salvarProdutos();
    atualizarExibicao();
    alert(`Produto ${produtoId} restaurado com sucesso!`);
}

function limparLixeiraPermanentemente() {
    if (produtosArquivados.length === 0) {
        alert("A lixeira já está vazia.");
        return;
    }

    if (confirm(`ATENÇÃO: Você irá EXCLUIR PERMANENTEMENTE ${produtosArquivados.length} produtos da lixeira. Esta ação é irreversível. Confirma?`)) {
        produtosArquivados = [];
        salvarProdutos();
        atualizarExibicao();
        alert("Lixeira limpa permanentemente.");
    }
}

function renderizarLixeira() {
    lixeiraBody.innerHTML = '';
    
    // Atualiza ambos os contadores
    contadorLixeiraSpan.textContent = produtosArquivados.length;
    contadorLixeiraModalSpan.textContent = produtosArquivados.length;
    
    if (produtosArquivados.length === 0) {
         const tr = document.createElement('tr');
         tr.innerHTML = `<td colspan="4" style="text-align: center; font-style: italic;">A lixeira está vazia.</td>`;
         lixeiraBody.appendChild(tr);
         btnLimparLixeira.disabled = true;
         return;
    }
    
    btnLimparLixeira.disabled = false;

    produtosArquivados.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.Id}</td>
            <td style="text-align: left;">${item.Nome}</td>
            <td>${item.Categoria}</td>
            <td>
                <button class="btn-restaurar" data-id="${item.Id}">Restaurar</button>
            </td>
        `;
        lixeiraBody.appendChild(tr);
        
        tr.querySelector('.btn-restaurar').addEventListener('click', (e) => {
            restaurarProduto(e.target.getAttribute('data-id'));
        });
    });
}


// --- Funções de Exibição de Colunas ---

function renderizarCabecalhos() {
    tabelaHeadRow.innerHTML = '';
    const statusColunas = carregarStatusColunas();
    
    COLUNAS.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col.label;
        th.classList.add(`coluna-${col.key.toLowerCase()}`);

        if (statusColunas[col.key] === false) {
             th.classList.add('coluna-oculta');
        }
        
        if (col.isSortable) {
            th.classList.add('sortable');
            
            if (estadoOrdenacao.campo === col.key) {
                const seta = estadoOrdenacao.direcao === 'asc' ? ' ▲' : ' ▼';
                th.innerHTML += `<span class="sort-indicator">${seta}</span>`;
            }
            
            th.addEventListener('click', () => {
                let novaDirecao = 'asc';
                
                if (estadoOrdenacao.campo === col.key) {
                    novaDirecao = estadoOrdenacao.direcao === 'asc' ? 'desc' : 'asc';
                }
                
                estadoOrdenacao = { campo: col.key, direcao: novaDirecao };
                
                // Ao clicar no cabeçalho, volta para a primeira página
                estadoPaginacao.paginaAtual = 1; 
                atualizarExibicao(); 
            });
        }

        tabelaHeadRow.appendChild(th);
    });
}

function gerarCheckboxesColunas() {
    columnCheckboxesPanel.innerHTML = '<h3>Exibir Colunas:</h3>';
    const statusColunas = carregarStatusColunas();

    COLUNAS.forEach(col => {
        if (col.key !== 'Acoes') { 
            const isChecked = statusColunas[col.key] !== false; 
            
            const label = document.createElement('label');
            label.innerHTML = `
                <input type="checkbox" data-column-key="${col.key}" ${isChecked ? 'checked' : ''}>
                ${col.label}
            `;
            columnCheckboxesPanel.appendChild(label);
        }
    });

    columnCheckboxesPanel.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const key = e.target.getAttribute('data-column-key');
            const isVisible = e.target.checked;
            
            statusColunas[key] = isVisible;
            salvarStatusColunas(statusColunas);
            
            atualizarExibicao();
        });
    });
}

function toggleColumnConfig() {
    columnCheckboxesPanel.classList.toggle('hidden');
}


// --- Funções de Paginação (NOVO) ---

function atualizarControlesPaginacao(totalItens) {
    const totalPaginas = estadoPaginacao.totalPaginas;
    const paginaAtual = estadoPaginacao.paginaAtual;
    
    pageInfoSpan.textContent = `Página ${paginaAtual} de ${totalPaginas}`;
    
    prevPageBtn.disabled = paginaAtual === 1 || totalItens === 0;
    nextPageBtn.disabled = paginaAtual === totalPaginas || totalItens === 0;

    // Se o filtro resultar em menos itens que a página atual, redefine o texto
    if (totalItens === 0) {
        pageInfoSpan.textContent = 'Página 0 de 0';
    }
}

function mudarPagina(direcao) {
    if (direcao === 'prev' && estadoPaginacao.paginaAtual > 1) {
        estadoPaginacao.paginaAtual--;
    } else if (direcao === 'next' && estadoPaginacao.paginaAtual < estadoPaginacao.totalPaginas) {
        estadoPaginacao.paginaAtual++;
    }
    atualizarExibicao(); 
}

function mudarTamanhoPagina() {
    estadoPaginacao.paginaAtual = 1; 
    atualizarExibicao(); 
}


// --- Função Central de Atualização ---

function atualizarExibicao() {
    // 1. ATUALIZA MÉTRICAS, GRÁFICO E LIXEIRA
    calcularMetricasDashboard(); 
    renderizarChart();
    renderizarLixeira();

    // 2. APLICA ORDENAÇÃO, FILTRO (Geração da lista completa e ordenada)
    ordenarProdutos(estadoOrdenacao.campo, estadoOrdenacao.direcao);
    
    renderizarCabecalhos();
    gerarCheckboxesColunas();
    
    const filtroAtivo = filtroCategoriaSelect.value;
    const termoBusca = barraPesquisaInput.value.toLowerCase().trim();
    const statusColunas = carregarStatusColunas();

    // Aplica filtros
    const produtosFiltrados = produtos.filter(item => {
        const passaNoFiltroCategoria = filtroAtivo === 'Todos' || item.Categoria === filtroAtivo;
        if (!passaNoFiltroCategoria) return false;

        if (termoBusca === '') return true;

        const idLower = item.Id.toLowerCase();
        const nomeLower = item.Nome.toLowerCase();
        
        return idLower.includes(termoBusca) || nomeLower.includes(termoBusca);
    });
    
    contadorProdutosSpan.textContent = produtosFiltrados.length;
    
    // --- LÓGICA DE PAGINAÇÃO ---
    
    // Calcula o total de páginas
    estadoPaginacao.tamanhoPagina = parseInt(pageSizeSelect.value);
    
    const totalItens = produtosFiltrados.length;
    estadoPaginacao.totalPaginas = Math.ceil(totalItens / estadoPaginacao.tamanhoPagina);
    
    // Garante que a página atual seja válida
    if (estadoPaginacao.paginaAtual > estadoPaginacao.totalPaginas && totalItens > 0) {
        estadoPaginacao.paginaAtual = estadoPaginacao.totalPaginas;
    } else if (totalItens === 0) {
        estadoPaginacao.paginaAtual = 1; 
    }
    
    // Determina o intervalo (slice)
    const inicio = (estadoPaginacao.paginaAtual - 1) * estadoPaginacao.tamanhoPagina;
    const fim = inicio + estadoPaginacao.tamanhoPagina;
    
    // Produtos que realmente serão mostrados na tabela
    estadoPaginacao.produtosVisiveis = produtosFiltrados.slice(inicio, fim);
    
    // Atualiza os controles de paginação
    atualizarControlesPaginacao(totalItens);


    // 3. RENDERIZAÇÃO DA TABELA (usando apenas produtosVisiveis)
    tabelaBody.innerHTML = '';
    let totalGeralEstoque = 0;

    if (estadoPaginacao.produtosVisiveis.length === 0) {
        const colspan = COLUNAS.length; 
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="${colspan}" style="text-align: center; font-style: italic;">Nenhum produto encontrado na página atual.</td>`; 
        tabelaBody.appendChild(tr);
    } else {
        estadoPaginacao.produtosVisiveis.forEach(item => {
            const tr = document.createElement('tr');
            
            const totalItem = item.Preço * item.Quantidade;
            totalGeralEstoque += totalItem;
            
            const totalItemFormatado = formatarMoeda(totalItem);
            
            const categoriaOptions = `
                <option value="Eletronicos">Eletrônicos</option>
                <option value="Alimentos">Alimentos</option>
                <option value="Vestuario">Vestuário</option>
                <option value="Servicos">Serviços</option>
                <option value="Outros">Outros</option>
            `;

            let rowHTML = '';
            
            COLUNAS.forEach(col => {
                let cellContent = '';
                let cellClass = `coluna-${col.key.toLowerCase()}`;
                let isHidden = statusColunas[col.key] === false;
                
                if (isHidden) {
                    cellClass += ' coluna-oculta';
                }
                
                const alignRight = (col.key === 'Preço' || col.key === 'Total') ? 'style="text-align: right;"' : '';

                if (col.key === 'Id') {
                    cellContent = `<td class="id-cell ${cellClass}" data-field="Id" contenteditable="true">${item.Id}</td>`;
                } else if (col.key === 'Nome') {
                    cellContent = `<td class="nome-cell ${cellClass}" data-field="Nome" contenteditable="true">${item.Nome}</td>`;
                } else if (col.key === 'Categoria') {
                     cellContent = `
                        <td class="categoria-cell ${cellClass}" data-field="Categoria">
                            <select class="select-categoria-inline" data-id="${item.Id}" aria-label="Editar Categoria">
                                ${categoriaOptions}
                            </select>
                        </td>`;
                } else if (col.key === 'Quantidade') {
                    cellContent = `<td class="qtd-cell ${cellClass}" data-field="Quantidade" contenteditable="true">${item.Quantidade}</td>`;
                } else if (col.key === 'Preço') {
                    const precoFormatado = formatarMoeda(item.Preço);
                    cellContent = `<td class="preco-cell ${cellClass}" ${alignRight} data-field="Preço" contenteditable="true">${precoFormatado}</td>`;
                } else if (col.key === 'Total') {
                    cellContent = `<td class="total-cell ${cellClass}" ${alignRight}>${totalItemFormatado}</td>`;
                } else if (col.key === 'Acoes') {
                    cellContent = `
                        <td class="acao-cell ${cellClass}">
                            <button class="btn btn-danger-acao" data-id="${item.Id}">Excluir</button>
                        </td>`;
                }
                
                rowHTML += cellContent;
            });

            tr.innerHTML = rowHTML;
            
            const selectElement = tr.querySelector('.select-categoria-inline');
            if (selectElement) {
                selectElement.value = item.Categoria;
            }
            
            tabelaBody.appendChild(tr);

            const deleteButton = tr.querySelector('.btn-danger-acao');
            if (deleteButton) {
                 deleteButton.addEventListener('click', () => {
                    excluirProduto(item.Id);
                });
            }
        });
    }
    
    valorTotalEstoqueSpan.textContent = formatarMoeda(totalGeralEstoque);

    // ANEXA LISTENERS DE EDIÇÃO INLINE
    document.querySelectorAll('[contenteditable="true"]').forEach(cell => {
        const tr = cell.closest('tr');
        const acaoButton = tr.querySelector('.btn-danger-acao');
        if (acaoButton) {
            const produtoId = acaoButton.getAttribute('data-id');

            cell.addEventListener('blur', (e) => {
                const novoValor = e.target.textContent.trim();
                const campo = e.target.getAttribute('data-field');
                editarProduto(produtoId, campo, novoValor);
            });

            cell.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault(); 
                    e.target.blur(); 
                }
            });
        }
    });

    // ANEXA LISTENERS DE EDIÇÃO PARA O CAMPO CATEGORIA (SELECT)
    document.querySelectorAll('.select-categoria-inline').forEach(select => {
        const produtoId = select.getAttribute('data-id');

        select.addEventListener('change', (e) => {
            const novoValor = e.target.value;
            editarProduto(produtoId, 'Categoria', novoValor);
        });
    });
}


function adicionarProduto(event) {
    event.preventDefault();
    
    const inputId = document.getElementById('produto-id');
    const inputNome = document.getElementById('produto-nome');
    const selectCategoria = document.getElementById('produto-categoria');
    const inputQuantidade = document.getElementById('produto-quantidade');
    const inputPreco = document.getElementById('produto-preco');
    
    try {
        const produto_id = inputId.value.trim(); 
        const nome = inputNome.value.trim();
        const categoria = selectCategoria.value;
        const quantidade = parseInt(inputQuantidade.value); 
        
        let preco_str = inputPreco.value.replace('R$', '').trim();
        preco_str = preco_str.replace(/\./g, '').replace(',', '.'); 
        const preco = parseFloat(preco_str);


        if (produto_id === "" || nome === "" || categoria === "" || isNaN(preco) || isNaN(quantidade) || quantidade < 0) {
            throw new Error("Dados inválidos ou campos obrigatórios vazios.");
        }
        
        if (produtos.some(p => p.Id === produto_id) || produtosArquivados.some(p => p.Id === produto_id)) {
            alert(`O ID ${produto_id} já está em uso na lista principal ou na lixeira.`);
            inputId.focus();
            return;
        }

        const itens = {
            "Id": produto_id,
            "Nome": nome,
            "Categoria": categoria,
            "Quantidade": quantidade,
            "Preço": preco 
        };
        
        produtos.push(itens);
        salvarProdutos(); 

        inputId.value = '';
        inputNome.value = '';
        selectCategoria.value = '';
        inputQuantidade.value = '1';
        inputPreco.value = '';
        inputId.focus();

        // Volta para a primeira página ao adicionar um novo produto
        estadoPaginacao.paginaAtual = 1; 
        atualizarExibicao();
        
    } catch (error) {
        alert("Erro de Entrada: Verifique se os campos estão preenchidos corretamente.");
        console.error("Erro ao processar entrada:", error);
    }
}


function exportarDados() {
    const dadosParaExportar = {
        produtosAtivos: produtos,
        produtosArquivados: produtosArquivados
    };
    
    const jsonString = JSON.stringify(dadosParaExportar, null, 2); 
    
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    const dataAtual = new Date().toISOString().slice(0, 10);
    a.download = `inventario_produtos_${dataAtual}.json`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('Inventário completo (ativos e arquivados) exportado com sucesso como arquivo JSON!');
}

function importarDados(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const jsonConteudo = e.target.result;
            const dados = JSON.parse(jsonConteudo);
            
            let novosProdutos = dados.produtosAtivos || dados; 
            let novosArquivados = dados.produtosArquivados || [];

            if (Array.isArray(novosProdutos)) {
                
                if (confirm(`Atenção! A importação substituirá o inventário ATUAL e a LIXEIRA. Continuar?`)) {
                    
                    produtos = novosProdutos.map(p => ({
                        Id: String(p.Id).trim(),
                        Nome: String(p.Nome).trim(),
                        Categoria: String(p.Categoria).trim(),
                        Quantidade: parseInt(p.Quantidade) || 0,
                        Preço: parseFloat(p.Preço) || 0,
                    }));
                    
                    produtosArquivados = novosArquivados.map(p => ({
                        Id: String(p.Id).trim(),
                        Nome: String(p.Nome).trim(),
                        Categoria: String(p.Categoria).trim(),
                        Quantidade: parseInt(p.Quantidade) || 0,
                        Preço: parseFloat(p.Preço) || 0,
                    }));

                    salvarProdutos();
                    // Volta para a primeira página após a importação
                    estadoPaginacao.paginaAtual = 1; 
                    atualizarExibicao();
                    alert(`Importação concluída! ${produtos.length} produtos ativos e ${produtosArquivados.length} arquivados carregados.`);
                }
            } else {
                alert('Erro de importação: O arquivo JSON não está no formato de lista de produtos esperado.');
            }
        } catch (error) {
            alert(`Erro ao processar o arquivo: ${error.message}. Certifique-se de que é um JSON válido.`);
            console.error(error);
        }
        inputImportar.value = ''; 
    };

    reader.onerror = function() {
        alert('Erro ao ler o arquivo.');
    };

    reader.readAsText(file);
}

function alternarTema() {
    const body = document.body;
    const toggleButton = document.getElementById('theme-toggle');
    
    body.classList.toggle('dark-mode');
    
    if (body.classList.contains('dark-mode')) {
        toggleButton.innerHTML = '🌙'; 
        toggleButton.title = 'Alternar para Modo Claro';
        localStorage.setItem('theme', 'dark');
    } else {
        body.classList.remove('dark-mode');
        toggleButton.innerHTML = '☀️'; 
        toggleButton.title = 'Alternar para Modo Escuro';
        localStorage.setItem('theme', 'light');
    }
    
    // Atualiza o gráfico após a mudança de tema
    if (distribuicaoEstoqueChart) {
        distribuicaoEstoqueChart.options.plugins.legend.labels.color = body.classList.contains('dark-mode') ? '#F8F9FA' : '#212529';
        distribuicaoEstoqueChart.options.plugins.title.color = body.classList.contains('dark-mode') ? '#F8F9FA' : '#212529';
        distribuicaoEstoqueChart.update();
    }
}


// --- Inicialização e Event Listeners ---

formProduto.addEventListener('submit', adicionarProduto);
filtroCategoriaSelect.addEventListener('change', atualizarExibicao);
barraPesquisaInput.addEventListener('input', atualizarExibicao);
toggleConfigBtn.addEventListener('click', toggleColumnConfig);

btnExportar.addEventListener('click', exportarDados);
btnImportar.addEventListener('click', () => {
    inputImportar.click();
});
inputImportar.addEventListener('change', importarDados);

// LISTENERS DO MODAL E LIXEIRA
btnLimparLixeira.addEventListener('click', limparLixeiraPermanentemente);
btnAbrirLixeira.addEventListener('click', abrirLixeira);
btnFecharLixeira.addEventListener('click', fecharLixeira);

lixeiraModal.addEventListener('click', (e) => {
    if (e.target === lixeiraModal) {
        fecharLixeira();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !lixeiraModal.classList.contains('hidden-modal')) {
        fecharLixeira();
    }
});

// LISTENERS DE PAGINAÇÃO (NOVO)
pageSizeSelect.addEventListener('change', mudarTamanhoPagina);
prevPageBtn.addEventListener('click', () => mudarPagina('prev'));
nextPageBtn.addEventListener('click', () => mudarPagina('next'));


document.addEventListener('DOMContentLoaded', () => {
    carregarProdutos();
    
    const savedTheme = localStorage.getItem('theme');
    const body = document.body;
    const toggleButton = document.getElementById('theme-toggle');
    
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
        toggleButton.innerHTML = '🌙';
        toggleButton.title = 'Alternar para Modo Claro';
    } else {
        body.classList.remove('dark-mode');
        toggleButton.innerHTML = '☀️';
        toggleButton.title = 'Alternar para Modo Escuro';
    }
    
    if (toggleButton) {
        toggleButton.addEventListener('click', alternarTema);
    }
    
    // Inicializa o tamanho da página com o valor default do select
    estadoPaginacao.tamanhoPagina = parseInt(pageSizeSelect.value);

    atualizarExibicao(); 
    document.getElementById('produto-id').focus();
});