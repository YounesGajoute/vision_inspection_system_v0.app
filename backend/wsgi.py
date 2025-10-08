"""
WSGI entry point for production deployment.
Use with Gunicorn or uWSGI.
"""

import os
import sys

# Add backend directory to path
sys.path.insert(0, os.path.dirname(__file__))

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Import application factory
from app import create_app, socketio

# Create application instance
app = create_app()

# For Gunicorn with gevent/eventlet workers
application = app

if __name__ == '__main__':
    # This is used for development only
    # In production, use: gunicorn -c gunicorn_config.py wsgi:application
    socketio.run(app, host='0.0.0.0', port=5000)
