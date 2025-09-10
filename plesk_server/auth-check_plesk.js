// ====================================================
// SCRIPT DE VERIFICACIÓN DE AUTENTICACIÓN
// Archivo: public/assets/auth-check.js
// Incluir en todas las páginas protegidas
// ====================================================

let currentUser = null;
let isCheckingAuth = false;

// Verificar autenticación al cargar página
async function checkAuthentication() {
    if (isCheckingAuth) return;
    
    isCheckingAuth = true;
    
    try {
        console.log('🔐 Verificando autenticación...');
        
        const response = await fetch('/api/user', {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (response.status === 401) {
            console.log('❌ No hay sesión activa - Redirigiendo al login');
            redirectToLogin();
            return false;
        }

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.success && data.user) {
            console.log('✅ Usuario autenticado:', data.user.nombre);
            currentUser = data.user;
            updateUIWithUser(data.user);
            return true;
        } else {
            console.log('❌ Respuesta inválida del servidor');
            redirectToLogin();
            return false;
        }
        
    } catch (error) {
        console.error('🔥 Error verificando autenticación:', error);
        
        // Si es error de red, mostrar mensaje pero no redirigir
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showNetworkError();
            return false;
        }
        
        // Para otros errores, redirigir al login
        redirectToLogin();
        return false;
    } finally {
        isCheckingAuth = false;
    }
}

// Redirigir al login
function redirectToLogin() {
    console.log('🔄 Redirigiendo al login...');
    
    // Limpiar cualquier dato de usuario
    currentUser = null;
    
    // Redirigir preservando la URL actual para volver después del login
    const currentPath = window.location.pathname + window.location.search;
    const redirectUrl = encodeURIComponent(currentPath);
    
    window.location.href = `/login.html?redirect=${redirectUrl}`;
}

// Actualizar UI con información del usuario
function updateUIWithUser(user) {
    // Actualizar nombre de usuario en la interfaz
    const userNameElements = document.querySelectorAll('[data-user-name]');
    userNameElements.forEach(el => {
        el.textContent = user.nombre;
    });
    
    // Actualizar email
    const userEmailElements = document.querySelectorAll('[data-user-email]');
    userEmailElements.forEach(el => {
        el.textContent = user.email;
    });
    
    // Actualizar rol
    const userRolElements = document.querySelectorAll('[data-user-rol]');
    userRolElements.forEach(el => {
        el.textContent = user.rol;
    });
    
    // Actualizar empresa
    const userEmpresaElements = document.querySelectorAll('[data-user-empresa]');
    userEmpresaElements.forEach(el => {
        el.textContent = user.empresa;
    });
    
    // Mostrar/ocultar elementos según rol
    if (user.rol === 'admin') {
        document.querySelectorAll('[data-admin-only]').forEach(el => {
            el.style.display = '';
        });
    } else {
        document.querySelectorAll('[data-admin-only]').forEach(el => {
            el.style.display = 'none';
        });
    }
}

// Mostrar error de red
function showNetworkError() {
    const errorHtml = `
        <div class="alert alert-warning alert-dismissible fade show" role="alert" style="position: fixed; top: 20px; right: 20px; z-index: 9999;">
            <i class="fas fa-exclamation-triangle me-2"></i>
            <strong>Sin conexión</strong> - Verificando conexión con el servidor...
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    // Remover alertas anteriores
    document.querySelectorAll('.alert').forEach(alert => alert.remove());
    
    // Agregar nueva alerta
    document.body.insertAdjacentHTML('afterbegin', errorHtml);
    
    // Auto-ocultar después de 5 segundos
    setTimeout(() => {
        document.querySelectorAll('.alert').forEach(alert => alert.remove());
    }, 5000);
}

// Interceptor para requests fallidos por autenticación
function setupAuthInterceptor() {
    // Wrap original fetch
    const originalFetch = window.fetch;
    
    window.fetch = async function(url, options = {}) {
        try {
            const response = await originalFetch(url, options);
            
            // Si es 401 y es una request a API, verificar auth
            if (response.status === 401 && url.includes('/api/')) {
                console.log('🔒 Request rechazada por falta de autenticación');
                
                // Intentar re-autenticar
                const isAuthenticated = await checkAuthentication();
                
                if (!isAuthenticated) {
                    return response; // Ya se manejó la redirección
                }
                
                // Re-intentar request original
                return await originalFetch(url, options);
            }
            
            return response;
            
        } catch (error) {
            console.error('🔥 Error en request:', error);
            throw error;
        }
    };
}

// Función de logout
async function logout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST',
            credentials: 'same-origin'
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Logout exitoso');
            window.location.href = '/login.html';
        } else {
            console.error('❌ Error en logout:', data.error);
            // Forzar redirección de todos modos
            window.location.href = '/login.html';
        }
        
    } catch (error) {
        console.error('🔥 Error en logout:', error);
        // Forzar redirección de todos modos
        window.location.href = '/login.html';
    }
}

// Inicialización automática cuando se carga el DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando verificación de autenticación...');
    
    // Configurar interceptor
    setupAuthInterceptor();
    
    // Verificar autenticación inmediatamente
    checkAuthentication().then(isAuthenticated => {
        if (isAuthenticated) {
            console.log('✅ Página cargada con usuario autenticado');
            
            // Configurar botones de logout si existen
            document.querySelectorAll('[data-logout]').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    logout();
                });
            });
            
            // Verificar sesión cada 5 minutos
            setInterval(() => {
                checkAuthentication();
            }, 5 * 60 * 1000);
        }
    });
});

// Exportar funciones para uso global
window.currentUser = () => currentUser;
window.checkAuth = checkAuthentication;
window.logout = logout;