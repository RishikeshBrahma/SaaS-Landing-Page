# config.py

class Config:
    # This key is used by Flask to securely sign the session cookie.
    SECRET_KEY = b'\x8a\x0e\x1f\x9b\xec\xbf\x8e\x0c\x1a\xde\x9a\x8d\x1b\x9e\x1f\x8e'

    # Database configuration for local development
    MYSQL_HOST = 'localhost'
    MYSQL_USER = 'root'
    MYSQL_PASSWORD = 'Rishi@2006'  # <-- Make sure this is your real password
    MYSQL_DB = 'saas_landing'