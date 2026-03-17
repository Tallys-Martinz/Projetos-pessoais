/**
 * 🔐 Admin Auth Module - Versão Simplificada
 * Integração: inclua este script APÓS o DOM carregar
 */

const AdminAuth = (() => {
    // Configurações
    const CONFIG = {
        PASSWORD: "1234",              // ⚠️ Troque em produção!
        STORAGE_KEY: "devburguer_admin",
        SESSION_HOURS: 24
    };

    // Elementos do DOM
    let modal, form, input, error, openBtn;

    // Verifica se sessão é válida
    function isValidSession() {
        try {
            const data = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY));
            if (!data || !data.token || !data.expires) return false;
            return data.token === CONFIG.PASSWORD && Date.now() < data.expires;
        } catch {
            return false;
        }
    }

    // Salva nova sessão
    function createSession() {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify({
            token: CONFIG.PASSWORD,
            expires: Date.now() + (CONFIG.SESSION_HOURS * 60 * 60 * 1000)
        }));
    }

    // Limpa sessão
    function clearSession() {
        localStorage.removeItem(CONFIG.STORAGE_KEY);
    }

    // Abre modal
    function openModal() {
        if (!modal) return;
        modal.classList.remove('hidden');
        setTimeout(() => {
            input?.focus();
            input?.select();
        }, 100);
        document.body.style.overflow = 'hidden';
    }

    // Fecha modal
    function closeModal() {
        if (!modal) return;
        modal.classList.add('hidden');
        document.body.style.overflow = '';
        // Limpa campos
        if (input) input.value = '';
        if (error) error.classList.add('hidden');
    }

    // Handler do formulário
    function handleSubmit(e) {
        e.preventDefault();
        if (!input) return;
        
        const value = input.value.trim();
        
        if (value === CONFIG.PASSWORD) {
            createSession();
            closeModal();
            // Recarrega painel se estiver na página admin
            if (location.pathname.includes('admin')) {
                location.reload();
            }
        } else {
            if (error) {
                error.classList.remove('hidden');
                input.classList.add('border-red-400');
                setTimeout(() => input.classList.remove('border-red-400'), 1500);
            }
            input.select();
        }
    }

    // Inicializa módulo
    function init() {
        // Cache dos elementos
        modal = document.getElementById('admin-login');
        form = document.getElementById('login-form');
        input = document.getElementById('admin-pass');
        error = document.getElementById('login-error');
        openBtn = document.getElementById('open-admin-login');

        // Event listeners
        if (form) form.addEventListener('submit', handleSubmit);
        if (openBtn) openBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (isValidSession()) {
                location.href = 'admin.html';
            } else {
                openModal();
            }
        });

        // Fecha com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
                closeModal();
            }
        });

        // Auto-check em páginas admin
        if (location.pathname.includes('admin.html') || location.pathname.includes('admin')) {
            if (!isValidSession()) {
                openModal();
            }
            // Atualiza botão "Sair"
            const logoutLink = document.querySelector('a[href="index.html"]');
            if (logoutLink) {
                logoutLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    logout();
                });
            }
        }
    }

    // Funções públicas
    return {
        init,
        openModal,
        closeModal,
        logout: () => { clearSession(); location.href = 'index.html'; },
        isAuthenticated: isValidSession
    };
})();

// Helpers globais (para onclick no HTML)
function closeLoginModal() { AdminAuth.closeModal(); }
function handleLogin(e) { AdminAuth.init(); } // Garante inicialização
function logout() { AdminAuth.logout(); }

// Inicializa quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AdminAuth.init());
} else {
    AdminAuth.init();
}