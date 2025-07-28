import os

class Config:
    # This key is used by Flask to securely sign the session cookie.
    SECRET_KEY = os.environ.get('SECRET_KEY', b'\x8a\x0e\x1f\x9b\xec\xbf\x8e\x0c\x1a\xde\x9a\x8d\x1b\x9e\x1f\x8e')

    # Database configuration for production
    MYSQL_HOST = os.environ.get('MYSQL_HOST', 'localhost')
    MYSQL_USER = os.environ.get('MYSQL_USER', 'root')
    MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD', 'Rishi@2006')
    MYSQL_DB = os.environ.get('MYSQL_DB', 'saas_landing')