document.addEventListener('DOMContentLoaded', function () {
    // --- Modal Handling ---
    const signupModal = document.getElementById('signup-modal');
    const loginModal = document.getElementById('login-modal');

    // All buttons that should open the signup modal
    const openSignupBtns = [
        document.getElementById('signup-btn-nav'),
        document.getElementById('get-started-btn')
    ];
    // All buttons that should open the login modal
    const openLoginBtn = document.getElementById('login-btn-nav');
    
    const closeBtns = document.querySelectorAll('.close-btn');

    function openModal(modal) {
        if (modal) modal.style.display = 'block';
    }

    function closeModal(modal) {
        if (modal) modal.style.display = 'none';
    }

    // Attach event listeners for all signup buttons
    openSignupBtns.forEach(btn => {
        if (btn) btn.addEventListener('click', (e) => {
            e.preventDefault();
            openModal(signupModal);
        });
    });

    // Attach event listener for login button
    if(openLoginBtn) openLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openModal(loginModal);
    });

    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            closeModal(signupModal);
            closeModal(loginModal);
        });
    });

    window.addEventListener('click', function (e) {
        if (e.target == signupModal) closeModal(signupModal);
        if (e.target == loginModal) closeModal(loginModal);
    });

    // --- Form Submissions (Confirmed to be working with fixed HTML) ---

    // Handle Signup
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const form = e.target;
            const name = form.querySelector('input[name="name"]').value;
            const email = form.querySelector('input[name="email"]').value;
            const password = form.querySelector('input[name="password"]').value;

            if (!name || !email || !password) {
                alert('All fields are required.');
                return;
            }

            fetch('/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password }),
            })
            .then(response => {
                if (!response.ok) {
                    // Get the error message from the server response
                    return response.json().then(err => { throw new Error(err.message) });
                }
                return response.json();
            })
            .then(data => {
                alert(data.message);
                if (data.status === 'success') {
                    closeModal(signupModal);
                    form.reset();
                    // Optionally open the login modal automatically
                    openModal(loginModal); 
                }
            })
            .catch(error => {
                console.error('Signup Error:', error);
                alert(`Error: ${error.message}`);
            });
        });
    }

    // Handle Login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const form = e.target;
            const email = form.querySelector('input[name="email"]').value;
            const password = form.querySelector('input[name="password"]').value;

            if (!email || !password) {
                alert('Email and password are required.');
                return;
            }

            fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    // Redirect to the projects page on successful login
                    window.location.href = data.redirect_url;
                } else {
                    alert(data.message);
                }
            })
            .catch(error => console.error('Login Error:', error));
        });
    }
});