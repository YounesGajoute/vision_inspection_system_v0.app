"""Raspberry Pi HQ Camera Controller"""

import cv2
import numpy as np
from typing import Tuple, Dict, Optional
import time
from src.utils.logger import get_logger

logger = get_logger('camera')

# Check if running on Raspberry Pi
try:
    from picamera2 import Picamera2
    RASPBERRY_PI = True
except ImportError:
    RASPBERRY_PI = False
    logger.warning("Picamera2 not available. Using simulated camera for development.")


class CameraController:
    """
    Complete Raspberry Pi HQ Camera controller with:
    - Picamera2 integration
    - Auto-focus control (0-100)
    - Brightness modes (normal, HDR, high gain)
    - Capture with quality validation
    - Real-time preview
    - Error handling and reconnection
    """
    
    BRIGHTNESS_MODES = {
        'normal': {'AnalogueGain': 1.0, 'ExposureTime': 10000},
        'hdr': {'AnalogueGain': 1.0, 'ExposureTime': 20000},
        'highgain': {'AnalogueGain': 8.0, 'ExposureTime': 30000}
    }
    
    def __init__(self, resolution: Tuple[int, int] = (640, 480)):
        """
        Initialize camera controller.
        
        Args:
            resolution: Camera resolution (width, height)
        """
        self.resolution = resolution
        self.camera = None
        self.is_previewing = False
        self._connect()
    
    def _connect(self):
        """Initialize camera connection."""
        try:
            if RASPBERRY_PI:
                self.camera = Picamera2()
                config = self.camera.create_still_configuration(
                    main={"size": self.resolution, "format": "RGB888"}
                )
                self.camera.configure(config)
                self.camera.start()
                logger.info(f"Camera initialized at resolution {self.resolution}")
            else:
                # Simulated camera for development
                self.camera = cv2.VideoCapture(0)
                if self.camera.isOpened():
                    self.camera.set(cv2.CAP_PROP_FRAME_WIDTH, self.resolution[0])
                    self.camera.set(cv2.CAP_PROP_FRAME_HEIGHT, self.resolution[1])
                    logger.info("Simulated camera initialized (USB webcam)")
                else:
                    logger.warning("No camera available - using test pattern")
                    self.camera = None
        except Exception as e:
            logger.error(f"Failed to initialize camera: {e}")
            self.camera = None
    
    def capture_image(
        self,
        brightness_mode: str = 'normal',
        focus_value: int = 50
    ) -> Optional[np.ndarray]:
        """
        Capture single image with settings.
        
        Args:
            brightness_mode: Brightness mode (normal, hdr, highgain)
            focus_value: Focus value 0-100 (if supported)
            
        Returns:
            Captured image as numpy array (RGB) or None on failure
        """
        if not self.camera:
            logger.warning("Camera not available - generating test pattern")
            return self._generate_test_pattern()
        
        try:
            if RASPBERRY_PI:
                # Apply camera settings
                if brightness_mode in self.BRIGHTNESS_MODES:
                    controls = self.BRIGHTNESS_MODES[brightness_mode].copy()
                    
                    # Set focus if HQ camera supports it
                    # Focus range: 0-100 maps to lens positions
                    # Note: Manual focus control depends on lens type
                    controls['AfMode'] = 0  # Manual focus
                    # LensPosition: 0.0 (infinity) to 10.0 (close)
                    lens_position = (focus_value / 100.0) * 10.0
                    controls['LensPosition'] = lens_position
                    
                    self.camera.set_controls(controls)
                    time.sleep(0.1)  # Allow settings to apply
                
                # Capture image
                image = self.camera.capture_array()
                logger.info(f"Image captured: {image.shape}, mode: {brightness_mode}, focus: {focus_value}")
                return image
            else:
                # Simulated camera
                ret, frame = self.camera.read()
                if ret:
                    # Convert BGR to RGB
                    image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    # Resize if needed
                    if image.shape[:2][::-1] != self.resolution:
                        image = cv2.resize(image, self.resolution)
                    return image
                else:
                    logger.error("Failed to capture from simulated camera")
                    return self._generate_test_pattern()
                    
        except Exception as e:
            logger.error(f"Capture failed: {e}")
            return None
    
    def _generate_test_pattern(self) -> np.ndarray:
        """Generate test pattern image for development."""
        image = np.zeros((self.resolution[1], self.resolution[0], 3), dtype=np.uint8)
        
        # Create checkerboard pattern
        square_size = 40
        for i in range(0, self.resolution[1], square_size):
            for j in range(0, self.resolution[0], square_size):
                if ((i // square_size) + (j // square_size)) % 2 == 0:
                    image[i:i+square_size, j:j+square_size] = [200, 200, 200]
        
        # Add some shapes for testing
        cv2.circle(image, (320, 240), 50, (255, 0, 0), -1)
        cv2.rectangle(image, (100, 100), (200, 200), (0, 255, 0), -1)
        
        # Add timestamp text
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        cv2.putText(image, timestamp, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        cv2.putText(image, "TEST PATTERN", (200, 460), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
        
        return image
    
    def auto_optimize_focus(self) -> Tuple[int, float]:
        """
        Sweep focus range and find optimal value using Laplacian variance (sharpness).
        
        Returns:
            Tuple of (optimal_focus_value, sharpness_score)
        """
        logger.info("Starting auto-focus optimization...")
        
        best_focus = 50
        best_sharpness = 0.0
        
        # Test focus values from 0 to 100 in steps of 10
        for focus in range(0, 101, 10):
            image = self.capture_image(focus_value=focus)
            if image is not None:
                sharpness = self._calculate_sharpness(image)
                logger.debug(f"Focus {focus}: sharpness = {sharpness:.2f}")
                
                if sharpness > best_sharpness:
                    best_sharpness = sharpness
                    best_focus = focus
        
        # Fine-tune around best focus
        for focus in range(max(0, best_focus - 10), min(100, best_focus + 11), 2):
            image = self.capture_image(focus_value=focus)
            if image is not None:
                sharpness = self._calculate_sharpness(image)
                
                if sharpness > best_sharpness:
                    best_sharpness = sharpness
                    best_focus = focus
        
        logger.info(f"Optimal focus: {best_focus} (sharpness: {best_sharpness:.2f})")
        return best_focus, best_sharpness
    
    def auto_optimize_brightness(self) -> Tuple[str, Dict[str, float]]:
        """
        Test all brightness modes and return best.
        
        Returns:
            Tuple of (optimal_mode, scores_dict)
        """
        logger.info("Starting brightness optimization...")
        
        scores = {}
        best_mode = 'normal'
        best_score = 0.0
        
        for mode in self.BRIGHTNESS_MODES.keys():
            image = self.capture_image(brightness_mode=mode)
            if image is not None:
                quality = self.validate_image_quality(image)
                score = quality['score']
                scores[mode] = score
                
                logger.debug(f"Mode {mode}: score = {score:.2f}")
                
                if score > best_score:
                    best_score = score
                    best_mode = mode
        
        logger.info(f"Optimal brightness mode: {best_mode} (score: {best_score:.2f})")
        return best_mode, scores
    
    def validate_image_quality(self, image: np.ndarray) -> Dict[str, float]:
        """
        Check brightness, sharpness, exposure.
        
        Args:
            image: RGB image array
            
        Returns:
            Dictionary with quality metrics
        """
        if image is None or image.size == 0:
            return {'brightness': 0, 'sharpness': 0, 'exposure': 0, 'score': 0}
        
        # Convert to grayscale for analysis
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        else:
            gray = image
        
        # Brightness: average pixel value (target: 100-150)
        brightness = np.mean(gray)
        brightness_score = 100 * (1 - abs(brightness - 125) / 125)
        brightness_score = max(0, min(100, brightness_score))
        
        # Sharpness: Laplacian variance
        sharpness = self._calculate_sharpness(image)
        # Normalize to 0-100 (typical good images: 100-500+)
        sharpness_score = min(100, sharpness / 5)
        
        # Exposure: check for clipping (over/under exposure)
        over_exposed = np.sum(gray > 250) / gray.size
        under_exposed = np.sum(gray < 5) / gray.size
        exposure_score = 100 * (1 - (over_exposed + under_exposed))
        
        # Overall score (weighted average)
        overall_score = (
            0.3 * brightness_score +
            0.5 * sharpness_score +
            0.2 * exposure_score
        )
        
        return {
            'brightness': float(brightness),
            'sharpness': float(sharpness),
            'exposure': float(100 - (over_exposed + under_exposed) * 100),
            'score': float(overall_score)
        }
    
    def _calculate_sharpness(self, image: np.ndarray) -> float:
        """
        Calculate image sharpness using Laplacian variance.
        
        Args:
            image: RGB or grayscale image
            
        Returns:
            Sharpness score (higher is sharper)
        """
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        else:
            gray = image
        
        # Calculate Laplacian
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        
        # Return variance of Laplacian
        return float(laplacian.var())
    
    def start_preview(self):
        """Start live camera preview (for streaming)."""
        self.is_previewing = True
        logger.info("Preview started")
    
    def stop_preview(self):
        """Stop live camera preview."""
        self.is_previewing = False
        logger.info("Preview stopped")
    
    def get_preview_frame(self) -> Optional[np.ndarray]:
        """
        Get a single preview frame.
        
        Returns:
            Preview frame or None
        """
        if not self.is_previewing:
            return None
        return self.capture_image()
    
    def close(self):
        """Close camera connection."""
        try:
            if self.camera:
                if RASPBERRY_PI:
                    self.camera.stop()
                    self.camera.close()
                else:
                    self.camera.release()
                logger.info("Camera closed")
        except Exception as e:
            logger.error(f"Error closing camera: {e}")
    
    def __del__(self):
        """Cleanup on deletion."""
        self.close()

