# test_db.py
import mysql.connector
from mysql.connector import errorcode

# --- IMPORTANT ---
# Enter the EXACT SAME details here that are in your config.py file.
# Especially the password.
DB_CONFIG = {
    'user': 'root',
    'password': 'Rishi@2006', # <-- CHANGE THIS
    'host': 'localhost',
    'database': 'saas_landing'
}

print("--- Attempting to connect to MySQL ---")
print(f"Using User: {DB_CONFIG['user']}")
print(f"Using Host: {DB_CONFIG['host']}")
print(f"Using Database: {DB_CONFIG['database']}")

try:
    # Attempt to connect
    cnx = mysql.connector.connect(**DB_CONFIG)
    print("\n>>> SUCCESS: Connection to the database was successful!")
    cnx.close()

except mysql.connector.Error as err:
    print("\n>>> FAILURE: The connection failed.")
    if err.errno == errorcode.ER_ACCESS_DENIED_ERROR:
        print(">>> REASON: Access denied. Something is wrong with your user name or password.")
    elif err.errno == errorcode.ER_BAD_DB_ERROR:
        print(f">>> REASON: The database '{DB_CONFIG['database']}' does not exist.")
    else:
        print(f">>> REASON: {err}")

print("\n--- Test finished ---")

