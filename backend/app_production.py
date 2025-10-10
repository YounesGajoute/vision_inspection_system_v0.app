"""
Production-ready Flask application with all enhancements.
This is the main application factory with complete error handling,
authentication, rate limiting, and monitoring.
"""

import os
import sys
import traceback
from flask import Flask, jsonify, g
from flask_cors import CORS

# Add backend directory to path
sys.path.insert(0, os.path.dirname(__file__))

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Import configuration
from config.config import get_config

# Import core components
from src.database.db_manager import DatabaseManager, set_db
from src.core.program_manager import ProgramManager
from src.hardware.camera import CameraController
from src.hardware.gpio_controller import GPIOController

# Import API components
from src.api.routes import api, init_api
from src.api.auth_routes import auth_bp
from src.api.health import health_bp
from src.api.websocket import socketio, init_websocket
from src.api.middleware import init_middleware
from src.api.rate_limiter import init_rate_limiter
from src.api.auth import init_auth_service

# Import logging
from src.utils.logging_config import setup_logging, get_logger

# Import exceptions
from src.utils.exceptions import (
    VisionSystemError, ValidationError, AuthenticationError,
    CameraError, InspectionError, DatabaseError, HardwareError,
    ImageProcessingError, RateLimitExceededError
)


def create_app(config_name=None):
    """
    Application factory pattern.
    Creates and configures the Flask application with all production features.
    
    Args:
        config_name: Configuration name (development, production, testing)
                     If None, uses FLASK_ENV environment variable
    
    Returns:
        Configured Flask application
    """
    # Get configuration
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')
    
    config = get_config(config_name)
    
    # Initialize Flask app
    app = Flask(__name__)
    app.config.from_object(config)
    
    # Initialize configuration
    config.init_app(app)
    
    # Setup logging
    logger = setup_logging(app.config)
    logger.info("=== Vision Inspection System Starting ===")
    logger.info(f"Environment: {config_name}")
    logger.info(f"Debug mode: {app.config['DEBUG']}")
    
    # Setup CORS
    CORS(app, resources={
        r"/api/*": {
            "origins": config.CORS_ORIGINS,
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "X-Request-ID"],
            "expose_headers": ["X-Request-ID"],
            "supports_credentials": True
        }
    })
    logger.info(f"CORS enabled for origins: {config.CORS_ORIGINS}")
    
    # Initialize middleware
    init_middleware(app, config)
    logger.info("Middleware initialized")
    
    # Initialize database
    try:
        logger.info("Initializing database...")
        db_path = config.DATABASE_URL.replace('sqlite:///', '')
        db_manager = DatabaseManager(db_path)
        set_db(db_manager)
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        if config_name == 'production':
            sys.exit(1)
        else:
            logger.warning("Continuing without database in development mode")
    
    # Initialize authentication service
    try:
        auth_service = init_auth_service(db_manager, config)
        logger.info("Authentication service initialized")
    except Exception as e:
        logger.error(f"Auth service initialization failed: {e}")
        if config_name == 'production':
            sys.exit(1)
    
    # Initialize hardware controllers
    try:
        logger.info("Initializing hardware controllers...")
        
        # Camera
        camera_controller = CameraController(
            resolution=config.CAMERA_RESOLUTION,
            camera_device=config.CAMERA_DEVICE
        )
        logger.info("Camera controller initialized")
        
        # GPIO
        gpio_controller = GPIOController(output_pins=config.GPIO_PINS)
        logger.info("GPIO controller initialized")
        
    except Exception as e:
        logger.warning(f"Hardware initialization warning: {e}")
        logger.info("Continuing with simulated hardware")
        camera_controller = CameraController(
            resolution=config.CAMERA_RESOLUTION,
            camera_device=config.CAMERA_DEVICE
        )
        gpio_controller = GPIOController()
    
    # Initialize program manager
    try:
        logger.info("Initializing program manager...")
        storage_config = {
            'master_images': config.STORAGE_MASTER_IMAGES,
            'inspection_history': config.STORAGE_INSPECTION_IMAGES,
            'backups': config.STORAGE_BACKUP
        }
        program_manager = ProgramManager(db_manager, storage_config)
        logger.info("Program manager initialized")
    except Exception as e:
        logger.error(f"Program manager initialization failed: {e}")
        if config_name == 'production':
            sys.exit(1)
    
    # Initialize API with dependencies
    init_api(program_manager, camera_controller, gpio_controller)
    logger.info("API initialized")
    
    # Register blueprints
    app.register_blueprint(api, url_prefix='/api/v1')
    app.register_blueprint(auth_bp)
    app.register_blueprint(health_bp)
    logger.info("API blueprints registered")
    
    # Initialize rate limiting
    init_rate_limiter(app, config)
    
    # Initialize SocketIO
    socketio.init_app(
        app,
        cors_allowed_origins=config.CORS_ORIGINS,
        async_mode='eventlet',
        logger=False,
        engineio_logger=False
    )
    init_websocket(program_manager, camera_controller, db_manager, gpio_controller)
    logger.info("WebSocket initialized")
    
    # ==================== GLOBAL ERROR HANDLERS ====================
    
    @app.errorhandler(ValidationError)
    def handle_validation_error(error):
        """Handle validation errors."""
        logger.warning(f"Validation error: {error.message}")
        return jsonify({
            'success': False,
            'error': error.error_code,
            'message': error.message,
            'details': error.details
        }), 400
    
    @app.errorhandler(AuthenticationError)
    def handle_authentication_error(error):
        """Handle authentication errors."""
        logger.warning(f"Authentication error: {error.message}")
        return jsonify({
            'success': False,
            'error': error.error_code,
            'message': error.message
        }), 401
    
    @app.errorhandler(DatabaseError)
    def handle_database_error(error):
        """Handle database errors."""
        logger.error(f"Database error: {error.message}")
        return jsonify({
            'success': False,
            'error': error.error_code,
            'message': 'Database operation failed',
            'details': error.details if app.debug else {}
        }), 500
    
    @app.errorhandler(CameraError)
    def handle_camera_error(error):
        """Handle camera errors."""
        logger.error(f"Camera error: {error.message}")
        return jsonify({
            'success': False,
            'error': error.error_code,
            'message': error.message,
            'details': error.details if app.debug else {}
        }), 503
    
    @app.errorhandler(InspectionError)
    def handle_inspection_error(error):
        """Handle inspection errors."""
        logger.error(f"Inspection error: {error.message}")
        return jsonify({
            'success': False,
            'error': error.error_code,
            'message': error.message,
            'details': error.details if app.debug else {}
        }), 500
    
    @app.errorhandler(HardwareError)
    def handle_hardware_error(error):
        """Handle hardware errors."""
        logger.error(f"Hardware error: {error.message}")
        return jsonify({
            'success': False,
            'error': error.error_code,
            'message': error.message
        }), 503
    
    @app.errorhandler(ImageProcessingError)
    def handle_image_processing_error(error):
        """Handle image processing errors."""
        logger.error(f"Image processing error: {error.message}")
        return jsonify({
            'success': False,
            'error': error.error_code,
            'message': error.message
        }), 500
    
    @app.errorhandler(VisionSystemError)
    def handle_vision_system_error(error):
        """Handle generic vision system errors."""
        logger.error(f"System error: {error.message}")
        return jsonify({
            'success': False,
            'error': error.error_code,
            'message': error.message,
            'details': error.details if app.debug else {}
        }), 500
    
    @app.errorhandler(404)
    def handle_not_found(error):
        """Handle 404 errors."""
        return jsonify({
            'success': False,
            'error': 'NOT_FOUND',
            'message': 'Resource not found'
        }), 404
    
    @app.errorhandler(405)
    def handle_method_not_allowed(error):
        """Handle 405 errors."""
        return jsonify({
            'success': False,
            'error': 'METHOD_NOT_ALLOWED',
            'message': 'Method not allowed for this endpoint'
        }), 405
    
    @app.errorhandler(500)
    def handle_internal_error(error):
        """Handle 500 errors."""
        logger.error(f"Internal server error: {error}")
        return jsonify({
            'success': False,
            'error': 'INTERNAL_SERVER_ERROR',
            'message': 'An internal error occurred'
        }), 500
    
    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        """Handle all uncaught exceptions."""
        logger.error(f"Unhandled exception: {error}\n{traceback.format_exc()}")
        
        # In production, don't expose internal details
        if app.debug:
            return jsonify({
                'success': False,
                'error': 'UNEXPECTED_ERROR',
                'message': str(error),
                'traceback': traceback.format_exc()
            }), 500
        else:
            return jsonify({
                'success': False,
                'error': 'UNEXPECTED_ERROR',
                'message': 'An unexpected error occurred'
            }), 500
    
    # ==================== ROOT ENDPOINTS ====================
    
    @app.route('/')
    def index():
        """Root endpoint with API information."""
        return jsonify({
            'name': config.APP_NAME,
            'version': config.APP_VERSION,
            'status': 'running',
            'api_version': 'v1',
            'endpoints': {
                'health': '/api/v1/health',
                'api_docs': '/api/v1/docs',
                'programs': '/api/v1/programs',
                'authentication': '/api/v1/auth'
            }
        })
    
    @app.route('/api/v1/docs')
    def api_docs():
        """API documentation endpoint."""
        return jsonify({
            'api_version': 'v1',
            'base_url': '/api/v1',
            'authentication': {
                'type': 'JWT Bearer Token',
                'header': 'Authorization: Bearer <token>',
                'endpoints': {
                    'login': 'POST /api/v1/auth/login',
                    'refresh': 'POST /api/v1/auth/refresh',
                    'logout': 'POST /api/v1/auth/logout'
                }
            },
            'endpoints': {
                'programs': {
                    'list': 'GET /api/v1/programs',
                    'create': 'POST /api/v1/programs',
                    'get': 'GET /api/v1/programs/{id}',
                    'update': 'PUT /api/v1/programs/{id}',
                    'delete': 'DELETE /api/v1/programs/{id}'
                },
                'camera': {
                    'capture': 'POST /api/v1/camera/capture',
                    'preview_start': 'POST /api/v1/camera/preview/start',
                    'preview_stop': 'POST /api/v1/camera/preview/stop'
                },
                'health': {
                    'status': 'GET /api/v1/health',
                    'ready': 'GET /api/v1/health/ready',
                    'live': 'GET /api/v1/health/live'
                }
            },
            'websocket': {
                'url': '/socket.io',
                'events': {
                    'start_inspection': 'Start inspection loop',
                    'stop_inspection': 'Stop inspection loop',
                    'subscribe_live_feed': 'Subscribe to camera feed',
                    'unsubscribe_live_feed': 'Unsubscribe from camera feed'
                }
            }
        })
    
    # ==================== APPLICATION LIFECYCLE ====================
    
    @app.before_request
    def before_request():
        """Before request hook."""
        # Request ID and timing are handled by middleware
        pass
    
    @app.after_request
    def after_request(response):
        """After request hook."""
        # Add custom headers
        response.headers['X-API-Version'] = 'v1'
        return response
    
    @app.teardown_appcontext
    def cleanup(error=None):
        """Cleanup resources on shutdown."""
        if error:
            logger.error(f"Application error: {error}")
    
    # Log application readiness
    logger.info("Application initialization complete")
    logger.info(f"API available at: http://{config.API_HOST}:{config.API_PORT}/api/v1")
    
    return app


def main():
    """Main entry point for running the application."""
    # Get config
    config_name = os.getenv('FLASK_ENV', 'development')
    config = get_config(config_name)
    
    # Create app
    app = create_app(config_name)
    
    # Get logger
    logger = get_logger('app')
    logger.info(f"Starting server on {config.API_HOST}:{config.API_PORT}")
    
    # Run with SocketIO
    try:
        socketio.run(
            app,
            host=config.API_HOST,
            port=config.API_PORT,
            debug=app.config['DEBUG'],
            use_reloader=app.config['DEBUG']
        )
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
