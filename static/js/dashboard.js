document.addEventListener('DOMContentLoaded', function() {
    const projectId = document.body.dataset.projectId;
    let members = [];
    let allTasks = {};
    let currentTaskId = null;

    if (!projectId) return;

    initializeApp();

    function initializeApp() {
        fetchMembers().then(fetchTasks);
        initializeSortable();
        setupEventListeners();
    }

    function initializeSortable() {
        if (typeof Sortable === 'undefined') return;
        const columns = document.querySelectorAll('.task-cards');
        columns.forEach(column => {
            new Sortable(column, {
                group: 'tasks',
                animation: 150,
                onEnd: function(evt) {
                    const taskId = evt.item.dataset.taskId;
                    const newStatus = evt.to.id.replace('-tasks', '');
                    updateTaskStatus(taskId, newStatus);
                }
            });
        });
    }

    function setupEventListeners() {
        document.getElementById('add-task-btn').onclick = () => showModal('add-task-modal');
        document.getElementById('manage-members-btn').onclick = () => showModal('members-modal');

        document.querySelectorAll('.close-btn').forEach(button => {
            button.onclick = () => button.closest('.modal').style.display = 'none';
        });

        window.onclick = (event) => {
            if (event.target.classList.contains('modal')) {
                event.target.style.display = 'none';
            }
        };

        document.getElementById('add-task-form').addEventListener('submit', addTask);
        document.getElementById('add-member-form').addEventListener('submit', addMember);
        document.getElementById('edit-task-form').addEventListener('submit', saveTaskDetails);
        document.getElementById('add-subtask-form').addEventListener('submit', addSubtask);
        document.getElementById('add-comment-form').addEventListener('submit', addComment);
    }

    function showModal(modalId) {
        document.getElementById(modalId).style.display = 'block';
    }

    // --- Task Functions ---
    async function fetchTasks() {
        const response = await fetch(`/projects/${projectId}/tasks`);
        const data = await response.json();
        allTasks = {};
        Object.values(data).flat().forEach(task => { allTasks[task.id] = task; });
        renderTasks(data);
    }

    function renderTasks(tasksByStatus) {
        const columns = {
            todo: document.getElementById('todo-tasks'),
            inprogress: document.getElementById('inprogress-tasks'),
            done: document.getElementById('done-tasks')
        };
        Object.values(columns).forEach(col => col.innerHTML = '');
        for (const status in tasksByStatus) {
            if (columns[status]) {
                tasksByStatus[status].forEach(task => {
                    columns[status].appendChild(createTaskCard(task));
                });
            }
        }
    }

    // ## MODIFIED: createTaskCard now shows subtask and comment counts ##
    function createTaskCard(task) {
        const card = document.createElement('div');
        card.className = 'task-card';
        card.dataset.taskId = task.id;

        // Calculate counts
        const subtaskCount = task.subtasks ? task.subtasks.length : 0;
        const commentCount = task.comment_count || 0;

        card.innerHTML = `
            <p>${escapeHTML(task.content)}</p>
            <div class="task-card-footer">
                <span class="priority ${task.priority || 'medium'}">${task.priority || 'medium'}</span>
                <div class="task-meta">
                    <span class="task-meta-item">
                        <svg_icon_for_subtask> ${subtaskCount}
                    </span>
                    <span class="task-meta-item">
                        <svg_icon_for_comment> ${commentCount}
                    </span>
                    <span class="assignee">${escapeHTML(task.assignee_name) || 'Unassigned'}</span>
                </div>
            </div>`;
        card.addEventListener('click', () => openTaskDetails(task.id));
        return card;
    }


    async function addTask(event) {
        event.preventDefault();
        const form = event.target;
        // Logic to add task...
        await fetch(`/projects/${projectId}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: form.querySelector('#task-content').value,
                priority: form.querySelector('#task-priority').value,
                due_date: form.querySelector('#task-due-date').value || null,
                assignee_id: form.querySelector('#task-assignee').value || null
            })
        });
        form.closest('.modal').style.display = 'none';
        form.reset();
        await fetchTasks();
    }
    
    // ## FIXED: Clears old data before opening a new task to prevent duplication ##
    async function openTaskDetails(taskId) {
        currentTaskId = taskId;
        const task = allTasks[taskId];
        if (!task) return;

        // **CRITICAL FIX**: Clear previous task's data first
        document.getElementById('subtask-list').innerHTML = '';
        document.getElementById('comment-list').innerHTML = '';
        document.getElementById('add-subtask-form').reset();
        document.getElementById('add-comment-form').reset();

        const modal = document.getElementById('task-details-modal');
        const form = document.getElementById('edit-task-form');
        form.querySelector('#edit-task-id').value = task.id;
        form.querySelector('#edit-task-content').value = task.content;
        form.querySelector('#edit-task-priority').value = task.priority || 'medium';
        form.querySelector('#edit-task-due-date').value = task.due_date ? task.due_date.split(' ')[0] : '';
        form.querySelector('#edit-task-assignee').value = task.assignee_id || '';
        document.getElementById('delete-task-btn').onclick = () => deleteTask(task.id);

        // Fetch and render fresh data
        await fetchAndRenderSubtasks(taskId);
        await fetchAndRenderComments(taskId);
        
        showModal('task-details-modal');
    }

    async function saveTaskDetails(event) {
        event.preventDefault();
        const form = event.target;
        const taskId = form.querySelector('#edit-task-id').value;
        await fetch(`/projects/${projectId}/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: form.querySelector('#edit-task-content').value,
                priority: form.querySelector('#edit-task-priority').value,
                due_date: form.querySelector('#edit-task-due-date').value || null,
                assignee_id: form.querySelector('#edit-task-assignee').value || null
            })
        });
        form.closest('.modal').style.display = 'none';
        await fetchTasks(); // Refresh tasks to show updated content
    }

    async function updateTaskStatus(taskId, newStatus) {
        await fetch(`/projects/${projectId}/tasks/${taskId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        // Update local task object and re-render
        if(allTasks[taskId]) {
            allTasks[taskId].status = newStatus;
        }
    }

    async function deleteTask(taskId) {
        if (!confirm('Are you sure you want to delete this task?')) return;
        await fetch(`/projects/${projectId}/tasks/${taskId}`, { method: 'DELETE' });
        document.getElementById('task-details-modal').style.display = 'none';
        await fetchTasks(); 
    }

    // --- Member Functions ---
    async function fetchMembers() {
        const response = await fetch(`/projects/${projectId}/members`);
        members = await response.json();
        populateAssigneeDropdowns();
        renderMembers();
    }

    function renderMembers() {
        const memberList = document.getElementById('member-list');
        memberList.innerHTML = '';
        members.forEach(member => {
            const li = document.createElement('li');
            li.className = 'member-item';
            li.innerHTML = `<span>${escapeHTML(member.name)} (${escapeHTML(member.email)})</span> <span class="member-role">${member.role}</span>`;
            memberList.appendChild(li);
        });
    }

    async function addMember(event) {
        event.preventDefault();
        const form = event.target;
        const email = form.querySelector('#member-email').value;
        const response = await fetch(`/projects/${projectId}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await response.json();
        if (response.ok) {
            form.reset();
            await fetchMembers();
        } else {
            alert(`Error: ${data.error}`);
        }
    }
    
    function populateAssigneeDropdowns() {
        const dropdowns = document.querySelectorAll('.assignee-dropdown');
        dropdowns.forEach(dropdown => {
            const currentValue = dropdown.value;
            dropdown.innerHTML = '<option value="">Unassigned</option>';
            members.forEach(member => {
                const option = document.createElement('option');
                option.value = member.user_id;
                option.textContent = escapeHTML(member.name);
                dropdown.appendChild(option);
            });
            dropdown.value = currentValue;
        });
    }

    // --- Subtask Functions ---
    async function fetchAndRenderSubtasks(taskId) {
        const response = await fetch(`/projects/${projectId}/tasks`); // Re-fetch all tasks to get latest subtasks
        const data = await response.json();
        allTasks = {};
        Object.values(data).flat().forEach(task => { allTasks[task.id] = task; });
        const task = allTasks[taskId];
        renderSubtasks(task.subtasks || []);
    }

    function renderSubtasks(subtasks) {
        const subtaskList = document.getElementById('subtask-list');
        subtaskList.innerHTML = ''; // Ensure list is clear before rendering
        if (!subtasks) return;
        subtasks.forEach(subtask => {
            const li = document.createElement('li');
            li.className = `subtask-item ${subtask.is_complete ? 'completed' : ''}`;
            li.innerHTML = `
                <input type="checkbox" data-subtask-id="${subtask.id}" ${subtask.is_complete ? 'checked' : ''}>
                <span>${escapeHTML(subtask.content)}</span>
            `;
            li.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
                updateSubtaskStatus(subtask.id, e.target.checked);
            });
            subtaskList.appendChild(li);
        });
    }
    
    async function addSubtask(event) {
        event.preventDefault();
        const form = event.target;
        const content = form.querySelector('#subtask-content').value;
        if (!content.trim() || !currentTaskId) return;

        const response = await fetch(`/projects/${projectId}/subtasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: content, task_id: currentTaskId })
        });

        if (response.ok) {
            form.reset();
            await fetchAndRenderSubtasks(currentTaskId);
            await fetchTasks(); // Refresh main board to update count
        } else {
            alert('Failed to add subtask.');
        }
    }

    async function updateSubtaskStatus(subtaskId, isComplete) {
        await fetch(`/projects/${projectId}/subtasks/${subtaskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_complete: isComplete })
        });
        // No need to re-render here as fetchAndRenderSubtasks is called after
    }
    
    // --- Comment Functions ---
    async function fetchAndRenderComments(taskId) {
        const response = await fetch(`/projects/${projectId}/tasks/${taskId}/comments`);
        const comments = await response.json();
        renderComments(comments);
    }
    
    function renderComments(comments) {
        const commentList = document.getElementById('comment-list');
        commentList.innerHTML = ''; // Ensure list is clear before rendering
        if (!comments) return;
        comments.forEach(comment => {
            const li = document.createElement('li');
            li.className = 'comment-item';
            li.innerHTML = `
                <div class="comment-header">
                    <span class="comment-author">${escapeHTML(comment.author)}</span>
                    <span class="comment-date">${comment.created_at}</span>
                </div>
                <p class="comment-content">${escapeHTML(comment.content)}</p>
            `;
            commentList.appendChild(li);
        });
    }

    async function addComment(event) {
        event.preventDefault();
        const form = event.target;
        const content = form.querySelector('#comment-content').value;
        if (!content.trim() || !currentTaskId) return;

        const response = await fetch(`/projects/${projectId}/tasks/${currentTaskId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: content })
        });

        if (response.ok) {
            form.reset();
            await fetchAndRenderComments(currentTaskId);
            await fetchTasks(); // Refresh main board to update count
        } else {
            alert('Failed to add comment.');
        }
    }

    function escapeHTML(str) {
        if (str === null || str === undefined) return '';
        const p = document.createElement('p');
        p.textContent = str;
        return p.innerHTML;
    }
});