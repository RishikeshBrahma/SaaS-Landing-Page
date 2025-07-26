from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_bcrypt import Bcrypt
import mysql.connector
from mysql.connector import pooling
from datetime import datetime
import sys
from functools import wraps

app = Flask(__name__)
app.config.from_object('config.Config')
bcrypt = Bcrypt(app)

# --- Database Connection Pool ---
try:
    db_pool = mysql.connector.pooling.MySQLConnectionPool(
        pool_name="saas_pool",
        pool_size=5,
        host=app.config['MYSQL_HOST'],
        user=app.config['MYSQL_USER'],
        password=app.config['MYSQL_PASSWORD'],
        database=app.config['MYSQL_DB']
    )
    print("--- Database connection pool created successfully. ---")
except Exception as e:
    print(f"---!!! FAILED TO CREATE DATABASE CONNECTION POOL: {e} !!!---", file=sys.stderr)
    db_pool = None

def get_db_connection():
    if not db_pool: raise Exception("Database pool is not available.")
    return db_pool.get_connection()

# --- Decorators & Page Routes ---
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('logged_in'): return redirect(url_for('index'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
def index():
    if session.get('logged_in'): return redirect(url_for('dashboard'))
    return render_template('index.html')

@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html', user_name=session.get('user_name'))

# --- Task Management API ---
@app.route('/tasks', methods=['GET'])
@login_required
def get_tasks():
    connection = None
    try:
        user_id = session['user_id']
        connection = get_db_connection()
        cur = connection.cursor(dictionary=True)
        
        cur.execute("SELECT id, content, status, priority, due_date, created_at FROM tasks WHERE user_id = %s ORDER BY created_at DESC", (user_id,))
        tasks = {task['id']: task for task in cur.fetchall()}

        if tasks:
            task_ids = tuple(tasks.keys())
            
            # --- THIS IS THE CORRECTED LOGIC ---
            # Create a string of placeholders like '%s, %s, %s'
            placeholders = ', '.join(['%s'] * len(task_ids))
            # Build the full query safely
            subtask_query = f"SELECT id, content, is_complete, task_id FROM subtasks WHERE task_id IN ({placeholders})"
            
            cur.execute(subtask_query, task_ids)
            subtasks = cur.fetchall()
            
            for task in tasks.values():
                task['subtasks'] = []
                if task.get('due_date'): task['due_date'] = task['due_date'].strftime('%Y-%m-%d')
                if task.get('created_at'): task['created_at'] = task['created_at'].strftime('%b %d, %Y')

            for subtask in subtasks:
                if subtask['task_id'] in tasks:
                    tasks[subtask['task_id']]['subtasks'].append(subtask)

        cur.close()

        grouped_tasks = {'todo': [], 'inprogress': [], 'done': []}
        for task in tasks.values():
            grouped_tasks[task['status']].append(task)
            
        return jsonify(grouped_tasks)
    except Exception as e:
        print(f"Error fetching tasks: {e}", file=sys.stderr)
        return jsonify({'error': 'Could not fetch tasks'}), 500
    finally:
        if connection and connection.is_connected(): connection.close()

@app.route('/tasks', methods=['POST'])
@login_required
def add_task():
    connection = None
    try:
        user_id = session['user_id']
        data = request.get_json()
        content = data.get('content')
        priority = data.get('priority', 'medium')
        due_date = data.get('due_date') or None
        if not content: return jsonify({'error': 'Task content is required'}), 400

        connection = get_db_connection()
        cur = connection.cursor()
        cur.execute("INSERT INTO tasks (content, user_id, priority, due_date) VALUES (%s, %s, %s, %s)", (content, user_id, priority, due_date))
        connection.commit()
        new_task_id = cur.lastrowid
        cur.close()
        
        return jsonify({'id': new_task_id, 'content': content, 'status': 'todo', 'priority': priority, 'due_date': due_date, 'created_at': datetime.now().strftime('%b %d, %Y'), 'subtasks': []}), 201
    except Exception as e:
        print(f"Error adding task: {e}", file=sys.stderr)
        return jsonify({'error': 'Could not add task'}), 500
    finally:
        if connection and connection.is_connected(): connection.close()

@app.route('/tasks/<int:task_id>', methods=['PUT'])
@login_required
def update_task_details(task_id):
    connection = None
    try:
        user_id = session['user_id']
        data = request.get_json()
        content, priority, due_date = data.get('content'), data.get('priority'), data.get('due_date') or None
        if not all([content, priority]): return jsonify({'error': 'Missing required fields'}), 400

        connection = get_db_connection()
        cur = connection.cursor()
        cur.execute("UPDATE tasks SET content = %s, priority = %s, due_date = %s WHERE id = %s AND user_id = %s", (content, priority, due_date, task_id, user_id))
        connection.commit()
        cur.close()
        if cur.rowcount == 0: return jsonify({'error': 'Task not found or not owned by user'}), 404
        return jsonify({'success': True})
    except Exception as e:
        print(f"Error updating task details: {e}", file=sys.stderr)
        return jsonify({'error': 'Could not update task'}), 500
    finally:
        if connection and connection.is_connected(): connection.close()

@app.route('/tasks/<int:task_id>/status', methods=['PUT'])
@login_required
def update_task_status(task_id):
    connection = None
    try:
        user_id = session['user_id']
        data = request.get_json()
        new_status = data.get('status')
        if new_status not in ['todo', 'inprogress', 'done']: return jsonify({'error': 'Invalid status'}), 400
        connection = get_db_connection()
        cur = connection.cursor()
        cur.execute("UPDATE tasks SET status = %s WHERE id = %s AND user_id = %s", (new_status, task_id, user_id))
        connection.commit()
        cur.close()
        if cur.rowcount == 0: return jsonify({'error': 'Task not found or not owned by user'}), 404
        return jsonify({'success': True})
    except Exception as e:
        print(f"Error updating task status: {e}", file=sys.stderr)
        return jsonify({'error': 'Could not update task status'}), 500
    finally:
        if connection and connection.is_connected(): connection.close()

@app.route('/tasks/<int:task_id>', methods=['DELETE'])
@login_required
def delete_task(task_id):
    connection = None
    try:
        user_id = session['user_id']
        connection = get_db_connection()
        cur = connection.cursor()
        cur.execute("DELETE FROM tasks WHERE id = %s AND user_id = %s", (task_id, user_id))
        connection.commit()
        cur.close()
        if cur.rowcount == 0: return jsonify({'error': 'Task not found or not owned by user'}), 404
        return jsonify({'success': True})
    except Exception as e:
        print(f"Error deleting task: {e}", file=sys.stderr)
        return jsonify({'error': 'Could not delete task'}), 500
    finally:
        if connection and connection.is_connected(): connection.close()

@app.route('/subtasks', methods=['POST'])
@login_required
def add_subtask():
    connection = None
    try:
        user_id = session['user_id']
        data = request.get_json()
        content, task_id = data.get('content'), data.get('task_id')
        if not all([content, task_id]): return jsonify({'error': 'Content and task ID are required'}), 400
        connection = get_db_connection()
        cur = connection.cursor()
        cur.execute("SELECT id FROM tasks WHERE id = %s AND user_id = %s", (task_id, user_id))
        if cur.fetchone() is None: return jsonify({'error': 'Parent task not found'}), 404
        cur.execute("INSERT INTO subtasks (content, task_id) VALUES (%s, %s)", (content, task_id))
        connection.commit()
        new_subtask_id = cur.lastrowid
        cur.close()
        return jsonify({'id': new_subtask_id, 'content': content, 'is_complete': False}), 201
    except Exception as e:
        print(f"Error adding subtask: {e}", file=sys.stderr)
        return jsonify({'error': 'Could not add subtask'}), 500
    finally:
        if connection and connection.is_connected(): connection.close()

@app.route('/subtasks/<int:subtask_id>', methods=['PUT'])
@login_required
def update_subtask(subtask_id):
    connection = None
    try:
        user_id = session['user_id']
        data = request.get_json()
        is_complete = data.get('is_complete')
        connection = get_db_connection()
        cur = connection.cursor()
        query = "UPDATE subtasks s JOIN tasks t ON s.task_id = t.id SET s.is_complete = %s WHERE s.id = %s AND t.user_id = %s"
        cur.execute(query, (is_complete, subtask_id, user_id))
        connection.commit()
        cur.close()
        if cur.rowcount == 0: return jsonify({'error': 'Subtask not found or not owned by user'}), 404
        return jsonify({'success': True})
    except Exception as e:
        print(f"Error updating subtask: {e}", file=sys.stderr)
        return jsonify({'error': 'Could not update subtask'}), 500
    finally:
        if connection and connection.is_connected(): connection.close()

# --- Authentication Routes ---
@app.route('/signup', methods=['POST'])
def signup():
    connection = None
    try:
        data = request.get_json()
        if not data or not data.get('name') or not data.get('email') or not data.get('password'): return jsonify({'status': 'error', 'message': 'Name, email, and password are required'}), 400
        name, email, password = data.get('name'), data.get('email'), data.get('password')
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        timestamp = datetime.now()
        connection = get_db_connection()
        cur = connection.cursor()
        cur.execute("INSERT INTO users(name, email, password, timestamp) VALUES (%s, %s, %s, %s)", (name, email, hashed_password, timestamp))
        connection.commit()
        cur.close()
        return jsonify({'status': 'success', 'message': 'Thank you for signing up! You can now log in.'})
    except Exception as e:
        if '1062' in str(e): return jsonify({'status': 'error', 'message': 'This email address is already registered.'}), 400
        print(f"A database error occurred in signup: {e}", file=sys.stderr)
        return jsonify({'status': 'error', 'message': 'A server error occurred. Please try again.'}), 500
    finally:
        if connection and connection.is_connected(): connection.close()

@app.route('/login', methods=['POST'])
def login():
    connection = None
    try:
        data = request.get_json()
        if not data or not data.get('email') or not data.get('password'): return jsonify({'status': 'error', 'message': 'Email and password are required'}), 400
        email, password = data.get('email'), data.get('password')
        connection = get_db_connection()
        cur = connection.cursor(dictionary=True)
        cur.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cur.fetchone()
        cur.close()
        if user and bcrypt.check_password_hash(user['password'], password):
            session['logged_in'], session['user_id'], session['user_name'] = True, user['id'], user['name']
            return jsonify({'status': 'success', 'message': 'Login successful!', 'redirect_url': url_for('dashboard')})
        else:
            return jsonify({'status': 'error', 'message': 'Invalid email or password.'}), 401
    except Exception as e:
        print(f"A database error occurred in login: {e}", file=sys.stderr)
        return jsonify({'status': 'error', 'message': 'A server error occurred. Please try again.'}), 500
    finally:
        if connection and connection.is_connected(): connection.close()

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True)
