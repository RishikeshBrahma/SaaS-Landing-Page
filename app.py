from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_bcrypt import Bcrypt
import mysql.connector
from mysql.connector import pooling
from datetime import datetime
import sys
from functools import wraps
import os

app = Flask(__name__)

# --- Configuration from Environment Variables ---
# Reads all necessary credentials, including the port, from Render's environment
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY')
app.config['MYSQL_HOST'] = os.environ.get('MYSQL_HOST')
app.config['MYSQL_USER'] = os.environ.get('MYSQL_USER')
app.config['MYSQL_PASSWORD'] = os.environ.get('MYSQL_PASSWORD')
app.config['MYSQL_DB'] = os.environ.get('MYSQL_DB')
app.config['MYSQL_PORT'] = int(os.environ.get('MYSQL_PORT'))

bcrypt = Bcrypt(app)

# --- Database Connection Pool ---
# This block establishes a reliable connection to your Aiven database
db_pool = None
try:
    print("--- Attempting to create database connection pool... ---")
    db_pool = mysql.connector.pooling.MySQLConnectionPool(
        pool_name="saas_pool",
        pool_size=5,
        host=app.config['MYSQL_HOST'],
        user=app.config['MYSQL_USER'],
        password=app.config['MYSQL_PASSWORD'],
        database=app.config['MYSQL_DB'],
        port=app.config['MYSQL_PORT'],
        # These SSL settings are often required for secure cloud databases like Aiven
        ssl_ca=None,
        ssl_disabled=False,
        ssl_verify_cert=False
    )
    print("--- Database connection pool created successfully. ---")
except Exception as e:
    print(f"---!!! FAILED TO CREATE DATABASE CONNECTION POOL: {e} !!!---", file=sys.stderr)

def get_db_connection():
    if not db_pool:
        raise Exception("Database pool is not available.")
    return db_pool.get_connection()

# --- Decorators & Page Routes ---
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('logged_in'):
            return redirect(url_for('index'))
        return f(*args, **kwargs)
    return decorated_function

def project_member_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        project_id = kwargs.get('project_id')
        user_id = session.get('user_id')
        if not all([project_id, user_id]):
            return redirect(url_for('projects'))
        connection = get_db_connection()
        cur = connection.cursor()
        cur.execute("SELECT project_id FROM project_members WHERE project_id = %s AND user_id = %s", (project_id, user_id))
        member = cur.fetchone()
        cur.close()
        connection.close()
        if not member:
            return redirect(url_for('projects'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
def index():
    if session.get('logged_in'):
        return redirect(url_for('projects'))
    return render_template('index.html')

@app.route('/projects')
@login_required
def projects():
    connection = None
    try:
        user_id = session['user_id']
        connection = get_db_connection()
        cur = connection.cursor(dictionary=True)
        query = "SELECT p.id, p.name, u.name as owner_name FROM projects p JOIN project_members pm ON p.id = pm.project_id JOIN users u ON p.owner_id = u.id WHERE pm.user_id = %s"
        cur.execute(query, (user_id,))
        user_projects = cur.fetchall()
        cur.close()
        return render_template('projects.html', projects=user_projects, user_name=session.get('user_name'))
    except Exception as e:
        print(f"Error fetching projects: {e}", file=sys.stderr)
        return "Error loading projects.", 500
    finally:
        if connection and connection.is_connected():
            connection.close()

@app.route('/dashboard/<int:project_id>')
@login_required
@project_member_required
def dashboard(project_id):
    connection = None
    try:
        connection = get_db_connection()
        cur = connection.cursor(dictionary=True)
        cur.execute("SELECT name FROM projects WHERE id = %s", (project_id,))
        project = cur.fetchone()
        cur.close()
        if not project:
            return redirect(url_for('projects'))
        return render_template('dashboard.html', user_name=session.get('user_name'), project=project, project_id=project_id)
    except Exception as e:
        print(f"Error fetching project details: {e}", file=sys.stderr)
        return "Error loading board.", 500
    finally:
        if connection and connection.is_connected():
            connection.close()

# --- Project & Member Management APIs ---
@app.route('/projects', methods=['POST'])
@login_required
def create_project():
    connection = None
    try:
        user_id = session['user_id']
        data = request.get_json()
        name = data.get('name')
        if not name:
            return jsonify({'error': 'Project name is required'}), 400
        connection = get_db_connection()
        cur = connection.cursor()
        cur.execute("INSERT INTO projects (name, owner_id) VALUES (%s, %s)", (name, user_id))
        project_id = cur.lastrowid
        cur.execute("INSERT INTO project_members (project_id, user_id, role) VALUES (%s, %s, 'owner')", (project_id, user_id))
        connection.commit()
        cur.close()
        return jsonify({'status': 'success', 'project_id': project_id}), 201
    except Exception as e:
        print(f"Error creating project: {e}", file=sys.stderr)
        return jsonify({'error': 'Could not create project'}), 500
    finally:
        if connection and connection.is_connected():
            connection.close()

@app.route('/projects/<int:project_id>/members', methods=['GET'])
@login_required
@project_member_required
def get_members(project_id):
    connection = None
    try:
        connection = get_db_connection()
        cur = connection.cursor(dictionary=True)
        query = "SELECT u.id as user_id, u.name, u.email, pm.role FROM users u JOIN project_members pm ON u.id = pm.user_id WHERE pm.project_id = %s"
        cur.execute(query, (project_id,))
        members = cur.fetchall()
        cur.close()
        return jsonify(members)
    except Exception as e:
        print(f"Error fetching members: {e}", file=sys.stderr)
        return jsonify({'error': 'Could not fetch members'}), 500
    finally:
        if connection and connection.is_connected():
            connection.close()

@app.route('/projects/<int:project_id>/members', methods=['POST'])
@login_required
@project_member_required
def add_member(project_id):
    connection = None
    try:
        owner_id = session['user_id']
        connection = get_db_connection()
        cur = connection.cursor(dictionary=True)
        cur.execute("SELECT owner_id FROM projects WHERE id = %s", (project_id,))
        project = cur.fetchone()
        if not project or project['owner_id'] != owner_id:
            return jsonify({'error': 'Only the board owner can invite members'}), 403
        data = request.get_json()
        email_to_invite = data.get('email')
        if not email_to_invite:
            return jsonify({'error': 'Email is required'}), 400
        cur.execute("SELECT id FROM users WHERE email = %s", (email_to_invite,))
        user_to_invite = cur.fetchone()
        if not user_to_invite:
            return jsonify({'error': 'User with that email does not exist'}), 404
        user_id_to_invite = user_to_invite['id']
        cur.execute("INSERT INTO project_members (project_id, user_id, role) VALUES (%s, %s, 'member')", (project_id, user_id_to_invite))
        connection.commit()
        cur.close()
        return jsonify({'status': 'success', 'message': 'User invited successfully!'})
    except mysql.connector.Error as err:
        if err.errno == 1062:
            return jsonify({'error': 'This user is already a member of the board'}), 409
        print(f"Error adding member: {err}", file=sys.stderr)
        return jsonify({'error': 'Could not add member'}), 500
    finally:
        if connection and connection.is_connected():
            connection.close()

# --- Task & Subtask APIs ---
@app.route('/projects/<int:project_id>/tasks', methods=['GET'])
@login_required
@project_member_required
def get_tasks(project_id):
    connection = None
    try:
        connection = get_db_connection()
        cur = connection.cursor(dictionary=True)
        query = "SELECT t.id, t.content, t.status, t.priority, t.due_date, t.created_at, t.assignee_id, u.name as assignee_name, COUNT(c.id) as comment_count FROM tasks t LEFT JOIN users u ON t.assignee_id = u.id LEFT JOIN comments c ON t.id = c.task_id WHERE t.project_id = %s GROUP BY t.id ORDER BY t.created_at DESC"
        cur.execute(query, (project_id,))
        tasks_list = cur.fetchall()
        tasks = {task['id']: task for task in tasks_list}
        
        if tasks:
            task_ids = tuple(tasks.keys())
            
            # Handle case with single task_id to avoid trailing comma in SQL IN ()
            if len(task_ids) == 1:
                subtask_query = "SELECT id, content, is_complete, task_id FROM subtasks WHERE task_id = %s"
                cur.execute(subtask_query, (task_ids[0],))
            else:
                placeholders = ', '.join(['%s'] * len(task_ids))
                subtask_query = f"SELECT id, content, is_complete, task_id FROM subtasks WHERE task_id IN ({placeholders})"
                cur.execute(subtask_query, task_ids)

            subtasks = cur.fetchall()
            for task in tasks.values():
                task['subtasks'] = []
                if task.get('due_date'):
                    task['due_date'] = task['due_date'].strftime('%Y-%m-%d')
                if task.get('created_at'):
                    task['created_at'] = task['created_at'].strftime('%b %d, %Y')
            for subtask in subtasks:
                if subtask['task_id'] in tasks:
                    tasks[subtask['task_id']]['subtasks'].append(subtask)
        
        cur.close()
        grouped_tasks = {'todo': [], 'inprogress': [], 'done': []}
        for task in tasks.values():
            grouped_tasks.get(task['status'], []).append(task)
        return jsonify(grouped_tasks)
    except Exception as e:
        print(f"Error fetching tasks for project {project_id}: {e}", file=sys.stderr)
        return jsonify({'error': 'Could not fetch tasks'}), 500
    finally:
        if connection and connection.is_connected():
            connection.close()

@app.route('/projects/<int:project_id>/tasks', methods=['POST'])
@login_required
@project_member_required
def add_task(project_id):
    connection = None
    try:
        data = request.get_json()
        content, priority, due_date, assignee_id = data.get('content'), data.get('priority', 'medium'), data.get('due_date') or None, data.get('assignee_id') or None
        if not content:
            return jsonify({'error': 'Task content is required'}), 400
        connection = get_db_connection()
        cur = connection.cursor()
        cur.execute("INSERT INTO tasks (content, project_id, priority, due_date, assignee_id) VALUES (%s, %s, %s, %s, %s)", (content, project_id, priority, due_date, assignee_id))
        connection.commit()
        cur.close()
        return jsonify({'status': 'success'}), 201
    except Exception as e:
        print(f"Error adding task to project {project_id}: {e}", file=sys.stderr)
        return jsonify({'error': 'Could not add task'}), 500
    finally:
        if connection and connection.is_connected():
            connection.close()

@app.route('/projects/<int:project_id>/tasks/<int:task_id>', methods=['PUT'])
@login_required
@project_member_required
def update_task_details(project_id, task_id):
    connection = None
    try:
        data = request.get_json()
        content, priority, due_date, assignee_id = data.get('content'), data.get('priority'), data.get('due_date') or None, data.get('assignee_id') or None
        if not all([content, priority]):
            return jsonify({'error': 'Missing required fields'}), 400
        connection = get_db_connection()
        cur = connection.cursor()
        cur.execute("UPDATE tasks SET content = %s, priority = %s, due_date = %s, assignee_id = %s WHERE id = %s AND project_id = %s", (content, priority, due_date, assignee_id, task_id, project_id))
        connection.commit()
        cur.close()
        if cur.rowcount == 0:
            return jsonify({'error': 'Task not found in this project'}), 404
        return jsonify({'success': True})
    except Exception as e:
        print(f"Error updating task {task_id}: {e}", file=sys.stderr)
        return jsonify({'error': 'Could not update task'}), 500
    finally:
        if connection and connection.is_connected():
            connection.close()

@app.route('/projects/<int:project_id>/tasks/<int:task_id>/status', methods=['PUT'])
@login_required
@project_member_required
def update_task_status(project_id, task_id):
    connection = None
    try:
        data = request.get_json()
        new_status = data.get('status')
        if new_status not in ['todo', 'inprogress', 'done']:
            return jsonify({'error': 'Invalid status'}), 400
        connection = get_db_connection()
        cur = connection.cursor()
        cur.execute("UPDATE tasks SET status = %s WHERE id = %s AND project_id = %s", (new_status, task_id, project_id))
        connection.commit()
        cur.close()
        if cur.rowcount == 0:
            return jsonify({'error': 'Task not found in this project'}), 404
        return jsonify({'success': True})
    except Exception as e:
        print(f"Error updating task status for task {task_id}: {e}", file=sys.stderr)
        return jsonify({'error': 'Could not update task status'}), 500
    finally:
        if connection and connection.is_connected():
            connection.close()

@app.route('/projects/<int:project_id>/tasks/<int:task_id>', methods=['DELETE'])
@login_required
@project_member_required
def delete_task(project_id, task_id):
    connection = None
    try:
        connection = get_db_connection()
        cur = connection.cursor()
        cur.execute("DELETE FROM tasks WHERE id = %s AND project_id = %s", (task_id, project_id))
        connection.commit()
        cur.close()
        if cur.rowcount == 0:
            return jsonify({'error': 'Task not found in this project'}), 404
        return jsonify({'success': True})
    except Exception as e:
        print(f"Error deleting task {task_id}: {e}", file=sys.stderr)
        return jsonify({'error': 'Could not delete task'}), 500
    finally:
        if connection and connection.is_connected():
            connection.close()

@app.route('/projects/<int:project_id>/tasks/<int:task_id>/comments', methods=['GET'])
@login_required
@project_member_required
def get_comments(project_id, task_id):
    connection = None
    try:
        connection = get_db_connection()
        cur = connection.cursor(dictionary=True)
        query = "SELECT c.id, c.content, DATE_FORMAT(c.created_at, '%%b %%d, %%Y %%H:%%i') as created_at, u.name as author FROM comments c JOIN users u ON c.user_id = u.id WHERE c.task_id = %s ORDER BY c.created_at ASC"
        cur.execute(query, (task_id,))
        comments = cur.fetchall()
        cur.close()
        return jsonify(comments)
    except Exception as e:
        print(f"Error fetching comments: {e}", file=sys.stderr)
        return jsonify({'error': 'Could not fetch comments'}), 500
    finally:
        if connection and connection.is_connected():
            connection.close()

@app.route('/projects/<int:project_id>/tasks/<int:task_id>/comments', methods=['POST'])
@login_required
@project_member_required
def add_comment(project_id, task_id):
    connection = None
    try:
        user_id = session['user_id']
        data = request.get_json()
        content = data.get('content')
        if not content:
            return jsonify({'error': 'Comment content is required'}), 400
        connection = get_db_connection()
        cur = connection.cursor(dictionary=True)
        cur.execute("INSERT INTO comments (content, task_id, user_id) VALUES (%s, %s, %s)", (content, task_id, user_id))
        connection.commit()
        new_comment_id = cur.lastrowid
        cur.close()
        new_comment = {'id': new_comment_id, 'content': content, 'author': session.get('user_name'), 'created_at': datetime.now().strftime('%b %d, %Y %H:%M')}
        return jsonify(new_comment), 201
    except Exception as e:
        print(f"Error adding comment: {e}", file=sys.stderr)
        return jsonify({'error': 'Could not add comment'}), 500
    finally:
        if connection and connection.is_connected():
            connection.close()

@app.route('/projects/<int:project_id>/subtasks', methods=['POST'])
@login_required
@project_member_required
def add_subtask(project_id):
    connection = None
    try:
        data = request.get_json()
        content, task_id = data.get('content'), data.get('task_id')
        if not all([content, task_id]):
            return jsonify({'error': 'Content and task ID are required'}), 400
        connection = get_db_connection()
        cur = connection.cursor()
        cur.execute("SELECT id FROM tasks WHERE id = %s AND project_id = %s", (task_id, project_id))
        if cur.fetchone() is None:
            return jsonify({'error': 'Parent task not found in this project'}), 404
        cur.execute("INSERT INTO subtasks (content, task_id) VALUES (%s, %s)", (content, task_id))
        connection.commit()
        new_subtask_id = cur.lastrowid
        cur.close()
        return jsonify({'id': new_subtask_id, 'content': content, 'is_complete': False}), 201
    except Exception as e:
        print(f"Error adding subtask: {e}", file=sys.stderr)
        return jsonify({'error': 'Could not add subtask'}), 500
    finally:
        if connection and connection.is_connected():
            connection.close()

@app.route('/projects/<int:project_id>/subtasks/<int:subtask_id>', methods=['PUT'])
@login_required
@project_member_required
def update_subtask(project_id, subtask_id):
    connection = None
    try:
        data = request.get_json()
        is_complete = data.get('is_complete')
        if is_complete is None:
            return jsonify({'error': 'is_complete field is required'}), 400
        connection = get_db_connection()
        cur = connection.cursor()
        query = "UPDATE subtasks s JOIN tasks t ON s.task_id = t.id SET s.is_complete = %s WHERE s.id = %s AND t.project_id = %s"
        cur.execute(query, (is_complete, subtask_id, project_id))
        connection.commit()
        cur.close()
        if cur.rowcount == 0:
            return jsonify({'error': 'Subtask not found in this project'}), 404
        return jsonify({'success': True})
    except Exception as e:
        print(f"Error updating subtask: {e}", file=sys.stderr)
        return jsonify({'error': 'Could not update subtask'}), 500
    finally:
        if connection and connection.is_connected():
            connection.close()

# --- Authentication Routes ---
@app.route('/signup', methods=['POST'])
def signup():
    connection = None
    try:
        data = request.get_json()
        if not data or not data.get('name') or not data.get('email') or not data.get('password'):
            return jsonify({'status': 'error', 'message': 'Name, email, and password are required'}), 400
        name, email, password = data.get('name'), data.get('email'), data.get('password')
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        timestamp = datetime.now()
        connection = get_db_connection()
        cur = connection.cursor()
        cur.execute("INSERT INTO users(name, email, password, timestamp) VALUES (%s, %s, %s, %s)", (name, email, hashed_password, timestamp))
        connection.commit()
        cur.close()
        return jsonify({'status': 'success', 'message': 'Thank you for signing up! You can now log in.'})
    except mysql.connector.Error as err:
        if err.errno == 1062:
            return jsonify({'status': 'error', 'message': 'This email address is already registered.'}), 409
        print(f"A database error occurred in signup: {err}", file=sys.stderr)
        return jsonify({'status': 'error', 'message': 'A server error occurred. Please try again.'}), 500
    finally:
        if connection and connection.is_connected():
            connection.close()

@app.route('/login', methods=['POST'])
def login():
    connection = None
    try:
        data = request.get_json()
        email, password = data.get('email'), data.get('password')
        connection = get_db_connection()
        cur = connection.cursor(dictionary=True)
        cur.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cur.fetchone()
        cur.close()
        if user and bcrypt.check_password_hash(user['password'], password):
            session['logged_in'], session['user_id'], session['user_name'] = True, user['id'], user['name']
            return jsonify({'status': 'success', 'message': 'Login successful!', 'redirect_url': url_for('projects')})
        else:
            return jsonify({'status': 'error', 'message': 'Invalid email or password.'}), 401
    except Exception as e:
        print(f"A database error occurred in login: {e}", file=sys.stderr)
        return jsonify({'status': 'error', 'message': 'A server error occurred. Please try again.'}), 500
    finally:
        if connection and connection.is_connected():
            connection.close()

@app.route('/logout')
@login_required
def logout():
    session.clear()
    return redirect(url_for('index'))

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)
# config.py