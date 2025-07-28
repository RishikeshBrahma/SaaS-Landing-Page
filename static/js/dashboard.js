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
        try {
            const response = await fetch(`/projects/${projectId}/tasks`);
            const data = await response.json();
            
            // Clear and rebuild allTasks object
            allTasks = {};
            Object.values(data).flat().forEach(task => { 
                allTasks[task.id] = task; 
            });
            
            renderTasks(data);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        }
    }

    function renderTasks(tasksByStatus) {
        const columns = {
            todo: document.getElementById('todo-tasks'),
            inprogress: document.getElementById('inprogress-tasks'),
            done: document.getElementById('done-tasks')
        };
        
        // Clear all columns first
        Object.values(columns).forEach(col => col.innerHTML = '');
        
        // Render tasks in their respective columns
        for (const status in tasksByStatus) {
            if (columns[status]) {
                tasksByStatus[status].forEach(task => {
                    columns[status].appendChild(createTaskCard(task));
                });
            }
        }
    }

    // ENHANCED: Task card now shows actual subtasks and comments with authors
    function createTaskCard(task) {
        const card = document.createElement('div');
        card.className = 'task-card';
        card.dataset.taskId = task.id;

        // Build subtasks section
        let subtasksHTML = '';
        if (task.subtasks && task.subtasks.length > 0) {
            subtasksHTML = `
                <div class="card-subtasks">
                    <div class="card-section-header">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 12l2 2 4-4"/>
                            <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"/>
                        </svg>
                        Subtasks (${task.subtasks.filter(st => st.is_complete).length}/${task.subtasks.length})
                    </div>
                    <div class="card-subtask-list">
                        ${task.subtasks.slice(0, 3).map(subtask => `
                            <div class="card-subtask-item ${subtask.is_complete ? 'completed' : ''}">
                                <span class="subtask-checkbox">${subtask.is_complete ? '✓' : '○'}</span>
                                <span class="subtask-text">${escapeHTML(subtask.content)}</span>
                                <span class="subtask-author">by ${escapeHTML(subtask.created_by || 'Unknown')}</span>
                            </div>
                        `).join('')}
                        ${task.subtasks.length > 3 ? `<div class="card-more">+${task.subtasks.length - 3} more...</div>` : ''}
                    </div>
                </div>
            `;
        }

        // Build comments section (we'll need to fetch comments separately for author info)
        let commentsHTML = '';
        const commentCount = task.comment_count || 0;
        if (commentCount > 0) {
            commentsHTML = `
                <div class="card-comments">
                    <div class="card-section-header">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        Comments (${commentCount})
                    </div>
                    <div class="card-comment-preview" data-task-id="${task.id}">
                        Loading comments...
                    </div>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="task-content">
                <p class="task-title">${escapeHTML(task.content)}</p>
            </div>
            
            ${subtasksHTML}
            ${commentsHTML}
            
            <div class="task-card-footer">
                <span class="priority ${task.priority || 'medium'}">${task.priority || 'medium'}</span>
                <span class="assignee">${escapeHTML(task.assignee_name) || 'Unassigned'}</span>
            </div>`;
        
        // Load comments for this card if they exist
        if (commentCount > 0) {
            loadCardComments(task.id);
        }
        
        card.addEventListener('click', () => openTaskDetails(task.id));
        return card;
    }

    // NEW: Function to load comments for display on cards
    async function loadCardComments(taskId) {
        try {
            const response = await fetch(`/projects/${projectId}/tasks/${taskId}/comments`);
            if (response.ok) {
                const comments = await response.json();
                const previewElement = document.querySelector(`[data-task-id="${taskId}"] .card-comment-preview`);
                
                if (previewElement && comments.length > 0) {
                    const recentComments = comments.slice(-2); // Show last 2 comments
                    previewElement.innerHTML = recentComments.map(comment => `
                        <div class="card-comment-item">
                            <span class="comment-author">${escapeHTML(comment.author)}:</span>
                            <span class="comment-text">${escapeHTML(comment.content.substring(0, 50))}${comment.content.length > 50 ? '...' : ''}</span>
                        </div>
                    `).join('') + (comments.length > 2 ? `<div class="card-more">+${comments.length - 2} more...</div>` : '');
                }
            }
        } catch (error) {
            console.error('Error loading card comments:', error);
        }
    }

    async function addTask(event) {
        event.preventDefault();
        const form = event.target;
        
        try {
            const response = await fetch(`/projects/${projectId}/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: form.querySelector('#task-content').value,
                    priority: form.querySelector('#task-priority').value,
                    due_date: form.querySelector('#task-due-date').value || null,
                    assignee_id: form.querySelector('#task-assignee').value || null
                })
            });
            
            if (response.ok) {
                form.closest('.modal').style.display = 'none';
                form.reset();
                await fetchTasks();
            }
        } catch (error) {
            console.error('Error adding task:', error);
        }
    }
    
    // CRITICAL FIX: Completely clear modal data and fetch fresh data for the specific task
    async function openTaskDetails(taskId) {
        currentTaskId = taskId;
        const task = allTasks[taskId];
        if (!task) return;

        // **STEP 1: Clear ALL previous data first**
        clearTaskModal();

        // **STEP 2: Populate form with current task data**
        populateTaskForm(task);

        // **STEP 3: Fetch and render ONLY this task's subtasks and comments**
        await Promise.all([
            fetchAndRenderSubtasks(taskId),
            fetchAndRenderComments(taskId)
        ]);
        
        showModal('task-details-modal');
    }

    // NEW: Function to completely clear modal data
    function clearTaskModal() {
        // Clear lists
        document.getElementById('subtask-list').innerHTML = '';
        document.getElementById('comment-list').innerHTML = '';
        
        // Reset forms
        document.getElementById('add-subtask-form').reset();
        document.getElementById('add-comment-form').reset();
        
        // Clear any existing event listeners by cloning nodes
        const subtaskList = document.getElementById('subtask-list');
        const newSubtaskList = subtaskList.cloneNode(true);
        subtaskList.parentNode.replaceChild(newSubtaskList, subtaskList);
    }

    // NEW: Function to populate task form
    function populateTaskForm(task) {
        const form = document.getElementById('edit-task-form');
        form.querySelector('#edit-task-id').value = task.id;
        form.querySelector('#edit-task-content').value = task.content;
        form.querySelector('#edit-task-priority').value = task.priority || 'medium';
        form.querySelector('#edit-task-due-date').value = task.due_date ? task.due_date.split(' ')[0] : '';
        form.querySelector('#edit-task-assignee').value = task.assignee_id || '';
        
        // Set delete button handler
        document.getElementById('delete-task-btn').onclick = () => deleteTask(task.id);
    }

    async function saveTaskDetails(event) {
        event.preventDefault();
        const form = event.target;
        const taskId = form.querySelector('#edit-task-id').value;
        
        try {
            const response = await fetch(`/projects/${projectId}/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: form.querySelector('#edit-task-content').value,
                    priority: form.querySelector('#edit-task-priority').value,
                    due_date: form.querySelector('#edit-task-due-date').value || null,
                    assignee_id: form.querySelector('#edit-task-assignee').value || null
                })
            });
            
            if (response.ok) {
                form.closest('.modal').style.display = 'none';
                await fetchTasks(); // Refresh tasks to show updated content
            }
        } catch (error) {
            console.error('Error saving task:', error);
        }
    }

    async function updateTaskStatus(taskId, newStatus) {
        try {
            const response = await fetch(`/projects/${projectId}/tasks/${taskId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            
            if (response.ok && allTasks[taskId]) {
                allTasks[taskId].status = newStatus;
            }
        } catch (error) {
            console.error('Error updating task status:', error);
        }
    }

    async function deleteTask(taskId) {
        if (!confirm('Are you sure you want to delete this task?')) return;
        
        try {
            const response = await fetch(`/projects/${projectId}/tasks/${taskId}`, { 
                method: 'DELETE' 
            });
            
            if (response.ok) {
                document.getElementById('task-details-modal').style.display = 'none';
                await fetchTasks(); 
            }
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    }

    // --- Member Functions ---
    async function fetchMembers() {
        try {
            const response = await fetch(`/projects/${projectId}/members`);
            members = await response.json();
            populateAssigneeDropdowns();
            renderMembers();
        } catch (error) {
            console.error('Error fetching members:', error);
        }
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
        
        try {
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
        } catch (error) {
            console.error('Error adding member:', error);
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

    // --- FIXED Subtask Functions ---
    async function fetchAndRenderSubtasks(taskId) {
        try {
            // Get the specific task's subtasks from our stored data
            const task = allTasks[taskId];
            if (task && task.subtasks) {
                renderSubtasks(task.subtasks);
            } else {
                // If no subtasks in memory, fetch fresh data
                await fetchTasks();
                const updatedTask = allTasks[taskId];
                if (updatedTask && updatedTask.subtasks) {
                    renderSubtasks(updatedTask.subtasks);
                }
            }
        } catch (error) {
            console.error('Error fetching subtasks:', error);
        }
    }

    function renderSubtasks(subtasks) {
        const subtaskList = document.getElementById('subtask-list');
        subtaskList.innerHTML = ''; // Clear list
        
        if (!subtasks || !Array.isArray(subtasks)) return;
        
        subtasks.forEach(subtask => {
            const li = document.createElement('li');
            li.className = `subtask-item ${subtask.is_complete ? 'completed' : ''}`;
            li.innerHTML = `
                <input type="checkbox" data-subtask-id="${subtask.id}" ${subtask.is_complete ? 'checked' : ''}>
                <span>${escapeHTML(subtask.content)}</span>
            `;
            
            // Add event listener for this specific checkbox
            const checkbox = li.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', (e) => {
                updateSubtaskStatus(subtask.id, e.target.checked);
            });
            
            subtaskList.appendChild(li);
        });
    }
    
    async function addSubtask(event) {
        event.preventDefault();
        const form = event.target;
        const content = form.querySelector('#subtask-content').value.trim();
        
        if (!content || !currentTaskId) return;

        try {
            const response = await fetch(`/projects/${projectId}/subtasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    content: content, 
                    task_id: currentTaskId 
                })
            });

            if (response.ok) {
                form.reset();
                // Refresh the main tasks data first, then update subtasks display
                await fetchTasks();
                await fetchAndRenderSubtasks(currentTaskId);
            } else {
                alert('Failed to add subtask.');
            }
        } catch (error) {
            console.error('Error adding subtask:', error);
        }
    }

    async function updateSubtaskStatus(subtaskId, isComplete) {
        try {
            const response = await fetch(`/projects/${projectId}/subtasks/${subtaskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_complete: isComplete })
            });
            
            if (response.ok) {
                // Update the local data
                const task = allTasks[currentTaskId];
                if (task && task.subtasks) {
                    const subtask = task.subtasks.find(st => st.id === subtaskId);
                    if (subtask) {
                        subtask.is_complete = isComplete;
                    }
                }
                // Refresh main board to update counts
                await fetchTasks();
            }
        } catch (error) {
            console.error('Error updating subtask:', error);
        }
    }
    
    // --- FIXED Comment Functions ---
    async function fetchAndRenderComments(taskId) {
        try {
            const response = await fetch(`/projects/${projectId}/tasks/${taskId}/comments`);
            if (response.ok) {
                const comments = await response.json();
                renderComments(comments);
            }
        } catch (error) {
            console.error('Error fetching comments:', error);
        }
    }
    
    function renderComments(comments) {
        const commentList = document.getElementById('comment-list');
        commentList.innerHTML = ''; // Clear list
        
        if (!comments || !Array.isArray(comments)) return;
        
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
        const content = form.querySelector('#comment-content').value.trim();
        
        if (!content || !currentTaskId) return;

        try {
            const response = await fetch(`/projects/${projectId}/tasks/${currentTaskId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: content })
            });

            if (response.ok) {
                form.reset();
                // Refresh both comments and main board
                await Promise.all([
                    fetchAndRenderComments(currentTaskId),
                    fetchTasks() // This updates comment counts on cards
                ]);
            } else {
                alert('Failed to add comment.');
            }
        } catch (error) {
            console.error('Error adding comment:', error);
        }
    }

    function escapeHTML(str) {
        if (str === null || str === undefined) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
});