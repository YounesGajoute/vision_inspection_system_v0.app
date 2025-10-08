"""REST API Routes for Vision Inspection System"""

from flask import Blueprint, request, jsonify, send_file
from werkzeug.utils import secure_filename
import os
import traceback
from datetime import datetime

from src.core.program_manager import ProgramManager
from src.hardware.camera import CameraController
from src.hardware.gpio_controller import GPIOController
from src.utils.validators import validate_json_request, validate_file_upload, sanitize_filename
from src.utils.image_processing import numpy_to_base64, base64_to_numpy
from src.utils.logger import get_logger

logger = get_logger('api')

# Create API blueprint
api = Blueprint('api', __name__)

# Global instances (will be initialized by app factory)
program_manager: ProgramManager = None
camera_controller: CameraController = None
gpio_controller: GPIOController = None


def init_api(pm: ProgramManager, cam: CameraController, gpio: GPIOController):
    """Initialize API with dependencies."""
    global program_manager, camera_controller, gpio_controller
    program_manager = pm
    camera_controller = cam
    gpio_controller = gpio
    logger.info("API initialized with dependencies")


# ==================== PROGRAM ENDPOINTS ====================

@api.route('/programs', methods=['POST'])
@validate_json_request(required_fields=['name', 'config'])
def create_program():
    """
    POST /api/programs
    Body: {name, config}
    Returns: {id, message}
    Errors: 400 (validation), 409 (duplicate name), 500
    """
    try:
        data = request.get_json()
        
        # Create program
        program = program_manager.create_program(data)
        
        return jsonify({
            'id': program['id'],
            'name': program['name'],
            'message': 'Program created successfully'
        }), 201
        
    except ValueError as e:
        logger.warning(f"Program creation failed - validation error: {e}")
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Program creation failed: {e}\n{traceback.format_exc()}")
        return jsonify({'error': 'Internal server error'}), 500


@api.route('/programs', methods=['GET'])
def list_programs():
    """
    GET /api/programs
    Query params: ?active_only=true
    Returns: {programs: [...]}
    """
    try:
        active_only = request.args.get('active_only', 'true').lower() == 'true'
        
        programs = program_manager.list_programs(active_only=active_only)
        
        return jsonify({'programs': programs}), 200
        
    except Exception as e:
        logger.error(f"List programs failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@api.route('/programs/<int:program_id>', methods=['GET'])
def get_program(program_id):
    """
    GET /api/programs/:id
    Returns: {id, name, config, stats}
    Errors: 404
    """
    try:
        program = program_manager.get_program(program_id)
        
        if not program:
            return jsonify({'error': 'Program not found'}), 404
        
        return jsonify(program), 200
        
    except Exception as e:
        logger.error(f"Get program failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@api.route('/programs/<int:program_id>', methods=['PUT'])
@validate_json_request()
def update_program(program_id):
    """
    PUT /api/programs/:id
    Body: {name?, config?}
    Returns: {message}
    """
    try:
        updates = request.get_json()
        
        program = program_manager.update_program(program_id, updates)
        
        return jsonify({
            'message': 'Program updated successfully',
            'program': program
        }), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400 if 'not found' not in str(e) else 404
    except Exception as e:
        logger.error(f"Update program failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@api.route('/programs/<int:program_id>', methods=['DELETE'])
def delete_program(program_id):
    """
    DELETE /api/programs/:id
    Returns: {message}
    """
    try:
        program_manager.delete_program(program_id)
        
        return jsonify({'message': 'Program deleted successfully'}), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        logger.error(f"Delete program failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500


# ==================== MASTER IMAGE ENDPOINTS ====================

@api.route('/master-image', methods=['POST'])
@validate_file_upload(allowed_extensions=['jpg', 'jpeg', 'png'], max_size_mb=10)
def upload_master_image():
    """
    POST /api/master-image
    Content-Type: multipart/form-data
    File: image file
    Body: {programId}
    Returns: {path, quality_score}
    Validation: file type, size, quality
    """
    try:
        # Get file
        file = request.files['file']
        
        # Get program ID from form data
        program_id = request.form.get('programId')
        if not program_id:
            return jsonify({'error': 'programId is required'}), 400
        
        try:
            program_id = int(program_id)
        except ValueError:
            return jsonify({'error': 'programId must be an integer'}), 400
        
        # Read image
        import numpy as np
        import cv2
        
        file_bytes = np.frombuffer(file.read(), np.uint8)
        image = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
        
        if image is None:
            return jsonify({'error': 'Invalid image file'}), 400
        
        # Convert BGR to RGB
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Validate image quality
        quality = camera_controller.validate_image_quality(image_rgb)
        
        # Save image
        image_path = program_manager.save_master_image(program_id, image_rgb)
        
        return jsonify({
            'path': image_path,
            'quality': quality,
            'message': 'Master image uploaded successfully'
        }), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 404 if 'not found' in str(e) else 400
    except Exception as e:
        logger.error(f"Upload master image failed: {e}\n{traceback.format_exc()}")
        return jsonify({'error': 'Internal server error'}), 500


@api.route('/master-image/<int:program_id>', methods=['GET'])
def get_master_image(program_id):
    """
    GET /api/master-image/:id
    Returns: Image file
    """
    try:
        image = program_manager.load_master_image(program_id)
        
        if image is None:
            return jsonify({'error': 'Master image not found'}), 404
        
        # Convert to base64
        image_base64 = numpy_to_base64(image)
        
        return jsonify({
            'image': image_base64,
            'format': 'jpg'
        }), 200
        
    except Exception as e:
        logger.error(f"Get master image failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500


# ==================== CAMERA ENDPOINTS ====================

@api.route('/camera/capture', methods=['POST'])
def capture_image():
    """
    POST /api/camera/capture
    Body: {brightnessMode?, focusValue?}
    Returns: {image: base64, quality: {...}}
    """
    try:
        data = request.get_json() or {}
        
        brightness_mode = data.get('brightnessMode', 'normal')
        focus_value = data.get('focusValue', 50)
        
        # Validate parameters
        if brightness_mode not in ['normal', 'hdr', 'highgain']:
            return jsonify({'error': 'Invalid brightness mode'}), 400
        
        if not (0 <= focus_value <= 100):
            return jsonify({'error': 'Focus value must be 0-100'}), 400
        
        # Capture image
        image = camera_controller.capture_image(brightness_mode, focus_value)
        
        if image is None:
            return jsonify({'error': 'Failed to capture image'}), 500
        
        # Validate quality
        quality = camera_controller.validate_image_quality(image)
        
        # Convert to base64
        image_base64 = numpy_to_base64(image)
        
        return jsonify({
            'image': image_base64,
            'quality': quality,
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Capture image failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@api.route('/camera/auto-optimize', methods=['POST'])
def auto_optimize_camera():
    """
    POST /api/camera/auto-optimize
    Returns: {optimalBrightness, optimalFocus, scores}
    """
    try:
        logger.info("Starting camera auto-optimization...")
        
        # Optimize brightness
        optimal_brightness, brightness_scores = camera_controller.auto_optimize_brightness()
        
        # Optimize focus
        optimal_focus, focus_score = camera_controller.auto_optimize_focus()
        
        logger.info(f"Auto-optimization complete: brightness={optimal_brightness}, focus={optimal_focus}")
        
        return jsonify({
            'optimalBrightness': optimal_brightness,
            'optimalFocus': optimal_focus,
            'brightnessScores': brightness_scores,
            'focusScore': focus_score,
            'message': 'Camera optimization complete'
        }), 200
        
    except Exception as e:
        logger.error(f"Auto-optimization failed: {e}")
        return jsonify({'error': 'Auto-optimization failed'}), 500


@api.route('/camera/preview/start', methods=['POST'])
def start_preview():
    """Start live camera preview"""
    try:
        camera_controller.start_preview()
        
        return jsonify({'message': 'Preview started'}), 200
        
    except Exception as e:
        logger.error(f"Start preview failed: {e}")
        return jsonify({'error': 'Failed to start preview'}), 500


@api.route('/camera/preview/stop', methods=['POST'])
def stop_preview():
    """Stop live camera preview"""
    try:
        camera_controller.stop_preview()
        
        return jsonify({'message': 'Preview stopped'}), 200
        
    except Exception as e:
        logger.error(f"Stop preview failed: {e}")
        return jsonify({'error': 'Failed to stop preview'}), 500


# ==================== GPIO ENDPOINTS ====================

@api.route('/gpio/outputs', methods=['GET'])
def get_gpio_outputs():
    """Get current state of all GPIO outputs"""
    try:
        states = gpio_controller.get_all_states()
        
        return jsonify({'outputs': states}), 200
        
    except Exception as e:
        logger.error(f"Get GPIO outputs failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@api.route('/gpio/outputs/<int:output_number>', methods=['POST'])
@validate_json_request(required_fields=['state'])
def set_gpio_output(output_number):
    """
    POST /api/gpio/outputs/:number
    Body: {state: true/false}
    """
    try:
        data = request.get_json()
        state = data.get('state')
        
        if not isinstance(state, bool):
            return jsonify({'error': 'state must be boolean'}), 400
        
        gpio_controller.set_output(output_number, state)
        
        return jsonify({
            'message': f'Output {output_number} set to {"HIGH" if state else "LOW"}'
        }), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Set GPIO output failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@api.route('/gpio/test', methods=['POST'])
def test_gpio_sequence():
    """Run GPIO test sequence"""
    try:
        gpio_controller.test_sequence()
        
        return jsonify({'message': 'GPIO test sequence complete'}), 200
        
    except Exception as e:
        logger.error(f"GPIO test failed: {e}")
        return jsonify({'error': 'Test sequence failed'}), 500


# ==================== HEALTH CHECK ====================

@api.route('/health', methods=['GET'])
def health_check():
    """
    GET /api/health
    Returns: {status, camera, gpio, database, storage}
    """
    health_status = {
        'status': 'ok',
        'timestamp': datetime.now().isoformat(),
        'components': {}
    }
    
    # Check camera
    try:
        test_image = camera_controller.capture_image()
        health_status['components']['camera'] = 'ok' if test_image is not None else 'error'
    except:
        health_status['components']['camera'] = 'error'
    
    # Check GPIO
    try:
        gpio_controller.get_all_states()
        health_status['components']['gpio'] = 'ok'
    except:
        health_status['components']['gpio'] = 'error'
    
    # Check database
    try:
        program_manager.list_programs()
        health_status['components']['database'] = 'ok'
    except:
        health_status['components']['database'] = 'error'
    
    # Check storage
    try:
        storage_ok = (
            os.path.exists(program_manager.master_images_path) and
            os.path.exists(program_manager.image_history_path)
        )
        health_status['components']['storage'] = 'ok' if storage_ok else 'error'
    except:
        health_status['components']['storage'] = 'error'
    
    # Set overall status
    if any(status == 'error' for status in health_status['components'].values()):
        health_status['status'] = 'degraded'
    
    return jsonify(health_status), 200


# ==================== ERROR HANDLERS ====================

@api.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404


@api.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {error}")
    return jsonify({'error': 'Internal server error'}), 500


@api.errorhandler(Exception)
def handle_exception(error):
    logger.error(f"Unhandled exception: {error}\n{traceback.format_exc()}")
    return jsonify({'error': 'An unexpected error occurred'}), 500

