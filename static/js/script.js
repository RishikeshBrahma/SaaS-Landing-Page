document.getElementById('get-started').addEventListener('click', function() {
    document.getElementById('signup-modal').style.display = 'block';
});

document.querySelector('.close').addEventListener('click', function() {
    document.getElementById('signup-modal').style.display = 'none';
});

let isSubmitting = false; // Prevent multiple submissions
document.getElementById('signup-form').addEventListener('submit', function(e) {
    e.preventDefault();
    if (isSubmitting) return;

    isSubmitting = true;
    const email = document.querySelector('input[name="email"]').value;
    const name = document.querySelector('input[name="name"]').value;
    console.log('Submitting:', { name, email }); // Debug log

    fetch('/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message || data.error);
        if (data.message) document.getElementById('signup-modal').style.display = 'none';
        isSubmitting = false;
    })
    .catch(error => {
        console.error('Fetch error:', error);
        alert('An error occurred. Please try again.');
        isSubmitting = false;
    });
});

document.getElementById('subscribe-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const email = document.querySelector('input[name="email"]').value;

    fetch('/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `email=${encodeURIComponent(email)}`
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message || data.error);
        if (data.message) document.querySelector('input[name="email"]').value = '';
    })
    .catch(error => alert('An error occurred. Please try again.'));
});