document.addEventListener('DOMContentLoaded', function() {
    const projectId = document.body.dataset.projectId;
    let members = [];

    if (!projectId || projectId === 'undefined' || projectId === null) {
        console.error("Project ID is not defined. Halting execution.");
        return;
    }

    fetchTasks();
    fetchMembers();

    // --- FIX: Initialize Sortable on each column individually ---
    if (typeof Sortable !== 'undefined') {
        const columns = document.querySelectorAll('.task-column');
        // Loop through each column and make it sortable
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
    // --- END FIX ---


    // --- Event Listeners for Modals ---
    const addTaskBtn = document.getElementById('add-task-btn');
    const addTaskModal = document.getElementById('add-task-modal');
    const closeButtons = document.querySelectorAll('.close-button');
    const manageMembersBtn = document.getElementById('manage-members-btn');
    const membersModal = document.getElementById('members-modal');

    if(addTaskBtn) addTaskBtn.onclick = () => addTaskModal.style.display = 'block';
    if(manageMembersBtn) manageMembersBtn.onclick = () => membersModal.style.display = 'block';

    closeButtons.forEach(button => {
        button.onclick = () => {
            button.closest('.modal').style.display = 'none';
        };
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
    function fetchTasks() {
        fetch(`/projects/${projectId}/tasks`)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then(data => {
                if (data.error) throw new Error(data.error);
                renderTasks(data);
            })
            .catch(error => console.error("Error fetching tasks:", error));
    }

    function fetchMembers() {
        fetch(`/projects/${projectId}/members`)
            .then(response => {
                 if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then(data => {
                if (data.error) throw new Error(data.error);
                members = data;
                populateAssigneeDropdowns();
                renderMembers(data);
            })
            .catch(error => console.error("Error fetching members:", error));
    }

    function renderTasks(tasksByStatus) {
        document.getElementById('todo-tasks').innerHTML = '';
        document.getElementById('inprogress-tasks').innerHTML = '';
        document.getElementById('done-tasks').innerHTML = '';

        for (const status in tasksByStatus) {
            const column = document.getElementById(`${status}-tasks`);
            if (column) {
                tasksByStatus[status].forEach(task => {
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

    function addTask(event) {
        event.preventDefault();
        const content = document.getElementById('task-content').value;
        const priority = document.getElementById('task-priority').value;
        const dueDate = document.getElementById('task-due-date').value;
        const assigneeId = document.getElementById('task-assignee').value;

        fetch(`/projects/${projectId}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, priority, due_date: dueDate, assignee_id: assigneeId })
        }).then(response => {
            if (response.ok) {
                document.getElementById('add-task-modal').style.display = 'none';
                document.getElementById('add-task-form').reset();
                fetchTasks();
            } else {
                alert("Failed to add task.");
            }
        });
    }
    
    function updateTaskStatus(taskId, newStatus) {
        fetch(`/projects/${projectId}/tasks/${taskId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
    }

    function deleteTask(taskId) {
        if (!confirm('Are you sure you want to delete this task?')) {
            return;
        }
        
        fetch(`/projects/${projectId}/tasks/${taskId}`, {
            method: 'DELETE'
        }).then(response => {
            if (response.ok) {
                document.getElementById('task-details-modal').style.display = 'none';
                fetchTasks(); 
            } else {
                alert('Failed to delete task.');
            }
        });
    }

    function openTaskDetails(task) {
        const modal = document.getElementById('task-details-modal');
        const deleteBtn = document.getElementById('delete-task-btn');
        
        deleteBtn.onclick = () => deleteTask(task.id);
        
        modal.style.display = 'block';
    }

    // --- Member Management ---
    function renderMembers(members) {
        const memberList = document.getElementById('member-list');
        memberList.innerHTML = '';
        members.forEach(member => {
            const li = document.createElement('li');
            li.textContent = `${escapeHTML(member.name)} (${escapeHTML(member.email)}) - ${member.role}`;
            memberList.appendChild(li);
        });
    }

    function addMember(event) {
        event.preventDefault();
        const email = document.getElementById('member-email').value;
        fetch(`/projects/${projectId}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                document.getElementById('add-member-form').reset();
                fetchMembers();
            } else {
                alert(`Error: ${data.error}`);
            }
        });
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

    // Helper function to prevent XSS attacks
    function escapeHTML(str) {
        if (str === null || str === undefined) return '';
        const p = document.createElement('p');
        p.textContent = str;
        return p.innerHTML;
    }
});
