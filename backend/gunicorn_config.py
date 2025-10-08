"""
Gunicorn configuration for production deployment.
"""

import os
import multiprocessing

# Server socket
bind = f"{os.getenv('API_HOST', '0.0.0.0')}:{os.getenv('API_PORT', '5000')}"
backlog = 2048

# Worker processes
workers = int(os.getenv('WORKERS', multiprocessing.cpu_count() * 2 + 1))
worker_class = 'eventlet'  # For WebSocket support
worker_connections = 1000
timeout = int(os.getenv('WORKER_TIMEOUT', 120))
keepalive = 5

# Maximum requests per worker before restart (prevents memory leaks)
max_requests = 1000
max_requests_jitter = 50

# Logging
accesslog = os.getenv('GUNICORN_ACCESS_LOG', './logs/gunicorn_access.log')
errorlog = os.getenv('GUNICORN_ERROR_LOG', './logs/gunicorn_error.log')
loglevel = os.getenv('LOG_LEVEL', 'info').lower()
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = 'vision_inspection_system'

# Server mechanics
daemon = False  # Set to True to run as daemon
pidfile = './gunicorn.pid'
user = None  # Run as this user (None = current user)
group = None  # Run as this group
tmp_upload_dir = None

# SSL (for HTTPS)
# keyfile = '/path/to/keyfile'
# certfile = '/path/to/certfile'

# Server hooks
def on_starting(server):
    """Called just before the master process is initialized."""
    print("Gunicorn server starting...")


def when_ready(server):
    """Called just after the server is started."""
    print(f"Gunicorn server ready - listening on {bind}")


def on_exit(server):
    """Called just before exiting Gunicorn."""
    print("Gunicorn server shutting down...")


def worker_int(worker):
    """Called when a worker receives SIGINT or SIGQUIT signal."""
    print(f"Worker {worker.pid} received interrupt signal")


def pre_fork(server, worker):
    """Called just before a worker is forked."""
    pass


def post_fork(server, worker):
    """Called after a worker has been forked."""
    print(f"Worker spawned (pid: {worker.pid})")


def pre_exec(server):
    """Called before a new master process is forked."""
    print("Forking new master process")


def child_exit(server, worker):
    """Called after a worker has been exited."""
    print(f"Worker exited (pid: {worker.pid})")
