document.addEventListener('DOMContentLoaded', function() {
    // --- Element Selectors ---
    const taskModal = document.getElementById('task-modal');
    const openModalBtn = document.getElementById('open-task-modal-btn');
    const closeModalBtn = taskModal.querySelector('.close-btn');
    const taskForm = document.getElementById('task-form');
    const modalTitle = document.getElementById('modal-title');
    const taskIdInput = document.getElementById('task-id');
    const taskContentInput = document.getElementById('task-content');
    const taskPriorityInput = document.getElementById('task-priority');
    const taskDueDateInput = document.getElementById('task-due-date');
    const subtaskSection = document.getElementById('subtask-section');
    const subtaskList = document.getElementById('subtask-list');
    const addSubtaskForm = document.getElementById('add-subtask-form');
    const subtaskContentInput = document.getElementById('subtask-content');
    const searchInput = document.getElementById('search-input');
    const filterButtonContainer = document.querySelector('.filter-buttons');
    const columns = {
        todo: document.getElementById('tasks-todo'),
        inprogress: document.getElementById('tasks-inprogress'),
        done: document.getElementById('tasks-done')
    };

    // --- State Management ---
    let allTasks = {}; // Cache for all tasks fetched from the server
    let activePriorityFilter = 'all'; // Current active priority filter

    // --- Modal Logic ---
    function showModalForAdd() {
        taskForm.reset();
        taskIdInput.value = '';
        modalTitle.textContent = 'Add New Task';
        subtaskSection.style.display = 'none';
        taskModal.style.display = 'block';
    }

    function showModalForEdit(task) {
        taskForm.reset();
        taskIdInput.value = task.id;
        modalTitle.textContent = 'Edit Task';
        taskContentInput.value = task.content;
        taskPriorityInput.value = task.priority;
        taskDueDateInput.value = task.due_date || '';
        subtaskSection.style.display = 'block';
        renderSubtasks(task.subtasks || []);
        taskModal.style.display = 'block';
    }

    function hideModal() { taskModal.style.display = 'none'; }
    openModalBtn.addEventListener('click', showModalForAdd);
    closeModalBtn.addEventListener('click', hideModal);
    window.addEventListener('click', (e) => { if (e.target == taskModal) hideModal(); });

    // --- Rendering Logic ---
    function createTaskCard(task) {
        const card = document.createElement('li');
        card.className = `task-card priority-${task.priority}`;
        card.dataset.taskId = task.id;
        card.draggable = true;
        const subtasks = task.subtasks || [];
        const completedSubtasks = subtasks.filter(st => st.is_complete).length;
        const progressPercent = subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : 0;
        card.innerHTML = `
            <p>${task.content}</p>
            ${subtasks.length > 0 ? `<div class="task-progress"><div class="progress-bar" style="width: ${progressPercent}%;"></div></div><div class="task-meta" style="font-size: 0.75rem;">${completedSubtasks}/${subtasks.length} completed</div>` : ''}
            <div class="task-meta"><span class="due-date">${task.due_date ? `Due: ${task.due_date}` : ''}</span><span class="created-date">Created: ${task.created_at}</span></div>
            <div class="task-meta" style="margin-top: 5px;"><span class="priority-badge">${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span><button class="delete-btn">×</button></div>`;
        return card;
    }

    function renderSubtasks(subtasks) {
        subtaskList.innerHTML = '';
        subtasks.forEach(st => {
            const li = document.createElement('li');
            li.className = `subtask-item ${st.is_complete ? 'completed' : ''}`;
            li.dataset.subtaskId = st.id;
            li.innerHTML = `<input type="checkbox" ${st.is_complete ? 'checked' : ''}><span>${st.content}</span>`;
            subtaskList.appendChild(li);
        });
    }

    // NEW: Renders tasks based on current filters
    function renderFilteredTasks() {
        const searchTerm = searchInput.value.toLowerCase();
        
        // Clear all columns before rendering
        Object.values(columns).forEach(col => col.innerHTML = '');

        for (const status in allTasks) {
            if (columns[status]) {
                allTasks[status].forEach(task => {
                    // Apply search and priority filters
                    const matchesSearch = task.content.toLowerCase().includes(searchTerm);
                    const matchesPriority = activePriorityFilter === 'all' || task.priority === activePriorityFilter;

                    if (matchesSearch && matchesPriority) {
                        const card = createTaskCard(task);
                        columns[status].appendChild(card);
                    }
                });
            }
        }
    }

    async function fetchAndRenderAll() {
        try {
            const response = await fetch('/tasks');
            if (!response.ok) throw new Error('Failed to fetch tasks');
            allTasks = await response.json(); // Store all tasks in the cache
            renderFilteredTasks(); // Render based on current filters
        } catch (error) { console.error('Error:', error); }
    }

    // --- Form & Event Handlers ---
    taskForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const taskId = taskIdInput.value;
        const taskData = { content: taskContentInput.value, priority: taskPriorityInput.value, due_date: taskDueDateInput.value };
        if (!taskData.content) return;
        const url = taskId ? `/tasks/${taskId}` : '/tasks';
        const method = taskId ? 'PUT' : 'POST';
        try {
            const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(taskData) });
            if (response.ok) { hideModal(); fetchAndRenderAll(); } 
            else { alert(`Failed to ${taskId ? 'update' : 'add'} task.`); }
        } catch (error) { console.error('Error:', error); }
    });

    addSubtaskForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const taskId = taskIdInput.value;
        const content = subtaskContentInput.value.trim();
        if (!content || !taskId) return;
        try {
            const response = await fetch('/subtasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, task_id: taskId }) });
            if (response.ok) {
                subtaskContentInput.value = '';
                fetchAndRenderAll();
                const updatedTaskResponse = await fetch('/tasks');
                const groupedTasks = await updatedTaskResponse.json();
                for (const status in groupedTasks) {
                    const task = groupedTasks[status].find(t => t.id == taskId);
                    if (task) { renderSubtasks(task.subtasks); break; }
                }
            } else { alert('Failed to add sub-task.'); }
        } catch (error) { console.error('Error:', error); }
    });
    
    subtaskList.addEventListener('change', async function(e) {
        if (e.target.type === 'checkbox') {
            const subtaskItem = e.target.closest('.subtask-item');
            const subtaskId = subtaskItem.dataset.subtaskId;
            const is_complete = e.target.checked;
            try {
                await fetch(`/subtasks/${subtaskId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_complete }) });
                fetchAndRenderAll();
                subtaskItem.classList.toggle('completed', is_complete);
            } catch (error) { console.error('Error updating subtask:', error); }
        }
    });

    document.querySelector('.kanban-board').addEventListener('click', (e) => {
        const card = e.target.closest('.task-card');
        if (!card) return;
        const taskId = card.dataset.taskId;
        if (e.target.classList.contains('delete-btn')) {
            e.stopPropagation();
            if (confirm('Are you sure you want to delete this task?')) {
                fetch(`/tasks/${taskId}`, { method: 'DELETE' }).then(fetchAndRenderAll).catch(err => console.error('Delete Error:', err));
            }
            return;
        }
        const flatTasks = Object.values(allTasks).flat();
        const taskToEdit = flatTasks.find(t => t.id == taskId);
        if (taskToEdit) showModalForEdit(taskToEdit);
    });

    // --- NEW: Filter and Search Event Listeners ---
    searchInput.addEventListener('input', renderFilteredTasks);

    filterButtonContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            document.querySelector('.filter-btn.active').classList.remove('active');
            e.target.classList.add('active');
            activePriorityFilter = e.target.dataset.priority;
            renderFilteredTasks();
        }
    });

    // --- Drag and Drop Logic ---
    let draggedCard = null;
    document.querySelectorAll('.task-cards').forEach(list => {
        list.addEventListener('dragstart', (e) => { if (e.target.classList.contains('task-card')) { draggedCard = e.target; setTimeout(() => e.target.classList.add('dragging'), 0); } });
        list.addEventListener('dragend', () => { if (draggedCard) { draggedCard.classList.remove('dragging'); draggedCard = null; } });
    });
    document.querySelectorAll('.kanban-column').forEach(column => {
        column.addEventListener('dragover', (e) => e.preventDefault());
        column.addEventListener('drop', async (e) => {
            e.preventDefault();
            if (draggedCard) {
                const newStatus = column.dataset.status;
                const taskId = draggedCard.dataset.taskId;
                column.querySelector('.task-cards').appendChild(draggedCard);
                try {
                    await fetch(`/tasks/${taskId}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
                    fetchAndRenderAll(); // Refresh the main data cache
                } catch (error) { console.error('Error updating status:', error); fetchAndRenderAll(); }
            }
        });
    });
    
    // --- Initial Load ---
    fetchAndRenderAll();
});
