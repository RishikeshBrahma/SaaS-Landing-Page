from flask import Flask, render_template, request, jsonify
import mysql.connector
from datetime import datetime
import config
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.DEBUG)

# Database connection
def get_db_connection():
    return mysql.connector.connect(**config.DB_CONFIG)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/subscribe', methods=['POST'])
def subscribe():
    email = request.form.get('email')
    if not email:
        return jsonify({'error': 'Email is required'}), 400
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('INSERT INTO subscribers (email, timestamp) VALUES (%s, %s)',
                       (email, datetime.now().strftime('%Y-%m-%d %H:%M:%S')))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Subscribed successfully!'}), 200
    except mysql.connector.IntegrityError:
        conn.close()
        return jsonify({'error': 'Email already subscribed'}), 400
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/signup', methods=['POST'])
def signup():
    email = request.form.get('email')
    name = request.form.get('name')
    logging.debug(f'Received data: email={email}, name={name}')  # Debug log
    if not email or not name:
        return jsonify({'error': 'Email and name are required'}), 400
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('INSERT INTO users (email, name, timestamp) VALUES (%s, %s, %s)',
                       (email, name, datetime.now().strftime('%Y-%m-%d %H:%M:%S')))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Sign-up successful! Check your email for next steps.'}), 200
    except mysql.connector.IntegrityError:
        conn.close()
        return jsonify({'error': 'Email already registered'}), 400
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)