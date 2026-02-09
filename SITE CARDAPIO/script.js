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

let cart = [];

// ABRIR MODAL DO CARRINHO
cartBtn.addEventListener("click", function() {
    cartModal.style.display = "flex"
    updateCartModal();
})

//FECHAR MODAL AO CLICAR FORA
cartModal.addEventListener("click", function(event){
    if(event.target === cartModal){
        cartModal.style.display = "none"
    }
})

closeModalBtn.addEventListener("click", function(){
    cartModal.style.display = "none"
})

menu.addEventListener("click", function(event) {
    let parentButton = event.target.closest(".add-to-cart-btn")

    if(parentButton){
        const name = parentButton.getAttribute("data-name")
        const price = parseFloat(parentButton.getAttribute("data-price"))

        // Chamando addToCart e passando o botão clicado
        addToCart(name, price, parentButton) 
    }


})

// FUNÇÃO PARA ADD NO CARRINHO
// Recebe o elemento do botão como parâmetro
function addToCart(name, price, clickedButton){
    
    const existingItem = cart.find(item => item.name === name)

    if(existingItem){
        // SE ITEM EXISTE, AUMENTA +1
        existingItem.quantity += 1;
    }else{
        // Adiciona o novo item ao array 'cart'
        cart.push({
        name,
        price,
        quantity: 1,
        })
    }
    
    // --- LÓGICA DO DESTAQUE VISUAL NO BOTÃO ---
    if (clickedButton) {
        // Remove classes padrão e adiciona destaque temporário
        clickedButton.classList.remove("bg-gray-900", "hover:scale-110");
        clickedButton.classList.add("bg-green-600", "animate-pulse");

        // Define um tempo limite para remover as classes de destaque
        setTimeout(() => {
            clickedButton.classList.remove("bg-green-600", "animate-pulse");
            // Restaura as classes originais do botão
            clickedButton.classList.add("bg-gray-900", "hover:scale-110");
        }, 500); // 500ms é um bom tempo para um feedback rápido
    }
    // ------------------------------------------

    updateCartModal()
    
    // NOVIDADE: MENSAGEM DO TOAST PERSONALIZADA
    Toastify({
        text: `"${name}" adicionado(a) ao carrinho!`, // Usa o nome do item
        duration: 3000,
        close: true,
        gravity: "top",
        position: "right",
        stopOnFocus: true,
        style: {
            background: "#16a34a", // Verde
        }
    }).showToast();
}

//ATUALIZA O CARRINHO   
function updateCartModal(){
    cartItemsContainer.innerHTML = "";
    let total = 0;

    cart.forEach(item => {
        const cartItemElement = document.createElement("div");
        cartItemElement.classList.add("flex", "justify-between", "mb-4", "flex-col")

        cartItemElement.innerHTML = `
        <div class= "flex items-center justify-between">
            <div>
                <p class="font-medium">${item.name}</p>
                <p>Qtd: ${item.quantity}</p> 
                <p class="font-medium mt-2">Preço: R$ ${item.price.toFixed(2)}</p>
            </div>

                <button class="remove-from-cart-btn bg-red-500 text-white px-2 py-1 rounded-lg hover:bg-red-800 hover:scale-110 duration-100"" data-name="${item.name}">
                    Remover
                </button>
            
        </div>
        `
        total += item.price * item.quantity;

        cartItemsContainer.appendChild(cartItemElement)

    })

    cartTotal.textContent = total.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });

    cartCounter.innerHTML = cart.length;
}

//FUNÇÃO REMOVER ITEM 
cartItemsContainer.addEventListener("click", function (event){
    if(event.target.classList.contains("remove-from-cart-btn")){
        const name = event.target.getAttribute("data-name")

        removeItemCart(name);
    }
})

function removeItemCart(name){
    const index = cart.findIndex(item => item.name === name);

    if(index !== -1){
        const item = cart[index];

        if(item.quantity > 1){
            item.quantity -=1;
            updateCartModal();
            return;
        }

        cart.splice(index, 1);
        updateCartModal();
    }
}

addressInput.addEventListener("input", function(event){
    let inputValue = event.target.value;

    if(inputValue !== ""){
        addressInput.classList.remove("border-red-500")
        addressWarn.classList.add("hidden")
    }
})

// FINALIZAR PEDIDO
checkoutBtn.addEventListener("click", function(){

    const isOpen = checkrestaurantOpen();
    if(!isOpen){
        
        Toastify({
            text: "Restaurente está fechado no momento",
            duration: 3000,
            close: true,
            gravity: "top",
            position: "left",
            stopOnFocus: true,
            style: {
            background: "#ef4444",
        }
    }).showToast();

        return;
    } 


    if(cart.length === 0) return;
    if(addressInput.value === ""){
        addressWarn.classList.remove("hidden")
        addressInput.classList.add("border-red-500")
        return;
    }

    // ENVIAR PARA API DO ZAP
    const cartItems = cart.map((item) => {
        return (
            ` ${item.name} Quantidade: (${item.quantity}) Preço: R$${item.price} | `
        )
    }).join("")

    const message = encodeURIComponent(cartItems)
    // NUMERO DO CELULAR
    const phone = "#"

    window.open(`https://wa.me/${phone}?text=${message}Endereço: ${addressInput.value}`, "_blank")

    cart = [];
    updateCartModal();

    
})

// VERIFICAR HORÁRIO DO ESTABELECIMENTO
function checkrestaurantOpen(){
    const data = new Date();
    const hora = data.getHours();
    // Horário: 18:00h (hora >= 18) até 22:00h (hora < 22)
    return hora >= 18 && hora < 22; 
}

const spanItem = document.getElementById("date-span")
const logoImg = document.getElementById("logo-img")
const statusText = document.getElementById("status-text")
const isOpen = checkrestaurantOpen();

// LÓGICA DE MUDANÇA DE COR E TEXTO
if(isOpen){
    // Aberto (Verde): Placa e Borda do Logo
    spanItem.classList.remove("bg-red-600");
    spanItem.classList.add("bg-green-700")

    logoImg.classList.remove("border-red-600");
    logoImg.classList.add("border-green-700")
    
    statusText.textContent = "ABERTO";
}else{
    // Fechado (Vermelho): Placa e Borda do Logo
    spanItem.classList.remove("bg-green-700")
    spanItem.classList.add("bg-red-600")
    
    logoImg.classList.remove("border-green-700")
    logoImg.classList.add("border-red-600")
    
    statusText.textContent = "FECHADO";
}