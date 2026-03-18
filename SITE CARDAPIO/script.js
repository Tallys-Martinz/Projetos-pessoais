// ===== SELETORES DE ELEMENTOS =====
const menu = document.getElementById("menu");
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
const paymentMethodInput = document.getElementById("payment-method");

let cart = [];

// STATUS DA LOJA
function checkOpen() {
    const statusManual = localStorage.getItem("statusLoja");

    if (statusManual === "fechado") return false;
    if (statusManual === "aberto") return true;

    // horário funcionamento (18h às 22h)
    const hora = new Date().getHours();
    return hora >= 18 && hora < 22;
}

function updateHeaderStatus() {
    if (!statusText || !spanHora) {
        console.warn("⚠️ Elementos de status não encontrados no DOM");
        return;
    }

    const isOpen = checkOpen();

    if (isOpen) {
        // Loja aberta: estilo verde
        spanHora.classList.remove("bg-red-500");
        spanHora.classList.add("bg-green-600");
        statusText.innerText = "ABERTO ✅";
    } else {
        // Loja fechada: estilo vermelho
        spanHora.classList.remove("bg-green-600");
        spanHora.classList.add("bg-red-500");
        statusText.innerText = "FECHADO 🔒";
    }
}

// Status em tempo real
window.addEventListener('storage', (e) => {
    if (e.key === 'statusLoja') {
        updateHeaderStatus();
    }
});

// Carrinho
if (cartBtn) {
    cartBtn.addEventListener("click", function () {
        updateHeaderStatus();

        cartModal.style.display = "flex";
        updateCartModal();
    });
}

if (cartModal) {
    cartModal.addEventListener("click", function (event) {
        if (event.target === cartModal) {
            cartModal.style.display = "none";
        }
    });
}

if (closeModalBtn) {
    closeModalBtn.addEventListener("click", function () {
        cartModal.style.display = "none";
    });
}

// LÓGICA DO CARRINHO
if (menu) {
    menu.addEventListener("click", function (event) {
        const parentButton = event.target.closest(".add-to-cart-btn");
        if (parentButton) {
            const name = parentButton.getAttribute("data-name");
            const price = parseFloat(parentButton.getAttribute("data-price"));
            addToCart(name, price);
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
            text: `"${name}" adicionado!`,
            duration: 3000,
            style: { background: "#16a34a", borderRadius: "8px" }
        }).showToast();
    }
}

function updateCartModal() {
    if (!cartItemsContainer) return;

    cartItemsContainer.innerHTML = "";
    let total = 0;

    cart.forEach(item => {
        const cartItemElement = document.createElement("div");
        cartItemElement.classList.add("flex", "justify-between", "mb-4", "flex-col");
        cartItemElement.innerHTML = `
            <div class="flex items-center justify-between">
                <div>
                    <p class="font-medium">${item.name}</p>
                    <p>Qtd: ${item.quantity}</p> 
                    <p class="font-medium mt-2">R$ ${item.price.toFixed(2)}</p>
                </div>
                <button class="remove-from-cart-btn text-red-500 hover:text-red-700 font-medium" data-name="${item.name}">
                    Remover
                </button>
            </div>`;

        total += item.price * item.quantity;
        cartItemsContainer.appendChild(cartItemElement);
    });

    if (cartTotal) {
        cartTotal.textContent = total.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    }

    if (cartCounter) {
        cartCounter.innerHTML = cart.length;
    }
}

// REMOVER ITENS DO CARRINHO
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

// SALVAR PEDIDO NO SISTEMA
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

// FINALIZAR PEDIDO
if (checkoutBtn) {

    function enviarParaWhatsApp(pedido) {
        // NUMERO DA LOJA
        const numeroLoja = "5562985044345";

        const itensFormatados = pedido.itens.split(" | ").map(item => `• ${item.trim()}`).join("\n");

        const mensagem = `
*🛒 NOVO PEDIDO - ${pedido.id}*

👤 *Cliente:* ${pedido.cliente}
📍 *Endereço:* ${pedido.endereco}

🍔 *Itens:*
${itensFormatados}

💰 *Total:* ${pedido.total}
⏰ *Horário:* ${pedido.hora}
💳 *Pagamento:* ${pedido.pagamento}

_Obrigado pela preferência!_ 🙌
`.trim();

        // Limpar número e criar URL ✅ SEM ESPAÇOS
        const numeroLimpo = numeroLoja.replace(/\D/g, '');
        const url = `https://wa.me/${numeroLimpo}?text=${encodeURIComponent(mensagem)}`;

        // Abrir Zap com tratamento de pop-up
        const novaAba = window.open(url, "_blank");
        if (!novaAba) {
            alert("⚠️ Pop-up bloqueado! Permita pop-ups para este site e clique em 'Finalizar' novamente.");
        }
    }

    checkoutBtn.addEventListener("click", function () {

        // 🔒 1ª TRAVA: Verifica se loja está aberta
        if (!checkOpen()) {
            if (typeof Toastify !== 'undefined') {
                Toastify({
                    text: "Ops! A loja está fechada no momento.",
                    duration: 5000,
                    style: { background: "#ef4444", borderRadius: "8px" }
                }).showToast();
            } else {
                alert("Loja fechada no momento!");
            }
            return;
        }

        // 🔒 2ª TRAVA: Carrinho não pode estar vazio
        if (cart.length === 0) {
            if (typeof Toastify !== 'undefined') {
                Toastify({
                    text: "Seu carrinho está vazio!",
                    duration: 3000,
                    style: { background: "#f59e0b" }
                }).showToast();
            }
            return;
        }

        // 🔒 3ª TRAVA: Valida nome e endereço
        let hasError = false;

        if (clientNameInput && clientNameInput.value.trim() === "") {
            if (nameWarn) nameWarn.classList.remove("hidden");
            hasError = true;
        } else if (nameWarn) {
            nameWarn.classList.add("hidden");
        }

        if (addressInput && addressInput.value.trim() === "") {
            if (addressWarn) addressWarn.classList.remove("hidden");
            hasError = true;
        } else if (addressWarn) {
            addressWarn.classList.add("hidden");
        }

        if (paymentMethodInput && paymentMethodInput.value.trim() === "") {
            alert("Por favor, selecione uma forma de pagamento.");
            hasError = true;
        }

        if (hasError) {
            alert("Por favor, preencha todos os campos para continuar.");
            return;
        }

        if (hasError) {
            alert("Por favor, preencha seu nome e endereço para continuar.");
            return;
        }

        // ✅ Cria e salva o pedido
        const cartItems = cart.map((item) =>
            `${item.name} (${item.quantity})`
        ).join(" | ");

        const pagamentoSelecionado = paymentMethodInput?.value || "Não informado";

        const novoPedido = {
            id: Math.floor(Math.random() * 9000) + 1000,
            cliente: clientNameInput.value.trim(),
            endereco: addressInput.value.trim(),
            itens: cartItems,
            total: cartTotal?.textContent || "R$ 0,00",
            hora: new Date().toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            }),
            pagamento: pagamentoSelecionado,
            status: "novo"
        };

        const salvo = salvarPedidoNoSistema(novoPedido);

        if (salvo) {
            // 🎉 Feedback visual
            if (typeof Toastify !== 'undefined') {
                Toastify({
                    text: "✅ Pedido enviado com sucesso!",
                    duration: 4000,
                    style: { background: "#16a34a" }
                }).showToast();
            }

            // 📱 ENVIAR PARA WHATSAPP (NOVO!)
            enviarParaWhatsApp(novoPedido);

            // 🧹 Limpa carrinho e formulário
            cart = [];
            if (clientNameInput) clientNameInput.value = "";
            if (addressInput) addressInput.value = "";
            updateCartModal();

            // 🚪 Fecha modal
            if (cartModal) {
                cartModal.style.display = "none";
            }
        } else {
            alert("Erro ao salvar pedido. Tente novamente.");
        }
    });
}

function initClientPage() {
    // Atualiza status do cabeçalho
    updateHeaderStatus();

    // Atualiza contador do carrinho
    if (cartCounter) {
        cartCounter.innerHTML = cart.length;
    }

    console.log("✅ Página do cliente inicializada");
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initClientPage);
} else {
    initClientPage();
}
