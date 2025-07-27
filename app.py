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
# We now also get the port number
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY')
app.config['MYSQL_HOST'] = os.environ.get('MYSQL_HOST')
app.config['MYSQL_USER'] = os.environ.get('MYSQL_USER')
app.config['MYSQL_PASSWORD'] = os.environ.get('MYSQL_PASSWORD')
app.config['MYSQL_DB'] = os.environ.get('MYSQL_DB')
app.config['MYSQL_PORT'] = int(os.environ.get('MYSQL_PORT')) # Convert port to integer

bcrypt = Bcrypt(app)

# --- Database Connection Pool ---
db_pool = None # Initialize db_pool as None
try:
    print("--- Attempting to create database connection pool... ---")
    db_pool = mysql.connector.pooling.MySQLConnectionPool(
        pool_name="saas_pool",
        pool_size=5,
        host=app.config['MYSQL_HOST'],
        user=app.config['MYSQL_USER'],
        password=app.config['MYSQL_PASSWORD'],
        database=app.config['MYSQL_DB'],
        port=app.config['MYSQL_PORT'], # <-- THE CRITICAL FIX IS HERE
        ssl_ca=None, 
        ssl_disabled=False,
        ssl_verify_cert=False
    )
    print("--- Database connection pool created successfully. ---")
except Exception as e:
    print(f"---!!! FAILED TO CREATE DATABASE CONNECTION POOL: {e} !!!---", file=sys.stderr)
    # db_pool remains None if it fails

def get_db_connection():
    if not db_pool:
        print("---!!! DB pool is not available. Cannot get connection. !!!---", file=sys.stderr)
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

# (Paste the rest of your original app.py routes here)

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
def dashboard(project_id):
    # This is just an example, you need to add all your routes back
    pass 

# ... (and so on for all your routes)


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)
# config.py 