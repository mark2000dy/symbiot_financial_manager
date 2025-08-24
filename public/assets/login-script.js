    <script>
        // Manejo del formulario de login con API real
        document.getElementById('loginForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const rememberMe = document.getElementById('rememberMe').checked;
            const loginBtn = document.getElementById('loginBtn');
            const alertContainer = document.getElementById('alert-container');
            
            // Limpiar alertas anteriores
            alertContainer.innerHTML = '';
            
            // Mostrar loading
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Iniciando...';
            loginBtn.disabled = true;
            
            try {
                const response = await fetch('/gastos/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Guardar email si "recordarme" está marcado
                    if (rememberMe) {
                        localStorage.setItem('rememberedEmail', email);
                    } else {
                        localStorage.removeItem('rememberedEmail');
                    }
                    
                    // Mostrar mensaje de éxito
                    alertContainer.innerHTML = `
                        <div class="alert alert-success">
                            <i class="fas fa-check-circle me-2"></i>
                            ¡Bienvenido ${data.user.nombre}! Redirigiendo...
                        </div>
                    `;
                    
                    // Redirigir
                    setTimeout(() => {
                        window.location.href = data.redirectUrl || '/gastos/dashboard.html';
                    }, 1000);
                    
                } else {
                    throw new Error(data.error || 'Error en el login');
                }
                
            } catch (error) {
                console.error('Error en login:', error);
                
                alertContainer.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        ${error.message}
                    </div>
                `;
                
                // Resetear botón
                loginBtn.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i>Iniciar Sesión';
                loginBtn.disabled = false;
                
                // Focus en password
                document.getElementById('password').focus();
                document.getElementById('password').select();
            }
        });
        
        // Recordar email
        const rememberedEmail = localStorage.getItem('rememberedEmail');
        if (rememberedEmail) {
            document.getElementById('email').value = rememberedEmail;
            document.getElementById('rememberMe').checked = true;
        }
        
        // Focus inicial
        if (!document.getElementById('email').value) {
            document.getElementById('email').focus();
        } else {
            document.getElementById('password').focus();
        }
    </script>
