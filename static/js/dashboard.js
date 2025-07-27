document.addEventListener('DOMContentLoaded', function() {
    const projectId = document.body.dataset.projectId;
    let members = [];
    let tasksData = {}; // Store tasks to prevent re-fetching unless needed

    if (!projectId || projectId === 'undefined' || projectId === null) {
        console.error("Project ID is not defined. Halting execution.");
        return;
    }

    // --- Initial Data Load ---
    // We will now call fetchTasks and fetchMembers only once at the start
    initializeApp();

    function initializeApp() {
        fetchMembers().then(() => {
            fetchTasks();
        });
    }

    // --- Drag and Drop Initialization ---
    if (typeof Sortable !== 'undefined') {
        const columns = document.querySelectorAll('.task-column');
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
    } else {
        console.error("Sortable.js is not loaded. Drag-and-drop will not work.");
    }

    // --- Event Listeners for Modals ---
    const addTaskBtn = document.getElementById('add-task-btn');
    const addTaskModal = document.getElementById('add-task-modal');
    const closeButtons = document.querySelectorAll('.close-button');
    const manageMembersBtn = document.getElementById('manage-members-btn');
    const membersModal = document.getElementById('members-modal');

    if(addTaskBtn) addTaskBtn.onclick = () => addTaskModal.style.display = 'block';
    if(manageMembersBtn) manageMembersBtn.onclick = () => membersModal.style.display = 'block';

    closeButtons.forEach(button => {
        button.onclick = () => button.closest('.modal').style.display = 'none';
    });

    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    };

    // --- Form Submissions ---
    document.getElementById('add-task-form').addEventListener('submit', addTask);
    document.getElementById('add-member-form').addEventListener('submit', addMember);

    // --- Core Functions ---
    async function fetchTasks() {
        try {
            const response = await fetch(`/projects/${projectId}/tasks`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            tasksData = data; // Store the fetched tasks
            renderTasks(); // Render the stored tasks
        } catch (error) {
            console.error("Error fetching tasks:", error);
        }
    }

    async function fetchMembers() {
         try {
            const response = await fetch(`/projects/${projectId}/members`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            members = data;
            populateAssigneeDropdowns();
            renderMembers();
        } catch (error) {
            console.error("Error fetching members:", error);
        }
    }

    function renderTasks() {
        // This function now reads from the stored tasksData object
        const todoCol = document.getElementById('todo-tasks');
        const inprogressCol = document.getElementById('inprogress-tasks');
        const doneCol = document.getElementById('done-tasks');

        // ** THE CRITICAL FIX IS HERE: Clear the columns every time before rendering **
        todoCol.innerHTML = '';
        inprogressCol.innerHTML = '';
        doneCol.innerHTML = '';

        for (const status in tasksData) {
            const column = document.getElementById(`${status}-tasks`);
            if (column) {
                tasksData[status].forEach(task => {
                    const taskCard = createTaskCard(task);
                    column.appendChild(taskCard);
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
                <span class="priority ${task.priority}">${task.priority || 'medium'}</span>
                <span class="assignee">${escapeHTML(task.assignee_name) || 'Unassigned'}</span>
            </div>
        `;
        card.addEventListener('click', () => openTaskDetails(task));
        return card;
    }

    async function addTask(event) {
        event.preventDefault();
        const content = document.getElementById('task-content').value;
        const priority = document.getElementById('task-priority').value;
        const dueDate = document.getElementById('task-due-date').value;
        const assigneeId = document.getElementById('task-assignee').value;

        const response = await fetch(`/projects/${projectId}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, priority, due_date: dueDate, assignee_id: assigneeId })
        });
        
        if (response.ok) {
            document.getElementById('add-task-modal').style.display = 'none';
            document.getElementById('add-task-form').reset();
            await fetchTasks(); // Re-fetch and then re-render all tasks
        } else {
            alert("Failed to add task.");
        }
    }
    
    function updateTaskStatus(taskId, newStatus) {
        fetch(`/projects/${projectId}/tasks/${taskId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
    }

    async function deleteTask(taskId) {
        if (!confirm('Are you sure you want to delete this task?')) {
            return;
        }
        
        const response = await fetch(`/projects/${projectId}/tasks/${taskId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            document.getElementById('task-details-modal').style.display = 'none';
            await fetchTasks(); // Re-fetch and then re-render all tasks
        } else {
            alert('Failed to delete task.');
        }
    }

    function openTaskDetails(task) {
        const modal = document.getElementById('task-details-modal');
        const deleteBtn = document.getElementById('delete-task-btn');
        
        deleteBtn.onclick = () => deleteTask(task.id);
        
        modal.style.display = 'block';
    }

    function renderMembers() {
        const memberList = document.getElementById('member-list');
        memberList.innerHTML = '';
        members.forEach(member => {
            const li = document.createElement('li');
            li.textContent = `${escapeHTML(member.name)} (${escapeHTML(member.email)}) - ${member.role}`;
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
            await fetchMembers(); // Re-fetch and then re-render members
        } else {
            alert(`Error: ${data.error}`);
        }
    }
    
    function populateAssigneeDropdowns() {
        const dropdowns = document.querySelectorAll('.assignee-dropdown');
        dropdowns.forEach(dropdown => {
            dropdown.innerHTML = '<option value="">Unassigned</option>';
            members.forEach(member => {
                const option = document.createElement('option');
                option.value = member.user_id;
                option.textContent = escapeHTML(member.name);
                dropdown.appendChild(option);
            });
        });
    }

    function escapeHTML(str) {
        if (str === null || str === undefined) return '';
        const p = document.createElement('p');
        p.textContent = str;
        return p.innerHTML;
    }
});
