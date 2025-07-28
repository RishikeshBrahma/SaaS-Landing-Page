document.addEventListener('DOMContentLoaded', function() {
    const projectModal = document.getElementById('add-project-modal');
    const openModalBtn = document.getElementById('add-project-btn');
    // ## FIXED: Changed '.close-btn' to the correct '.close-button' class ##
    const closeModalBtn = projectModal.querySelector('.close-button'); 
    const projectForm = document.getElementById('add-project-form');

    function showModal() { 
        if (projectModal) projectModal.style.display = 'block'; 
    }
    function hideModal() { 
        if (projectModal) projectModal.style.display = 'none'; 
    }

    if (openModalBtn) {
        openModalBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showModal();
        });
    }
    
    // This was the line that was causing the error. It's now fixed.
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', hideModal);
    }

    window.addEventListener('click', (e) => {
        if (e.target == projectModal) {
            hideModal();
        }
    });

    if (projectForm) {
        projectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const projectName = document.getElementById('project-name').value;
            if (!projectName) return;

            try {
                const response = await fetch('/projects', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: projectName })
                });

                if (response.ok) {
                    // Reload the page to show the new project
                    window.location.reload();
                } else {
                    const data = await response.json();
                    alert(`Error: ${data.error || 'Could not create project.'}`);
                }
            } catch (error) {
                console.error('Error creating project:', error);
            }
        });
    }
});