"""Vision Inspection System - Main Flask Application"""

import os
import sys
import yaml
from flask import Flask
from flask_cors import CORS

# Add backend directory to path
sys.path.insert(0, os.path.dirname(__file__))

from src.api.routes import api, init_api
from src.api.websocket import socketio, init_websocket
from src.database.db_manager import DatabaseManager, set_db
from src.core.program_manager import ProgramManager
from src.hardware.camera import CameraController
from src.hardware.gpio_controller import GPIOController
from src.utils.logger import setup_logging, get_logger


def load_config(config_path='config.yaml'):
    """Load configuration from YAML file."""
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"Configuration file not found: {config_path}")
    
    with open(config_path, 'r') as f:
        return yaml.safe_load(f)


def create_app(config_path='config.yaml'):
    """
    Application factory pattern.
    Creates and configures the Flask application.
    """
    # Load configuration
    try:
        config = load_config(config_path)
    except Exception as e:
        print(f"Error loading configuration: {e}")
        sys.exit(1)
    
    # Setup logging
    try:
        setup_logging(config.get('logging', {}))
        logger = get_logger('app')
        logger.info("=== Vision Inspection System Starting ===")
        logger.info(f"System: {config['system']['name']} v{config['system']['version']}")
    except Exception as e:
        print(f"Error setting up logging: {e}")
        sys.exit(1)
    
    # Initialize Flask app
    app = Flask(__name__)
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    app.config.from_mapping(config)
    
    # Setup CORS
    cors_origins = config.get('api', {}).get('cors_origins', ['http://localhost:3000'])
    CORS(app, resources={r"/api/*": {"origins": cors_origins}})
    logger.info(f"CORS enabled for origins: {cors_origins}")
    
    # Initialize database
    try:
        logger.info("Initializing database...")
        db_manager = DatabaseManager(config['database']['path'])
        set_db(db_manager)
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        sys.exit(1)
    
    # Initialize hardware controllers
    try:
        logger.info("Initializing hardware controllers...")
        
        # Camera
        resolution = tuple(config.get('camera', {}).get('resolution', [640, 480]))
        camera_controller = CameraController(resolution=resolution)
        logger.info("Camera controller initialized")
        
        # GPIO
        gpio_pins = config.get('gpio', {}).get('outputs', [17, 18, 27, 22, 23, 24, 25, 8])
        gpio_controller = GPIOController(output_pins=gpio_pins)
        logger.info("GPIO controller initialized")
        
    except Exception as e:
        logger.warning(f"Hardware initialization warning: {e}")
        logger.info("Continuing with simulated hardware for development")
        camera_controller = CameraController()
        gpio_controller = GPIOController()
    
    # Initialize program manager
    try:
        logger.info("Initializing program manager...")
        storage_config = config.get('storage', {})
        program_manager = ProgramManager(db_manager, storage_config)
        logger.info("Program manager initialized")
    except Exception as e:
        logger.error(f"Program manager initialization failed: {e}")
        sys.exit(1)
    
    # Initialize API with dependencies
    init_api(program_manager, camera_controller, gpio_controller)
    logger.info("API initialized")
    
    # Register blueprints
    app.register_blueprint(api, url_prefix='/api')
    logger.info("API blueprint registered")
    
    # Initialize SocketIO with dependencies
    socketio.init_app(
        app,
        cors_allowed_origins=cors_origins,
        async_mode='threading',
        logger=False,
        engineio_logger=False
    )
    init_websocket(program_manager, camera_controller, db_manager)
    logger.info("WebSocket initialized")
    
    # Add health check route at root
    @app.route('/')
    def index():
        return {
            'name': config['system']['name'],
            'version': config['system']['version'],
            'status': 'running'
        }
    
    # Add cleanup handler
    @app.teardown_appcontext
    def cleanup(error=None):
        """Cleanup resources on shutdown."""
        if error:
            logger.error(f"Application error: {error}")
    
    logger.info("Application initialization complete")
    logger.info(f"API available at: http://{config['api']['host']}:{config['api']['port']}/api")
    
    return app


def main():
    """Main entry point."""
    # Get config path from environment or use default
    config_path = os.environ.get('CONFIG_PATH', 'config.yaml')
    
    # Create app
    app = create_app(config_path)
    
    # Load config for server settings
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
    
    # Get server settings
    host = config.get('api', {}).get('host', '0.0.0.0')
    port = config.get('api', {}).get('port', 5000)
    debug = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    
    logger = get_logger('app')
    logger.info(f"Starting server on {host}:{port} (debug={debug})")
    
    # Run with SocketIO
    try:
        socketio.run(
            app,
            host=host,
            port=port,
            debug=debug,
            use_reloader=debug,
            allow_unsafe_werkzeug=True  # Allow Werkzeug for development
        )
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()

