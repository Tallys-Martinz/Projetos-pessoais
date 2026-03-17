const menu = document.getElementById("menu")
const cartBtn = document.getElementById("cart-btn")
const cartModal = document.getElementById("cart-modal")
const cartItemsContainer = document.getElementById("cart-items")
const cartTotal = document.getElementById("cart-total")     
const checkoutBtn = document.getElementById("checkout-btn") 
const closeModalBtn = document.getElementById("close-modal-btn")
const cartCounter = document.getElementById("cart-count")
const addressInput = document.getElementById("address")
const addressWarn = document.getElementById("address-warn")
const spanHora = document.getElementById("date-span")
const statusText = document.getElementById("status-text")
const clientNameInput = document.getElementById("client-name")
const nameWarn = document.getElementById("name-warn")

let cart = [];

// --- AUXILIARES ---

function checkOpen() {
    const status = localStorage.getItem("statusLoja") || "aberto";
    return status === "aberto";
}

// --- FUNÇÕES DE STATUS (CORRIGIDAS) ---

function checkOpen() {
    // 1. Verifica se o ADM forçou o fechamento/abertura manualmente
    const statusVendedor = localStorage.getItem("statusLoja");
    
    if (statusVendedor === "fechado") return false;
    if (statusVendedor === "aberto") return true;

    // 2. Se não houver comando manual, verifica o horário automático (18h às 22h por exemplo)
    const data = new Date();
    const hora = data.getHours();
    return hora >= 18 && hora < 22; 
}

function updateHeaderStatus() {
    const isOpen = checkOpen();
    
    if (isOpen) {
        // Se estiver aberto: Verde
        spanHora.classList.remove("bg-red-500");
        spanHora.classList.add("bg-green-600");
        statusText.innerText = "ABERTO";
    } else {
        // Se estiver fechado: Vermelho
        spanHora.classList.remove("bg-green-600");
        spanHora.classList.add("bg-red-500");
        statusText.innerText = "FECHADO";
    }
}

// --- OUVINTE DE EVENTOS PARA MUDANÇA EM TEMPO REAL ---

// Isso faz com que se o ADM mudar o status em outra aba, o index.html mude na hora
window.addEventListener('storage', (e) => {
    if (e.key === 'statusLoja') {
        updateHeaderStatus();
    }
});

// Executa assim que a página carrega
updateHeaderStatus();

// --- MODAL ---

cartBtn.addEventListener("click", function() {
    cartModal.style.display = "flex";
    updateCartModal();
    monitorarStatusLoja(); // Verifica se fechou enquanto o cliente navegava
})

cartModal.addEventListener("click", function(event){
    if(event.target === cartModal) cartModal.style.display = "none"
})

closeModalBtn.addEventListener("click", function(){
    cartModal.style.display = "none"
})

// --- LÓGICA DO CARRINHO ---

menu.addEventListener("click", function(event) {
    let parentButton = event.target.closest(".add-to-cart-btn")
    if(parentButton){
        const name = parentButton.getAttribute("data-name")
        const price = parseFloat(parentButton.getAttribute("data-price"))
        addToCart(name, price) 
    }
})

function addToCart(name, price){
    const existingItem = cart.find(item => item.name === name)
    if(existingItem){
        existingItem.quantity += 1;
    } else {
        cart.push({ name, price, quantity: 1 })
    }
    updateCartModal()
    Toastify({
        text: `"${name}" adicionado!`,
        duration: 3000,
        style: { background: "#16a34a" }
    }).showToast();
}

function updateCartModal(){
    cartItemsContainer.innerHTML = "";
    let total = 0;

    cart.forEach(item => {
        const cartItemElement = document.createElement("div");
        cartItemElement.classList.add("flex", "justify-between", "mb-4", "flex-col")
        cartItemElement.innerHTML = `
        <div class="flex items-center justify-between">
            <div>
                <p class="font-medium">${item.name}</p>
                <p>Qtd: ${item.quantity}</p> 
                <p class="font-medium mt-2">R$ ${item.price.toFixed(2)}</p>
            </div>
            <button class="remove-from-cart-btn text-red-500" data-name="${item.name}">Remover</button>
        </div>`
        total += item.price * item.quantity;
        cartItemsContainer.appendChild(cartItemElement)
    })

    cartTotal.textContent = total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    cartCounter.innerHTML = cart.length;
}

cartItemsContainer.addEventListener("click", function (event){
    if(event.target.classList.contains("remove-from-cart-btn")){
        const name = event.target.getAttribute("data-name")
        removeItemCart(name);
    }
})

function removeItemCart(name){
    const index = cart.findIndex(item => item.name === name);
    if(index !== -1){
        if(cart[index].quantity > 1){
            cart[index].quantity -=1;
        } else {
            cart.splice(index, 1);
        }
        updateCartModal();
    }
}

// --- FINALIZAÇÃO ---

function salvarPedidoNoSistema(pedido) {
    let pedidos = JSON.parse(localStorage.getItem("pedidosRecebidos")) || [];
    pedidos.push(pedido);
    localStorage.setItem("pedidosRecebidos", JSON.stringify(pedidos));
}

checkoutBtn.addEventListener("click", function(){
    // 1ª TRAVA: Status da Loja
    if(!checkOpen()){
        Toastify({
            text: "Ops! A loja está fechada!",
            duration: 5000,
            style: { background: "#ef4444" }
        }).showToast();
        return;
    }

    // 2ª TRAVA: Carrinho Vazio
    if(cart.length === 0) return;

    // 3ª TRAVA: Validação de Dados
    if(clientNameInput.value === "" || addressInput.value === "") {
        if(nameWarn) nameWarn.classList.remove("hidden");
        if(addressWarn) addressWarn.classList.remove("hidden");
        alert("Preencha nome e endereço!");
        return;
    }

    const cartItems = cart.map((item) => `${item.name} (${item.quantity})`).join(" | ")
    
    const novoPedido = {
        id: Math.floor(Math.random() * 9000) + 1000,
        cliente: clientNameInput.value,
        endereco: addressInput.value,
        itens: cartItems,
        total: cartTotal.textContent,
        hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        status: "novo"
    };

    salvarPedidoNoSistema(novoPedido);
    alert("Pedido enviado para o painel!");

    // Limpeza
    cart = [];
    clientNameInput.value = "";
    addressInput.value = ""; 
    updateCartModal();
    cartModal.style.display = "none";
})

// --- INICIALIZAÇÃO ---
updateHeaderStatus();