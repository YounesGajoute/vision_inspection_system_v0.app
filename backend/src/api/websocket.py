"""WebSocket handlers for real-time communication"""

from flask_socketio import SocketIO, emit, disconnect
from threading import Thread, Event
import time
import traceback
from typing import Dict, Optional

from src.core.inspection_engine import InspectionEngine
from src.hardware.camera import CameraController
from src.core.program_manager import ProgramManager
from src.database.db_manager import DatabaseManager
from src.utils.image_processing import numpy_to_base64
from src.utils.logger import get_logger

logger = get_logger('websocket')

# Initialize SocketIO (will be configured by app factory)
socketio = SocketIO()

# Global instances
program_manager: Optional[ProgramManager] = None
camera_controller: Optional[CameraController] = None
db_manager: Optional[DatabaseManager] = None

# Active sessions
active_inspections: Dict[str, Dict] = {}
active_feeds: Dict[str, Dict] = {}


def init_websocket(pm: ProgramManager, cam: CameraController, db: DatabaseManager):
    """Initialize WebSocket with dependencies."""
    global program_manager, camera_controller, db_manager
    program_manager = pm
    camera_controller = cam
    db_manager = db
    logger.info("WebSocket initialized with dependencies")


# ==================== CONNECTION HANDLERS ====================

@socketio.on('connect')
def handle_connect():
    """Client connected"""
    logger.info(f"Client connected: {request.sid}")
    emit('connection_status', {'status': 'connected', 'message': 'Connected to vision inspection system'})


@socketio.on('disconnect')
def handle_disconnect():
    """Client disconnected"""
    from flask import request
    session_id = request.sid
    
    logger.info(f"Client disconnected: {session_id}")
    
    # Stop any active inspection for this session
    if session_id in active_inspections:
        active_inspections[session_id]['stop_flag'].set()
        del active_inspections[session_id]
    
    # Stop any active feed for this session
    if session_id in active_feeds:
        active_feeds[session_id]['stop_flag'].set()
        del active_feeds[session_id]


# ==================== INSPECTION HANDLERS ====================

@socketio.on('start_inspection')
def start_inspection(data):
    """
    Client sends: {programId, continuous: true/false}
    Start inspection loop
    Emit: inspection_result events
    """
    from flask import request
    session_id = request.sid
    
    try:
        program_id = data.get('programId')
        continuous = data.get('continuous', True)
        
        if not program_id:
            emit('error', {'message': 'programId is required'})
            return
        
        # Load program
        program = program_manager.get_program(program_id)
        if not program:
            emit('error', {'message': f'Program {program_id} not found'})
            return
        
        # Check if already running
        if session_id in active_inspections:
            emit('error', {'message': 'Inspection already running for this session'})
            return
        
        logger.info(f"Starting inspection for program {program_id} (session: {session_id})")
        
        # Create stop flag
        stop_flag = Event()
        
        # Store session info
        active_inspections[session_id] = {
            'program_id': program_id,
            'stop_flag': stop_flag,
            'thread': None
        }
        
        # Start inspection thread
        if continuous:
            thread = Thread(
                target=inspection_loop,
                args=(program_id, session_id, stop_flag, program['config'])
            )
            thread.daemon = True
            thread.start()
            active_inspections[session_id]['thread'] = thread
            
            emit('inspection_started', {
                'programId': program_id,
                'programName': program['name'],
                'continuous': True
            })
        else:
            # Single inspection
            thread = Thread(
                target=single_inspection,
                args=(program_id, session_id, program['config'])
            )
            thread.daemon = True
            thread.start()
            
            emit('inspection_started', {
                'programId': program_id,
                'programName': program['name'],
                'continuous': False
            })
        
    except Exception as e:
        logger.error(f"Start inspection failed: {e}\n{traceback.format_exc()}")
        emit('error', {'message': f'Failed to start inspection: {str(e)}'})


@socketio.on('stop_inspection')
def stop_inspection():
    """Stop active inspection"""
    from flask import request
    session_id = request.sid
    
    try:
        if session_id not in active_inspections:
            emit('warning', {'message': 'No active inspection to stop'})
            return
        
        logger.info(f"Stopping inspection (session: {session_id})")
        
        # Set stop flag
        active_inspections[session_id]['stop_flag'].set()
        
        # Wait briefly for thread to stop
        time.sleep(0.5)
        
        # Clean up
        if session_id in active_inspections:
            del active_inspections[session_id]
        
        emit('inspection_stopped', {'message': 'Inspection stopped'})
        
    except Exception as e:
        logger.error(f"Stop inspection failed: {e}")
        emit('error', {'message': f'Failed to stop inspection: {str(e)}'})


def inspection_loop(program_id: int, session_id: str, stop_flag: Event, program_config: Dict):
    """
    Continuous inspection loop.
    Runs in background thread.
    """
    try:
        # Create inspection engine
        engine = InspectionEngine(program_config)
        
        trigger_interval = program_config.get('triggerInterval', 1000)
        
        inspection_count = 0
        
        while not stop_flag.is_set():
            try:
                # Run inspection cycle
                status, tool_results, processing_time, image = engine.run_inspection_cycle()
                
                inspection_count += 1
                
                # Log to database
                db_manager.log_inspection_result(
                    program_id=program_id,
                    status=status,
                    processing_time_ms=processing_time,
                    tool_results=tool_results,
                    trigger_type=program_config.get('triggerType', 'internal')
                )
                
                # Convert image to base64 (send smaller thumbnail)
                import cv2
                thumbnail = cv2.resize(image, (320, 240))
                image_base64 = numpy_to_base64(thumbnail, quality=70)
                
                # Emit result
                socketio.emit('inspection_result', {
                    'programId': program_id,
                    'status': status,
                    'toolResults': tool_results,
                    'processingTime': processing_time,
                    'inspectionCount': inspection_count,
                    'image': image_base64,
                    'timestamp': time.time()
                }, room=session_id)
                
                logger.debug(f"Inspection {inspection_count}: {status} ({processing_time:.1f}ms)")
                
            except Exception as e:
                logger.error(f"Inspection cycle failed: {e}")
                socketio.emit('error', {
                    'message': f'Inspection cycle failed: {str(e)}'
                }, room=session_id)
            
            # Wait for next trigger
            trigger_interval_sec = trigger_interval / 1000.0
            stop_flag.wait(trigger_interval_sec)
        
        logger.info(f"Inspection loop ended. Total inspections: {inspection_count}")
        
    except Exception as e:
        logger.error(f"Inspection loop crashed: {e}\n{traceback.format_exc()}")
        socketio.emit('error', {
            'message': f'Inspection loop crashed: {str(e)}'
        }, room=session_id)
    finally:
        # Cleanup
        if 'engine' in locals():
            engine.cleanup()


def single_inspection(program_id: int, session_id: str, program_config: Dict):
    """Run a single inspection."""
    try:
        # Create inspection engine
        engine = InspectionEngine(program_config)
        
        # Run inspection
        status, tool_results, processing_time, image = engine.run_inspection_cycle()
        
        # Log to database
        db_manager.log_inspection_result(
            program_id=program_id,
            status=status,
            processing_time_ms=processing_time,
            tool_results=tool_results,
            trigger_type='manual'
        )
        
        # Convert image to base64
        image_base64 = numpy_to_base64(image)
        
        # Emit result
        socketio.emit('inspection_result', {
            'programId': program_id,
            'status': status,
            'toolResults': tool_results,
            'processingTime': processing_time,
            'image': image_base64,
            'timestamp': time.time(),
            'single': True
        }, room=session_id)
        
        socketio.emit('inspection_complete', {
            'message': 'Single inspection complete'
        }, room=session_id)
        
        engine.cleanup()
        
    except Exception as e:
        logger.error(f"Single inspection failed: {e}\n{traceback.format_exc()}")
        socketio.emit('error', {
            'message': f'Inspection failed: {str(e)}'
        }, room=session_id)


# ==================== LIVE FEED HANDLERS ====================

@socketio.on('subscribe_live_feed')
def subscribe_live_feed(data=None):
    """
    Start sending live camera frames.
    Emit: live_frame events (base64 JPEG)
    """
    from flask import request
    session_id = request.sid
    
    try:
        fps = (data or {}).get('fps', 10)
        fps = max(1, min(30, fps))  # Limit to 1-30 FPS
        
        if session_id in active_feeds:
            emit('warning', {'message': 'Live feed already active'})
            return
        
        logger.info(f"Starting live feed (session: {session_id}, fps: {fps})")
        
        # Create stop flag
        stop_flag = Event()
        
        # Store session info
        active_feeds[session_id] = {
            'stop_flag': stop_flag,
            'fps': fps,
            'thread': None
        }
        
        # Start feed thread
        thread = Thread(
            target=live_feed_loop,
            args=(session_id, stop_flag, fps)
        )
        thread.daemon = True
        thread.start()
        active_feeds[session_id]['thread'] = thread
        
        emit('live_feed_started', {'fps': fps})
        
    except Exception as e:
        logger.error(f"Subscribe live feed failed: {e}")
        emit('error', {'message': f'Failed to start live feed: {str(e)}'})


@socketio.on('unsubscribe_live_feed')
def unsubscribe_live_feed():
    """Stop live feed"""
    from flask import request
    session_id = request.sid
    
    try:
        if session_id not in active_feeds:
            emit('warning', {'message': 'No active live feed'})
            return
        
        logger.info(f"Stopping live feed (session: {session_id})")
        
        # Set stop flag
        active_feeds[session_id]['stop_flag'].set()
        
        # Wait briefly
        time.sleep(0.2)
        
        # Clean up
        if session_id in active_feeds:
            del active_feeds[session_id]
        
        emit('live_feed_stopped', {'message': 'Live feed stopped'})
        
    except Exception as e:
        logger.error(f"Unsubscribe live feed failed: {e}")
        emit('error', {'message': f'Failed to stop live feed: {str(e)}'})


def live_feed_loop(session_id: str, stop_flag: Event, fps: int):
    """
    Send live camera frames at specified FPS.
    Runs in background thread.
    """
    try:
        frame_interval = 1.0 / fps
        frame_count = 0
        
        while not stop_flag.is_set():
            try:
                # Capture frame
                frame = camera_controller.capture_image()
                
                if frame is not None:
                    # Convert to base64 (send smaller resolution)
                    import cv2
                    resized = cv2.resize(frame, (320, 240))
                    frame_base64 = numpy_to_base64(resized, quality=60)
                    
                    # Emit frame
                    socketio.emit('live_frame', {
                        'image': frame_base64,
                        'frameNumber': frame_count,
                        'timestamp': time.time()
                    }, room=session_id)
                    
                    frame_count += 1
                
            except Exception as e:
                logger.error(f"Live feed frame error: {e}")
            
            # Wait for next frame
            stop_flag.wait(frame_interval)
        
        logger.info(f"Live feed ended. Total frames: {frame_count}")
        
    except Exception as e:
        logger.error(f"Live feed loop crashed: {e}\n{traceback.format_exc()}")


# ==================== SYSTEM STATUS ====================

@socketio.on('request_system_status')
def request_system_status():
    """Request current system status"""
    try:
        status = {
            'activeInspections': len(active_inspections),
            'activeLiveFeeds': len(active_feeds),
            'timestamp': time.time()
        }
        
        emit('system_status', status)
        
    except Exception as e:
        logger.error(f"Get system status failed: {e}")
        emit('error', {'message': 'Failed to get system status'})


# ==================== ERROR HANDLER ====================

@socketio.on_error_default
def default_error_handler(e):
    """Default error handler"""
    logger.error(f"WebSocket error: {e}\n{traceback.format_exc()}")
    emit('error', {'message': 'An error occurred'})

