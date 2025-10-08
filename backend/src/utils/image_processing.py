"""Image processing utilities"""

import cv2
import numpy as np
import base64
from typing import Tuple, Optional


def numpy_to_base64(image: np.ndarray, format: str = 'jpg', quality: int = 90) -> str:
    """
    Convert numpy array to base64 encoded string.
    
    Args:
        image: Image array (RGB or BGR)
        format: Output format ('jpg' or 'png')
        quality: JPEG quality (1-100)
        
    Returns:
        Base64 encoded string
    """
    # Convert RGB to BGR if needed (OpenCV uses BGR)
    if len(image.shape) == 3 and image.shape[2] == 3:
        image_bgr = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    else:
        image_bgr = image
    
    # Encode image
    if format.lower() == 'jpg' or format.lower() == 'jpeg':
        encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
        _, buffer = cv2.imencode('.jpg', image_bgr, encode_param)
    else:  # PNG
        _, buffer = cv2.imencode('.png', image_bgr)
    
    # Convert to base64
    base64_str = base64.b64encode(buffer).decode('utf-8')
    
    return base64_str


def base64_to_numpy(base64_str: str) -> np.ndarray:
    """
    Convert base64 encoded string to numpy array.
    
    Args:
        base64_str: Base64 encoded image string
        
    Returns:
        Image array (RGB)
    """
    # Decode base64
    image_bytes = base64.b64decode(base64_str)
    
    # Convert to numpy array
    nparr = np.frombuffer(image_bytes, np.uint8)
    
    # Decode image
    image_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if image_bgr is None:
        raise ValueError("Failed to decode image from base64")
    
    # Convert BGR to RGB
    image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
    
    return image_rgb


def resize_image(
    image: np.ndarray,
    target_size: Tuple[int, int],
    maintain_aspect: bool = True
) -> np.ndarray:
    """
    Resize image to target size.
    
    Args:
        image: Input image
        target_size: Target size (width, height)
        maintain_aspect: Whether to maintain aspect ratio
        
    Returns:
        Resized image
    """
    if maintain_aspect:
        h, w = image.shape[:2]
        target_w, target_h = target_size
        
        # Calculate scaling factor
        scale = min(target_w / w, target_h / h)
        
        # Calculate new dimensions
        new_w = int(w * scale)
        new_h = int(h * scale)
        
        # Resize
        resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
        
        # Create canvas and center image
        canvas = np.zeros((target_h, target_w, 3), dtype=np.uint8)
        y_offset = (target_h - new_h) // 2
        x_offset = (target_w - new_w) // 2
        canvas[y_offset:y_offset+new_h, x_offset:x_offset+new_w] = resized
        
        return canvas
    else:
        return cv2.resize(image, target_size, interpolation=cv2.INTER_AREA)


def create_thumbnail(image: np.ndarray, max_size: int = 200) -> np.ndarray:
    """
    Create thumbnail of image.
    
    Args:
        image: Input image
        max_size: Maximum dimension size
        
    Returns:
        Thumbnail image
    """
    h, w = image.shape[:2]
    
    if max(h, w) <= max_size:
        return image.copy()
    
    if h > w:
        new_h = max_size
        new_w = int(w * (max_size / h))
    else:
        new_w = max_size
        new_h = int(h * (max_size / w))
    
    thumbnail = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
    
    return thumbnail


def add_overlay_text(
    image: np.ndarray,
    text: str,
    position: Tuple[int, int] = (10, 30),
    font_scale: float = 1.0,
    color: Tuple[int, int, int] = (255, 255, 255),
    thickness: int = 2
) -> np.ndarray:
    """
    Add text overlay to image.
    
    Args:
        image: Input image
        text: Text to add
        position: Text position (x, y)
        font_scale: Font scale
        color: Text color (RGB)
        thickness: Text thickness
        
    Returns:
        Image with text overlay
    """
    result = image.copy()
    
    # Convert RGB to BGR if needed
    if len(result.shape) == 3:
        color_bgr = (color[2], color[1], color[0])
    else:
        color_bgr = color
    
    cv2.putText(
        result, text, position,
        cv2.FONT_HERSHEY_SIMPLEX,
        font_scale, color_bgr, thickness,
        cv2.LINE_AA
    )
    
    return result

