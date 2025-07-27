// static/js/dashboard.js
// This script handles the dashboard functionality including task management and member management.
document.addEventListener('DOMContentLoaded', function() {
    const projectId = document.body.dataset.projectId;
    let members = [];
    let allTasks = {};

    if (!projectId || projectId === 'undefined' || projectId === null) {
        return;
    }

    initializeApp();

    function initializeApp() {
        fetchMembers().then(() => {
            fetchTasks();
        });
        initializeSortable();
        setupEventListeners();
    }

    function initializeSortable() {
        if (typeof Sortable === 'undefined') {
            return;
        }
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
        const addTaskBtn = document.getElementById('add-task-btn');
        const manageMembersBtn = document.getElementById('manage-members-btn');
        const addTaskModal = document.getElementById('add-task-modal');
        const membersModal = document.getElementById('members-modal');

        if (addTaskBtn) addTaskBtn.onclick = () => addTaskModal.style.display = 'block';
        if (manageMembersBtn) manageMembersBtn.onclick = () => membersModal.style.display = 'block';

        document.querySelectorAll('.close-button').forEach(button => {
            button.onclick = () => button.closest('.modal').style.display = 'none';
        });

        window.onclick = function(event) {
            if (event.target.classList.contains('modal')) {
                event.target.style.display = 'none';
            }
        };

        document.getElementById('add-task-form').addEventListener('submit', addTask);
        document.getElementById('add-member-form').addEventListener('submit', addMember);
        document.getElementById('edit-task-form').addEventListener('submit', saveTaskDetails);
    }

    async function fetchTasks() {
        const response = await fetch(`/projects/${projectId}/tasks`);
        const data = await response.json();
        allTasks = {};
        Object.values(data).flat().forEach(task => {
            allTasks[task.id] = task;
        });
        renderTasks(data);
    }

    async function fetchMembers() {
        const response = await fetch(`/projects/${projectId}/members`);
        members = await response.json();
        populateAssigneeDropdowns();
        renderMembers();
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
                    const taskCard = createTaskCard(task);
                    columns[status].appendChild(taskCard);
                });
            }
        }
    }

    function createTaskCard(task) {
        const card = document.createElement('div');
        card.className = 'task-card';
        card.dataset.taskId = task.id;
        card.innerHTML = `
            <p>${escapeHTML(task.content)}</p>
            <div class="task-card-footer">
                <span class="priority ${task.priority || 'medium'}">${task.priority || 'medium'}</span>
                <span class="assignee">${escapeHTML(task.assignee_name) || 'Unassigned'}</span>
            </div>
        `;
        card.addEventListener('click', () => openTaskDetails(task.id));
        return card;
    }

    async function addTask(event) {
        event.preventDefault();
        const form = event.target;
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

    function openTaskDetails(taskId) {
        const task = allTasks[taskId];
        if (!task) return;
        const modal = document.getElementById('task-details-modal');
        const form = document.getElementById('edit-task-form');
        form.querySelector('#edit-task-id').value = task.id;
        form.querySelector('#edit-task-content').value = task.content;
        form.querySelector('#edit-task-priority').value = task.priority || 'medium';
        form.querySelector('#edit-task-due-date').value = task.due_date || '';
        form.querySelector('#edit-task-assignee').value = task.assignee_id || '';
        document.getElementById('delete-task-btn').onclick = () => deleteTask(task.id);
        modal.style.display = 'block';
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
        await fetchTasks();
    }

    async function updateTaskStatus(taskId, newStatus) {
        await fetch(`/projects/${projectId}/tasks/${taskId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        if(allTasks[taskId]) allTasks[taskId].status = newStatus;
    }

    async function deleteTask(taskId) {
        if (!confirm('Are you sure you want to delete this task?')) return;
        await fetch(`/projects/${projectId}/tasks/${taskId}`, { method: 'DELETE' });
        document.getElementById('task-details-modal').style.display = 'none';
        await fetchTasks(); 
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
        const email = document.getElementById('member-email').value;
        const response = await fetch(`/projects/${projectId}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await response.json();
        if (data.status === 'success') {
            document.getElementById('add-member-form').reset();
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

    function escapeHTML(str) {
        if (str === null || str === undefined) return '';
        const p = document.createElement('p');
        p.textContent = str;
        return p.innerHTML;
    }
});