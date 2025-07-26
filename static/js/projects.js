document.addEventListener('DOMContentLoaded', function() {
    const projectModal = document.getElementById('project-modal');
    const openModalBtn = document.getElementById('open-project-modal-btn');
    const closeModalBtn = projectModal.querySelector('.close-btn');
    const projectForm = document.getElementById('project-form');

    function showModal() { projectModal.style.display = 'block'; }
    function hideModal() { projectModal.style.display = 'none'; }

    openModalBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showModal();
    });
    closeModalBtn.addEventListener('click', hideModal);
    window.addEventListener('click', (e) => {
        if (e.target == projectModal) hideModal();
    });

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
                // Simply reload the page to show the new project
                window.location.reload();
            } else {
                const data = await response.json();
                alert(`Error: ${data.error || 'Could not create project.'}`);
            }
        } catch (error) {
            console.error('Error creating project:', error);
        }
    });
});
