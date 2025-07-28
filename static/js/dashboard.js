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
        updateTaskCounts();
    }

    function initializeSortable() {
        if (typeof Sortable === 'undefined') return;
        const columns = document.querySelectorAll('.task-cards');
        columns.forEach(column => {
            new Sortable(column, {
                group: 'tasks',
                animation: 300,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
                onStart: function(evt) {
                    evt.item.classList.add('dragging');
                },
                onEnd: function(evt) {
                    evt.item.classList.remove('dragging');
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
            button.onclick = () => {
                button.closest('.modal').style.display = 'none';
                // Clear form data when closing modals
                clearModalForms();
            };
        });

        window.onclick = (event) => {
            if (event.target.classList.contains('modal')) {
                event.target.style.display = 'none';
                clearModalForms();
            }
        };

        document.getElementById('add-task-form').addEventListener('submit', addTask);
        document.getElementById('add-member-form').addEventListener('submit', addMember);
        document.getElementById('edit-task-form').addEventListener('submit', saveTaskDetails);
        document.getElementById('add-subtask-form').addEventListener('submit', addSubtask);
        document.getElementById('add-comment-form').addEventListener('submit', addComment);
    }

    function clearModalForms() {
        // Reset all forms
        document.querySelectorAll('form').forEach(form => {
            if (form.id !== 'edit-task-form') { // Don't clear edit form as it might be in use
                form.reset();
            }
        });
    }

    function showModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.style.display = 'block';
        // Add entrance animation
        modal.querySelector('.modal-content').style.animation = 'scaleIn 0.3s ease-out';
    }

    function updateTaskCounts() {
        const todoCounts = document.querySelectorAll('#todo-tasks .task-card').length;
        const inProgressCounts = document.querySelectorAll('#inprogress-tasks .task-card').length;
        const doneCounts = document.querySelectorAll('#done-tasks .task-card').length;

        document.getElementById('todo-count').textContent = todoCounts;
        document.getElementById('inprogress-count').textContent = inProgressCounts;
        document.getElementById('done-count').textContent = doneCounts;
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
            updateTaskCounts();
        } catch (error) {
            console.error('Error fetching tasks:', error);
            showNotification('Error loading tasks', 'error');
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
        
        // Render tasks in their respective columns with staggered animation
        for (const status in tasksByStatus) {
            if (columns[status]) {
                tasksByStatus[status].forEach((task, index) => {
                    const taskCard = createTaskCard(task);
                    taskCard.style.animationDelay = `${index * 0.1}s`;
                    columns[status].appendChild(taskCard);
                });
            }
        }
    }

    // ENHANCED: Task card now shows detailed subtasks and comments with authors
    function createTaskCard(task) {
        const card = document.createElement('div');
        card.className = 'task-card';
        card.dataset.taskId = task.id;

        // Build subtasks section with author information
        let subtasksHTML = '';
        if (task.subtasks && task.subtasks.length > 0) {
            const completedCount = task.subtasks.filter(st => st.is_complete).length;
            const totalCount = task.subtasks.length;
            
            subtasksHTML = `
                <div class="card-subtasks">
                    <div class="card-section-header">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 12l2 2 4-4"/>
                            <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"/>
                        </svg>
                        Subtasks (${completedCount}/${totalCount})
                    </div>
                    <div class="card-subtask-list">
                        ${task.subtasks.slice(0, 3).map(subtask => `
                            <div class="card-subtask-item ${subtask.is_complete ? 'completed' : ''}">
                                <span class="subtask-checkbox">${subtask.is_complete ? '✓' : '○'}</span>
                                <span class="subtask-text">${escapeHTML(subtask.content)}</span>
                                <span class="subtask-author">by ${escapeHTML(getSubtaskAuthor(subtask))}</span>
                            </div>
                        `).join('')}
                        ${task.subtasks.length > 3 ? `<div class="card-more">+${task.subtasks.length - 3} more subtasks...</div>` : ''}
                    </div>
                </div>
            `;
        }

        // Build comments section with real comment data
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
                        <div style="opacity: 0.6; font-style: italic;">Loading comments...</div>
                    </div>
                </div>
            `;
        }

        // Build due date info
        let dueDateHTML = '';
        if (task.due_date) {
            const dueDate = new Date(task.due_date);
            const today = new Date();
            const isOverdue = dueDate < today;
            dueDateHTML = `
                <div class="task-due-date ${isOverdue ? 'overdue' : ''}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    ${task.due_date}
                </div>
            `;
        }

        card.innerHTML = `
            <div class="task-content">
                <p class="task-title">${escapeHTML(task.content)}</p>
                ${dueDateHTML}
            </div>
            
            ${subtasksHTML}
            ${commentsHTML}
            
            <div class="task-card-footer">
                <div class="task-meta">
                    <span class="priority ${task.priority || 'medium'}">${task.priority || 'medium'}</span>
                </div>
                <div class="assignee">${escapeHTML(task.assignee_name) || 'Unassigned'}</div>
            </div>`;
        
        // Load comments for this card if they exist
        if (commentCount > 0) {
            loadCardComments(task.id);
        }
        
        card.addEventListener('click', () => openTaskDetails(task.id));
        
        // Add hover effects
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-5px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', () => {
            if (!card.classList.contains('dragging')) {
                card.style.transform = '';
            }
        });
        
        return card;
    }

    function getSubtaskAuthor(subtask) {
        // Find the member who created this subtask
        const author = members.find(member => member.user_id === subtask.created_by);
        return author ? author.name : 'Unknown';
    }

    // NEW: Function to load comments for display on cards with author info
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
                            <span class="comment-text">${escapeHTML(comment.content.substring(0, 60))}${comment.content.length > 60 ? '...' : ''}</span>
                        </div>
                    `).join('') + (comments.length > 2 ? `<div class="card-more">+${comments.length - 2} more comments...</div>` : '');
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
                showNotification('Task added successfully!', 'success');
            } else {
                throw new Error('Failed to add task');
            }
        } catch (error) {
            console.error('Error adding task:', error);
            showNotification('Error adding task', 'error');
        }
    }
    
    // ENHANCED: Task details modal with better animations and user experience
    async function openTaskDetails(taskId) {
        currentTaskId = taskId;
        const task = allTasks[taskId];
        if (!task) return;

        // Show loading state
        showModal('task-details-modal');
        const modal = document.getElementById('task-details-modal');
        modal.querySelector('.modal-content').innerHTML = `
            <span class="close-btn">&times;</span>
            <div style="text-align: center; padding: 2rem;">
                <div style="opacity: 0.6;">Loading task details...</div>
            </div>
        `;

        // **STEP 1: Clear ALL previous data first**
        clearTaskModal();

        // **STEP 2: Populate form with current task data**
        populateTaskForm(task);

        // **STEP 3: Fetch and render ONLY this task's subtasks and comments**
        await Promise.all([
            fetchAndRenderSubtasks(taskId),
            fetchAndRenderComments(taskId)
        ]);
        
        // Re-setup event listeners for the new modal content
        setupModalEventListeners();
    }

    function setupModalEventListeners() {
        const closeBtn = document.querySelector('#task-details-modal .close-btn');
        if (closeBtn) {
            closeBtn.onclick = () => {
                document.getElementById('task-details-modal').style.display = 'none';
                clearModalForms();
            };
        }
    }

    // NEW: Function to completely clear modal data
    function clearTaskModal() {
        const modal = document.getElementById('task-details-modal');
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-btn">&times;</span>
                <h2>Task Details</h2>
                <form id="edit-task-form">
                    <input type="hidden" id="edit-task-id">
                    
                    <label for="edit-task-content">Task Description</label>
                    <textarea id="edit-task-content" required></textarea>
                    
                    <label for="edit-task-priority">Priority</label>
                    <select id="edit-task-priority">
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                    </select>
                    
                    <label for="edit-task-due-date">Due Date</label>
                    <input type="date" id="edit-task-due-date">
                    
                    <label for="edit-task-assignee">Assignee</label>
                    <select id="edit-task-assignee" class="assignee-dropdown">
                        <option value="">Unassigned</option>
                    </select>
                    
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                </form>
                
                <div class="subtask-container">
                    <h4>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 12l2 2 4-4"/>
                            <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 9 4.03 9 9z"/>
                        </svg>
                        Subtasks
                    </h4>
                    <ul id="subtask-list" class="subtask-list"></ul>
                    <form id="add-subtask-form">
                        <input type="text" id="subtask-content" placeholder="Add a new subtask..." required>
                        <button type="submit" class="btn btn-secondary">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </button>
                    </form>
                </div>

                <div class="comment-container">
                    <h4>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        Comments
                    </h4>
                    <ul id="comment-list" class="comment-list"></ul>
                    <form id="add-comment-form">
                        <textarea id="comment-content" placeholder="Write a comment..." required></textarea>
                        <button type="submit" class="btn btn-primary">Add Comment</button>
                    </form>
                </div>
                
                <div class="modal-actions">
                    <button id="delete-task-btn" class="btn btn-danger">Delete Task</button>
                </div>
            </div>
        `;
        
        // Re-setup form event listeners
        document.getElementById('edit-task-form').addEventListener('submit', saveTaskDetails);
        document.getElementById('add-subtask-form').addEventListener('submit', addSubtask);
        document.getElementById('add-comment-form').addEventListener('submit', addComment);
    }

    // NEW: Function to populate task form
    function populateTaskForm(task) {
        const form = document.getElementById('edit-task-form');
        form.querySelector('#edit-task-id').value = task.id;
        form.querySelector('#edit-task-content').value = task.content;
        form.querySelector('#edit-task-priority').value = task.priority || 'medium';
        form.querySelector('#edit-task-due-date').value = task.due_date ? task.due_date.split(' ')[0] : '';
        form.querySelector('#edit-task-assignee').value = task.assignee_id || '';
        
        // Populate assignee dropdown
        populateAssigneeDropdowns();
        
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
                showNotification('Task updated successfully!', 'success');
            } else {
                throw new Error('Failed to update task');
            }
        } catch (error) {
            console.error('Error saving task:', error);
            showNotification('Error updating task', 'error');
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
                updateTaskCounts();
                showNotification('Task moved successfully!', 'success');
            }
        } catch (error) {
            console.error('Error updating task status:', error);
            showNotification('Error moving task', 'error');
        }
    }

    async function deleteTask(taskId) {
        if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) return;
        
        try {
            const response = await fetch(`/projects/${projectId}/tasks/${taskId}`, { 
                method: 'DELETE' 
            });
            
            if (response.ok) {
                document.getElementById('task-details-modal').style.display = 'none';
                await fetchTasks(); 
                showNotification('Task deleted successfully!', 'success');
            } else {
                throw new Error('Failed to delete task');
            }
        } catch (error) {
            console.error('Error deleting task:', error);
            showNotification('Error deleting task', 'error');
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
            showNotification('Error loading team members', 'error');
        }
    }

    function renderMembers() {
        const memberList = document.getElementById('member-list');
        memberList.innerHTML = '';
        members.forEach((member, index) => {
            const li = document.createElement('li');
            li.className = 'member-item';
            li.style.animationDelay = `${index * 0.1}s`;
            li.innerHTML = `
                <span>${escapeHTML(member.name)} (${escapeHTML(member.email)})</span> 
                <span class="member-role">${member.role}</span>
            `;
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
                showNotification('Member added successfully!', 'success');
            } else {
                showNotification(`Error: ${data.error}`, 'error');
            }
        } catch (error) {
            console.error('Error adding member:', error);
            showNotification('Error adding member', 'error');
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

    // --- ENHANCED Subtask Functions ---
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
            showNotification('Error loading subtasks', 'error');
        }
    }

    function renderSubtasks(subtasks) {
        const subtaskList = document.getElementById('subtask-list');
        subtaskList.innerHTML = ''; // Clear list
        
        if (!subtasks || !Array.isArray(subtasks)) return;
        
        subtasks.forEach((subtask, index) => {
            const li = document.createElement('li');
            li.className = `subtask-item ${subtask.is_complete ? 'completed' : ''}`;
            li.style.animationDelay = `${index * 0.1}s`;
            
            // Find the author of this subtask
            const author = members.find(member => member.user_id === subtask.created_by);
            const authorName = author ? author.name : 'Unknown';
            
            li.innerHTML = `
                <input type="checkbox" data-subtask-id="${subtask.id}" ${subtask.is_complete ? 'checked' : ''}>
                <span>${escapeHTML(subtask.content)}</span>
                <small style="color: var(--text-muted); font-style: italic; margin-left: auto;">by ${escapeHTML(authorName)}</small>
            `;
            
            // Add event listener for this specific checkbox
            const checkbox = li.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', (e) => {
                updateSubtaskStatus(subtask.id, e.target.checked);
                // Add visual feedback
                if (e.target.checked) {
                    li.style.animation = 'pulse 0.3s ease-in-out';
                }
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
                showNotification('Subtask added successfully!', 'success');
            } else {
                throw new Error('Failed to add subtask');
            }
        } catch (error) {
            console.error('Error adding subtask:', error);
            showNotification('Error adding subtask', 'error');
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
                showNotification(`Subtask ${isComplete ? 'completed' : 'reopened'}!`, 'success');
            }
        } catch (error) {
            console.error('Error updating subtask:', error);
            showNotification('Error updating subtask', 'error');
        }
    }
    
    // --- ENHANCED Comment Functions ---
    async function fetchAndRenderComments(taskId) {
        try {
            const response = await fetch(`/projects/${projectId}/tasks/${taskId}/comments`);
            if (response.ok) {
                const comments = await response.json();
                renderComments(comments);
            }
        } catch (error) {
            console.error('Error fetching comments:', error);
            showNotification('Error loading comments', 'error');
        }
    }
    
    function renderComments(comments) {
        const commentList = document.getElementById('comment-list');
        commentList.innerHTML = ''; // Clear list
        
        if (!comments || !Array.isArray(comments)) return;
        
        comments.forEach((comment, index) => {
            const li = document.createElement('li');
            li.className = 'comment-item';
            li.style.animationDelay = `${index * 0.1}s`;
            li.innerHTML = `
                <div class="comment-header">
                    <span class="comment-author">${escapeHTML(comment.author)}</span>
                    <span class="comment-date">${comment.created_at}</span>
                </div>
                <p class="comment-content">${escapeHTML(comment.content)}</p>
            `;
            commentList.appendChild(li);
        });
        
        // Scroll to bottom to show latest comments
        setTimeout(() => {
            commentList.scrollTop = commentList.scrollHeight;
        }, 100);
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
                showNotification('Comment added successfully!', 'success');
            } else {
                throw new Error('Failed to add comment');
            }
        } catch (error) {
            console.error('Error adding comment:', error);
            showNotification('Error adding comment', 'error');
        }
    }

    // --- Utility Functions ---
    function escapeHTML(str) {
        if (str === null || str === undefined) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span>${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 1.5rem',
            borderRadius: 'var(--border-radius)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: '9999',
            maxWidth: '400px',
            animation: 'slideInFromRight 0.3s ease-out',
            backgroundColor: getNotificationColor(type),
            color: 'white',
            fontWeight: '500'
        });
        
        // Add close functionality
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.onclick = () => removeNotification(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => removeNotification(notification), 5000);
    }

    function getNotificationColor(type) {
        const colors = {
            success: '#4facfe',
            error: '#ff416c',
            warning: '#ffa726',
            info: '#667eea'
        };
        return colors[type] || colors.info;
    }

    function removeNotification(notification) {
        notification.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    // Add some CSS for notifications
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInFromRight {
            from {
                opacity: 0;
                transform: translateX(100%);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        
        @keyframes fadeOut {
            from {
                opacity: 1;
                transform: translateX(0);
            }
            to {
                opacity: 0;
                transform: translateX(100%);
            }
        }
        
        .notification-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 1rem;
        }
        
        .notification-close {
            background: none;
            border: none;
            color: white;
            font-size: 1.2rem;
            cursor: pointer;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: background-color 0.2s;
        }
        
        .notification-close:hover {
            background-color: rgba(255, 255, 255, 0.2);
        }
        
        .task-due-date {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.8rem;
            color: var(--text-muted);
            margin-top: 0.5rem;
        }
        
        .task-due-date.overdue {
            color: #e53e3e;
        }
        
        .sortable-ghost {
            opacity: 0.4;
        }
        
        .sortable-chosen {
            transform: rotate(5deg);
        }
        
        .sortable-drag {
            transform: rotate(5deg);
            box-shadow: var(--shadow-xl);
        }
    `;
    document.head.appendChild(style);
});