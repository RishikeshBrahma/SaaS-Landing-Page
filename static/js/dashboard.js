document.addEventListener('DOMContentLoaded', function() {
    // --- Element Selectors & Initial State ---
    const mainContainer = document.querySelector('.container[data-project-id]');
    if (!mainContainer) {
        console.error("Fatal Error: Project ID is missing from the page.");
        return;
    }
    const project_id = mainContainer.dataset.projectId;

    // Task Modal Elements
    const taskModal = document.getElementById('task-modal');
    const openTaskModalBtn = document.getElementById('open-task-modal-btn');
    const closeTaskModalBtn = taskModal.querySelector('.close-btn');
    const taskForm = document.getElementById('task-form');
    const modalTitle = document.getElementById('modal-title');
    const taskIdInput = document.getElementById('task-id');
    const taskContentInput = document.getElementById('task-content');
    const taskPriorityInput = document.getElementById('task-priority');
    const taskDueDateInput = document.getElementById('task-due-date');
    const taskAssigneeInput = document.getElementById('task-assignee');
    const subtaskSection = document.getElementById('subtask-section');
    const subtaskList = document.getElementById('subtask-list');
    const addSubtaskForm = document.getElementById('add-subtask-form');
    const subtaskContentInput = document.getElementById('subtask-content');

    // Manage Modal Elements
    const manageModal = document.getElementById('manage-modal');
    const openManageModalBtn = document.getElementById('open-manage-modal-btn');
    const closeManageModalBtn = manageModal.querySelector('.close-btn');
    const membersList = document.getElementById('members-list');
    const inviteForm = document.getElementById('invite-form');

    // Other UI Elements
    const searchInput = document.getElementById('search-input');
    const filterButtonContainer = document.querySelector('.filter-buttons');
    const columns = {
        todo: document.getElementById('tasks-todo'),
        inprogress: document.getElementById('tasks-inprogress'),
        done: document.getElementById('tasks-done')
    };

    let allTasks = {};
    let boardMembers = [];
    let activePriorityFilter = 'all';

    // --- Modal Logic ---
    function showModal(modal) { if (modal) modal.style.display = 'block'; }
    function hideModal(modal) { if (modal) modal.style.display = 'none'; }

    async function populateAssigneeDropdown() {
        try {
            const response = await fetch(`/projects/${project_id}/members`);
            boardMembers = await response.json();
            taskAssigneeInput.innerHTML = '<option value="">Unassigned</option>';
            boardMembers.forEach(member => {
                const option = document.createElement('option');
                option.value = member.user_id;
                option.textContent = member.name;
                taskAssigneeInput.appendChild(option);
            });
        } catch (error) {
            console.error("Could not load board members:", error);
        }
    }

    function showModalForAdd() {
        taskForm.reset();
        taskIdInput.value = '';
        modalTitle.textContent = 'Add New Task';
        subtaskSection.style.display = 'none';
        populateAssigneeDropdown();
        showModal(taskModal);
    }

    function showModalForEdit(task) {
        taskForm.reset();
        taskIdInput.value = task.id;
        modalTitle.textContent = 'Edit Task';
        taskContentInput.value = task.content;
        taskPriorityInput.value = task.priority;
        taskDueDateInput.value = task.due_date || '';
        populateAssigneeDropdown().then(() => {
            taskAssigneeInput.value = task.assignee_id || '';
        });
        subtaskSection.style.display = 'block';
        renderSubtasks(task.subtasks || []);
        showModal(taskModal);
    }
    
    if (openTaskModalBtn) openTaskModalBtn.addEventListener('click', showModalForAdd);
    if (closeTaskModalBtn) closeTaskModalBtn.addEventListener('click', () => hideModal(taskModal));
    
    if (openManageModalBtn) openManageModalBtn.addEventListener('click', () => {
        showModal(manageModal);
        fetchAndRenderMembers();
    });
    if (closeManageModalBtn) closeManageModalBtn.addEventListener('click', () => hideModal(manageModal));
    
    window.addEventListener('click', (e) => {
        if (e.target == taskModal) hideModal(taskModal);
        if (e.target == manageModal) hideModal(manageModal);
    });

    // --- Member Management ---
    async function fetchAndRenderMembers() {
        try {
            const response = await fetch(`/projects/${project_id}/members`);
            if (!response.ok) throw new Error('Could not fetch members');
            const members = await response.json();
            membersList.innerHTML = '';
            members.forEach(member => {
                const li = document.createElement('li');
                li.className = 'member-item';
                li.innerHTML = `<span>${member.name} (${member.email})</span><span class="member-role">${member.role}</span>`;
                membersList.appendChild(li);
            });
        } catch (error) { console.error('Error fetching members:', error); }
    }

    if (inviteForm) {
        inviteForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('invite-email');
            const email = emailInput.value;
            if (!email) return;
            try {
                const response = await fetch(`/projects/${project_id}/members`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
                const data = await response.json();
                alert(data.message || data.error);
                if (response.ok) {
                    emailInput.value = '';
                    fetchAndRenderMembers();
                }
            } catch (error) { console.error('Error inviting member:', error); }
        });
    }

    // --- Task & Board Logic ---
    function createTaskCard(task) {
        const card = document.createElement('li');
        card.className = `task-card priority-${task.priority}`;
        card.dataset.taskId = task.id;
        card.draggable = true;
        const subtasks = task.subtasks || [];
        const completedSubtasks = subtasks.filter(st => st.is_complete).length;
        const progressPercent = subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : 0;
        const assigneeName = task.assignee_name || '';
        const assigneeInitials = assigneeName ? assigneeName.split(' ').map(n => n[0]).join('').toUpperCase() : '';

        card.innerHTML = `
            <p>${task.content}</p>
            ${subtasks.length > 0 ? `<div class="task-progress"><div class="progress-bar" style="width: ${progressPercent}%;"></div></div><div class="task-meta" style="font-size: 0.75rem;">${completedSubtasks}/${subtasks.length} completed</div>` : ''}
            <div class="task-meta">
                <span class="due-date">${task.due_date ? `Due: ${task.due_date}` : ''}</span>
                <span class="created-date">Created: ${task.created_at}</span>
            </div>
            <div class="task-meta" style="margin-top: 5px; justify-content: space-between;">
                 <span class="priority-badge">${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span>
                 <div class="assignee-info">
                    ${assigneeName ? `<div class="assignee-avatar" title="${assigneeName}">${assigneeInitials}</div>` : ''}
                 </div>
                 <button class="delete-btn">×</button>
            </div>`;
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

    function renderFilteredTasks() {
        const searchTerm = searchInput.value.toLowerCase();
        Object.values(columns).forEach(col => col.innerHTML = '');
        for (const status in allTasks) {
            if (columns[status]) {
                allTasks[status].forEach(task => {
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
            const response = await fetch(`/projects/${project_id}/tasks`);
            if (!response.ok) throw new Error('Failed to fetch tasks');
            allTasks = await response.json();
            renderFilteredTasks();
        } catch (error) { console.error('Error:', error); }
    }

    taskForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const taskId = taskIdInput.value;
        const taskData = { content: taskContentInput.value, priority: taskPriorityInput.value, due_date: taskDueDateInput.value, assignee_id: taskAssigneeInput.value };
        if (!taskData.content) return;
        const url = taskId ? `/projects/${project_id}/tasks/${taskId}` : `/projects/${project_id}/tasks`;
        const method = taskId ? 'PUT' : 'POST';
        try {
            const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(taskData) });
            if (response.ok) { hideModal(taskModal); fetchAndRenderAll(); } 
            else { alert(`Failed to ${taskId ? 'update' : 'add'} task.`); }
        } catch (error) { console.error('Error:', error); }
    });

    addSubtaskForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const taskId = taskIdInput.value;
        const content = subtaskContentInput.value.trim();
        if (!content || !taskId) return;
        try {
            const response = await fetch(`/projects/${project_id}/subtasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, task_id: taskId }) });
            if (response.ok) {
                subtaskContentInput.value = '';
                const newSubtask = await response.json();
                const task = Object.values(allTasks).flat().find(t => t.id == taskId);
                if (task) {
                    task.subtasks.push(newSubtask);
                    renderSubtasks(task.subtasks);
                    fetchAndRenderAll();
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
                await fetch(`/projects/${project_id}/subtasks/${subtaskId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_complete }) });
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
                fetch(`/projects/${project_id}/tasks/${taskId}`, { method: 'DELETE' }).then(fetchAndRenderAll).catch(err => console.error('Delete Error:', err));
            }
            return;
        }
        const flatTasks = Object.values(allTasks).flat();
        const taskToEdit = flatTasks.find(t => t.id == taskId);
        if (taskToEdit) {
             showModalForEdit(taskToEdit);
        }
    });

    searchInput.addEventListener('input', renderFilteredTasks);
    filterButtonContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            document.querySelector('.filter-btn.active').classList.remove('active');
            e.target.classList.add('active');
            activePriorityFilter = e.target.dataset.priority;
            renderFilteredTasks();
        }
    });

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
                    await fetch(`/projects/${project_id}/tasks/${taskId}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
                    fetchAndRenderAll();
                } catch (error) { console.error('Error updating status:', error); fetchAndRenderAll(); }
            }
        });
    });
    
    fetchAndRenderAll();
});
