document.addEventListener('DOMContentLoaded', function () {
    // --- Modal Handling ---
    const signupModal = document.getElementById('signup-modal');
    const loginModal = document.getElementById('login-modal');

    const openSignupBtns = document.querySelectorAll('.open-signup-modal-btn');
    const openLoginBtn = document.getElementById('open-login-modal-btn');
    
    const closeBtns = document.querySelectorAll('.close-btn');

    function openModal(modal) {
        if (modal) modal.style.display = 'block';
    }

    function closeModal(modal) {
        if (modal) modal.style.display = 'none';
    }

    openSignupBtns.forEach(btn => btn.addEventListener('click', (e) => {
        e.preventDefault();
        openModal(signupModal);
    }));

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

    // --- Form Submissions ---

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
            .then(response => response.json())
            .then(data => {
                alert(data.message);
                if (data.status === 'success') {
                    closeModal(signupModal);
                    form.reset();
                }
            })
            .catch(error => console.error('Signup Error:', error));
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
                    // UPDATED: Redirect to the URL provided by the server
                    window.location.href = data.redirect_url;
                } else {
                    alert(data.message);
                }
            })
            .catch(error => console.error('Login Error:', error));
        });
    }


    // Handle Subscription
    const subscriptionForm = document.getElementById('subscription-form');
    if (subscriptionForm) {
        subscriptionForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const form = e.target;
            const email = form.querySelector('input[name="email"]').value;
            if (!email) {
                alert('Email is required');
                return;
            }
            fetch('/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email }),
            })
            .then(response => response.json())
            .then(data => {
                alert(data.message);
                if (data.status === 'success') form.reset();
            })
            .catch(error => console.error('Subscription Error:', error));
        });
    }
});
