document.addEventListener('DOMContentLoaded', function() {
    const projectId = document.body.dataset.projectId;
    let members = [];

    // Fetch initial data
    fetchTasks();
    fetchMembers();

    // Make columns sortable
    const columns = document.querySelectorAll('.task-column');
    new Sortable(columns, {
        group: 'tasks',
        animation: 150,
        onEnd: function(evt) {
            const taskId = evt.item.dataset.taskId;
            const newStatus = evt.to.id.replace('-tasks', '');
            updateTaskStatus(taskId, newStatus);
        }
    });

    // --- Event Listeners for Modals ---
    const addTaskBtn = document.getElementById('add-task-btn');
    const addTaskModal = document.getElementById('add-task-modal');
    const closeButtons = document.querySelectorAll('.close-button');
    const manageMembersBtn = document.getElementById('manage-members-btn');
    const membersModal = document.getElementById('members-modal');

    addTaskBtn.onclick = () => addTaskModal.style.display = 'block';
    manageMembersBtn.onclick = () => membersModal.style.display = 'block';

    closeButtons.forEach(button => {
        button.onclick = () => {
            addTaskModal.style.display = 'none';
            membersModal.style.display = 'none';
            document.getElementById('task-details-modal').style.display = 'none';
        };
    });

    window.onclick = function(event) {
        if (event.target == addTaskModal || event.target == membersModal || event.target == document.getElementById('task-details-modal')) {
            addTaskModal.style.display = 'none';
            membersModal.style.display = 'none';
            document.getElementById('task-details-modal').style.display = 'none';
        }
    };

    // --- Form Submissions ---
    document.getElementById('add-task-form').addEventListener('submit', addTask);
    document.getElementById('add-member-form').addEventListener('submit', addMember);
    document.getElementById('edit-task-form').addEventListener('submit', saveTaskDetails);
    document.getElementById('add-comment-form').addEventListener('submit', addComment);
    document.getElementById('add-subtask-form').addEventListener('submit', addSubtask);

    // --- Core Functions ---
    function fetchTasks() {
        fetch(`/projects/${projectId}/tasks`)
            .then(response => response.json())
            .then(data => {
                renderTasks(data);
            });
    }

    function fetchMembers() {
        fetch(`/projects/${projectId}/members`)
            .then(response => response.json())
            .then(data => {
                members = data;
                populateAssigneeDropdowns();
                renderMembers(data);
            });
    }

    function renderTasks(tasksByStatus) {
        // *** FIX: Clear existing tasks to prevent duplication ***
        document.getElementById('todo-tasks').innerHTML = '';
        document.getElementById('inprogress-tasks').innerHTML = '';
        document.getElementById('done-tasks').innerHTML = '';

        for (const status in tasksByStatus) {
            const column = document.getElementById(`${status}-tasks`);
            tasksByStatus[status].forEach(task => {
                const taskCard = createTaskCard(task);
                column.appendChild(taskCard);
            });
        }
    }

    function createTaskCard(task) {
        const card = document.createElement('div');
        card.className = 'task-card';
        card.dataset.taskId = task.id;
        card.innerHTML = `
            <p>${task.content}</p>
            <div class="task-card-footer">
                <span class="priority ${task.priority}">${task.priority}</span>
                <span class="assignee">${task.assignee_name || 'Unassigned'}</span>
            </div>
        `;
        card.addEventListener('click', () => openTaskDetails(task.id));
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
                // *** FIX: Refresh tasks after adding a new one ***
                fetchTasks();
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

    function openTaskDetails(taskId) {
        // This is a simplified example. You would fetch full task details here.
        // For now, we assume the initial fetch has all we need for this example.
        // In a real app, you'd make a new fetch call: fetch(`/projects/${projectId}/tasks/${taskId}`)
        alert(`Opening details for task ID: ${taskId}. A full implementation would show a detailed modal.`);
    }
    
    // --- Deletion Logic ---
    // This function needs to be called from an event listener on a delete button inside the task details modal
    function deleteTask(taskId) {
        if (!confirm('Are you sure you want to delete this task?')) {
            return;
        }
        
        fetch(`/projects/${projectId}/tasks/${taskId}`, {
            method: 'DELETE'
        }).then(response => {
            if (response.ok) {
                document.getElementById('task-details-modal').style.display = 'none';
                // *** FIX: Refresh tasks after deleting one ***
                fetchTasks(); 
            } else {
                alert('Failed to delete task.');
            }
        });
    }


    // --- Member Management ---
    function renderMembers(members) {
        const memberList = document.getElementById('member-list');
        memberList.innerHTML = ''; // Clear list
        members.forEach(member => {
            const li = document.createElement('li');
            li.textContent = `${member.name} (${member.email}) - ${member.role}`;
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
                fetchMembers(); // Refresh member list
            } else {
                alert(`Error: ${data.error}`);
            }
        });
    }
    
    function populateAssigneeDropdowns() {
        const dropdowns = document.querySelectorAll('.assignee-dropdown');
        dropdowns.forEach(dropdown => {
            dropdown.innerHTML = '<option value="">Unassigned</option>'; // Reset
            members.forEach(member => {
                const option = document.createElement('option');
                option.value = member.user_id;
                option.textContent = member.name;
                dropdown.appendChild(option);
            });
        });
    }

    // Placeholder functions for features not fully implemented in the original files
    function saveTaskDetails(event) { event.preventDefault(); alert("Saving task details..."); }
    function addComment(event) { event.preventDefault(); alert("Adding comment..."); }
    function addSubtask(event) { event.preventDefault(); alert("Adding subtask..."); }
});
