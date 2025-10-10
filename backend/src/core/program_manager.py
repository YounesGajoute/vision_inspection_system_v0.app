"""Program Manager - Manages inspection program CRUD operations"""

import os
import cv2
import numpy as np
import json
from typing import Dict, List, Optional
from datetime import datetime
from src.database.db_manager import DatabaseManager
from src.utils.logger import get_logger

logger = get_logger('program_manager')


class ProgramManager:
    """
    Manages program CRUD operations:
    - Create new programs
    - Load existing programs
    - Update program configurations
    - Delete programs
    - Validate configurations
    - Save/load master images
    """
    
    VALID_TOOL_TYPES = ['outline', 'area', 'color_area', 'edge_detection', 'position_adjust']
    VALID_TRIGGER_TYPES = ['internal', 'external']
    VALID_BRIGHTNESS_MODES = ['normal', 'hdr', 'highgain']
    MAX_TOOLS_PER_PROGRAM = 16
    MAX_POSITION_TOOLS = 1
    
    def __init__(self, db_manager: DatabaseManager, storage_config: Dict):
        """
        Initialize program manager.
        
        Args:
            db_manager: Database manager instance
            storage_config: Storage configuration dictionary
        """
        self.db = db_manager
        self.storage_config = storage_config
        
        # Ensure storage directories exist
        self.master_images_path = storage_config.get('master_images', './storage/master_images')
        self.image_history_path = storage_config.get('image_history', './storage/image_history')
        
        os.makedirs(self.master_images_path, exist_ok=True)
        os.makedirs(self.image_history_path, exist_ok=True)
        
        logger.info("Program manager initialized")
    
    def create_program(self, program_data: Dict) -> Dict:
        """
        Create and validate new program.
        
        Args:
            program_data: Program data dictionary with 'name' and 'config'
            
        Returns:
            Created program dictionary with ID
            
        Raises:
            ValueError: If validation fails
        """
        name = program_data.get('name')
        config = program_data.get('config')
        
        if not name:
            raise ValueError("Program name is required")
        
        if not config:
            raise ValueError("Program configuration is required")
        
        # Validate configuration
        self.validate_program(config)
        
        # Check for duplicate name
        existing = self.db.get_program_by_name(name)
        if existing:
            raise ValueError(f"Program with name '{name}' already exists")
        
        # Create program in database
        try:
            program_id = self.db.create_program(name, config)
            
            logger.info(f"Program created: {name} (ID: {program_id})")
            
            # Return created program
            return self.get_program(program_id)
            
        except Exception as e:
            logger.error(f"Failed to create program: {e}")
            raise
    
    def get_program(self, program_id: int) -> Optional[Dict]:
        """
        Load program from database.
        
        Args:
            program_id: Program ID
            
        Returns:
            Program dictionary or None if not found
        """
        program = self.db.get_program(program_id)
        
        if program:
            logger.debug(f"Loaded program: {program['name']} (ID: {program_id})")
        
        return program
    
    def get_program_by_name(self, name: str) -> Optional[Dict]:
        """
        Load program by name.
        
        Args:
            name: Program name
            
        Returns:
            Program dictionary or None if not found
        """
        return self.db.get_program_by_name(name)
    
    def list_programs(self, active_only: bool = True) -> List[Dict]:
        """
        List all programs.
        
        Args:
            active_only: If True, only return active programs
            
        Returns:
            List of program dictionaries
        """
        programs = self.db.list_programs(active_only=active_only)
        logger.debug(f"Listed {len(programs)} programs")
        return programs
    
    def update_program(self, program_id: int, updates: Dict) -> Dict:
        """
        Update program configuration.
        
        Args:
            program_id: Program ID
            updates: Dictionary of fields to update
            
        Returns:
            Updated program dictionary
            
        Raises:
            ValueError: If program not found or validation fails
        """
        # Check if program exists
        program = self.get_program(program_id)
        if not program:
            raise ValueError(f"Program with ID {program_id} not found")
        
        # Validate config if present
        if 'config' in updates:
            self.validate_program(updates['config'])
        
        # Update program
        success = self.db.update_program(program_id, updates)
        
        if not success:
            raise ValueError(f"Failed to update program {program_id}")
        
        logger.info(f"Program updated: {program['name']} (ID: {program_id})")
        
        # Return updated program
        return self.get_program(program_id)
    
    def delete_program(self, program_id: int) -> bool:
        """
        Delete program (soft delete).
        
        Args:
            program_id: Program ID
            
        Returns:
            True if successful
            
        Raises:
            ValueError: If program not found
        """
        program = self.get_program(program_id)
        if not program:
            raise ValueError(f"Program with ID {program_id} not found")
        
        success = self.db.delete_program(program_id)
        
        if success:
            logger.info(f"Program deleted: {program['name']} (ID: {program_id})")
        
        return success
    
    def hard_delete_program(self, program_id: int) -> bool:
        """
        Permanently delete program and associated data.
        
        Args:
            program_id: Program ID
            
        Returns:
            True if successful
        """
        program = self.get_program(program_id)
        if not program:
            raise ValueError(f"Program with ID {program_id} not found")
        
        # Delete master image file if exists
        if program.get('master_image_path'):
            try:
                if os.path.exists(program['master_image_path']):
                    os.remove(program['master_image_path'])
                    logger.debug(f"Deleted master image: {program['master_image_path']}")
            except Exception as e:
                logger.warning(f"Failed to delete master image: {e}")
        
        # Hard delete from database
        success = self.db.hard_delete_program(program_id)
        
        if success:
            logger.info(f"Program permanently deleted: {program['name']} (ID: {program_id})")
        
        return success
    
    def validate_program(self, program_config: Dict) -> bool:
        """
        Comprehensive validation of program configuration.
        
        Args:
            program_config: Program configuration dictionary
            
        Returns:
            True if valid
            
        Raises:
            ValueError: If validation fails
        """
        # Validate trigger type
        trigger_type = program_config.get('triggerType')
        if trigger_type not in self.VALID_TRIGGER_TYPES:
            raise ValueError(f"Invalid trigger type: {trigger_type}. Must be one of {self.VALID_TRIGGER_TYPES}")
        
        # Validate trigger interval/delay
        if trigger_type == 'internal':
            interval = program_config.get('triggerInterval', 0)
            if not (1 <= interval <= 10000):
                raise ValueError(f"Trigger interval must be 1-10000 ms, got {interval}")
        else:  # external
            delay = program_config.get('triggerDelay', 0)
            if not (0 <= delay <= 1000):
                raise ValueError(f"Trigger delay must be 0-1000 ms, got {delay}")
        
        # Validate brightness mode
        brightness_mode = program_config.get('brightnessMode')
        if brightness_mode not in self.VALID_BRIGHTNESS_MODES:
            raise ValueError(f"Invalid brightness mode: {brightness_mode}. Must be one of {self.VALID_BRIGHTNESS_MODES}")
        
        # Validate focus value
        focus_value = program_config.get('focusValue', 50)
        if not (0 <= focus_value <= 100):
            raise ValueError(f"Focus value must be 0-100, got {focus_value}")
        
        # Validate tools
        tools = program_config.get('tools', [])
        if not tools:
            # Allow empty tools for testing/development
            # In production, you should require at least one tool
            logger.warning("Creating program without tools (validation relaxed for testing)")
            # Uncomment the line below to enforce tool requirement:
            # raise ValueError("At least one tool is required")
        
        if len(tools) > self.MAX_TOOLS_PER_PROGRAM:
            raise ValueError(f"Maximum {self.MAX_TOOLS_PER_PROGRAM} tools allowed, got {len(tools)}")
        
        # Count position adjustment tools
        position_tool_count = sum(1 for tool in tools if tool.get('type') == 'position_adjust')
        if position_tool_count > self.MAX_POSITION_TOOLS:
            raise ValueError(f"Maximum {self.MAX_POSITION_TOOLS} position adjustment tool allowed, got {position_tool_count}")
        
        # Validate each tool
        for i, tool in enumerate(tools):
            self._validate_tool(tool, i)
        
        # Validate outputs
        outputs = program_config.get('outputs', {})
        self._validate_outputs(outputs)
        
        logger.debug("Program configuration validated successfully")
        return True
    
    def _validate_tool(self, tool: Dict, index: int):
        """Validate individual tool configuration."""
        # Validate tool type
        tool_type = tool.get('type')
        if tool_type not in self.VALID_TOOL_TYPES:
            raise ValueError(f"Tool {index}: Invalid type '{tool_type}'. Must be one of {self.VALID_TOOL_TYPES}")
        
        # Validate ROI
        roi = tool.get('roi')
        if not roi:
            raise ValueError(f"Tool {index}: ROI is required")
        
        required_roi_fields = ['x', 'y', 'width', 'height']
        for field in required_roi_fields:
            if field not in roi:
                raise ValueError(f"Tool {index}: ROI missing required field '{field}'")
            if not isinstance(roi[field], (int, float)) or roi[field] < 0:
                raise ValueError(f"Tool {index}: ROI {field} must be non-negative number")
        
        # Validate threshold
        threshold = tool.get('threshold')
        if threshold is None:
            raise ValueError(f"Tool {index}: Threshold is required")
        if not (0 <= threshold <= 100):
            raise ValueError(f"Tool {index}: Threshold must be 0-100, got {threshold}")
        
        # Validate upper limit if present
        upper_limit = tool.get('upperLimit')
        if upper_limit is not None:
            if not (0 <= upper_limit <= 200):
                raise ValueError(f"Tool {index}: Upper limit must be 0-200, got {upper_limit}")
            if upper_limit < threshold:
                raise ValueError(f"Tool {index}: Upper limit must be >= threshold")
    
    def _validate_outputs(self, outputs: Dict):
        """Validate output assignments."""
        valid_outputs = ['OUT1', 'OUT2', 'OUT3', 'OUT4', 'OUT5', 'OUT6', 'OUT7', 'OUT8']
        valid_conditions = ['OK', 'NG', 'Always ON', 'Always OFF', 'Not Used']
        
        for output_name, condition in outputs.items():
            if output_name not in valid_outputs:
                raise ValueError(f"Invalid output name: {output_name}. Must be one of {valid_outputs}")
            
            if condition not in valid_conditions:
                raise ValueError(f"Invalid condition for {output_name}: {condition}. Must be one of {valid_conditions}")
    
    def save_master_image(
        self,
        program_id: int,
        image: np.ndarray,
        format: str = 'png'
    ) -> str:
        """
        Save master image to storage with consistent quality parameters.
        
        IMPORTANT: Master images are saved with maximum quality (lossless PNG)
        to ensure consistency with captured images during test runs.
        This is critical for accurate template matching and inspection.
        
        Args:
            program_id: Program ID
            image: Image array (RGB or BGR)
            format: Image format ('png' or 'jpg')
            
        Returns:
            Path to saved image
            
        Raises:
            ValueError: If program not found or image is invalid
        """
        # Validate program exists
        program = self.get_program(program_id)
        if not program:
            raise ValueError(f"Program with ID {program_id} not found")
        
        # Validate image
        if image is None or image.size == 0:
            raise ValueError("Invalid image data")
        
        # Generate filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"program_{program_id}_{timestamp}.{format}"
        file_path = os.path.join(self.master_images_path, filename)
        
        # Convert RGB to BGR for OpenCV
        if len(image.shape) == 3 and image.shape[2] == 3:
            image_bgr = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
        else:
            image_bgr = image
        
        # Save image with explicit quality parameters for consistency
        # This ensures master images have the same quality as captured test images
        if format.lower() in ['png']:
            # PNG: Use compression level 1 (best speed, lossless)
            # Level 0 = no compression (fastest, largest file)
            # Level 1 = best speed compression (fast, lossless, good balance)
            # Level 9 = best compression (slowest)
            compression_params = [cv2.IMWRITE_PNG_COMPRESSION, 1]
        elif format.lower() in ['jpg', 'jpeg']:
            # JPEG: Use quality 100 (maximum quality, minimal artifacts)
            # Range: 0-100, where 100 = best quality
            compression_params = [cv2.IMWRITE_JPEG_QUALITY, 100]
        else:
            compression_params = []
        
        success = cv2.imwrite(file_path, image_bgr, compression_params)
        
        if not success:
            raise RuntimeError(f"Failed to save master image to {file_path}")
        
        # Update program with image path
        self.db.update_program(program_id, {'master_image_path': file_path})
        
        logger.info(f"Master image saved with high quality: {file_path} (format={format})")
        
        return file_path
    
    def load_master_image(self, program_id: int) -> Optional[np.ndarray]:
        """
        Load master image from storage.
        
        Args:
            program_id: Program ID
            
        Returns:
            Image array (RGB) or None if not found
        """
        program = self.get_program(program_id)
        if not program:
            return None
        
        image_path = program.get('master_image_path')
        if not image_path or not os.path.exists(image_path):
            logger.warning(f"Master image not found for program {program_id}")
            return None
        
        # Load image
        image = cv2.imread(image_path)
        if image is None:
            logger.error(f"Failed to load master image: {image_path}")
            return None
        
        # Convert BGR to RGB
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        return image_rgb
    
    def export_program(self, program_id: int, export_path: str):
        """
        Export program configuration to JSON file.
        
        Args:
            program_id: Program ID
            export_path: Path to export file
        """
        program = self.get_program(program_id)
        if not program:
            raise ValueError(f"Program with ID {program_id} not found")
        
        # Prepare export data
        export_data = {
            'name': program['name'],
            'config': program['config'],
            'created_at': program.get('created_at'),
            'exported_at': datetime.now().isoformat()
        }
        
        # Write to file
        with open(export_path, 'w') as f:
            json.dump(export_data, f, indent=2)
        
        logger.info(f"Program exported to: {export_path}")
    
    def import_program(self, import_path: str, new_name: Optional[str] = None) -> Dict:
        """
        Import program configuration from JSON file.
        
        Args:
            import_path: Path to import file
            new_name: Optional new name for imported program
            
        Returns:
            Imported program dictionary
        """
        # Read file
        with open(import_path, 'r') as f:
            import_data = json.load(f)
        
        # Prepare program data
        name = new_name or import_data['name']
        config = import_data['config']
        
        # Create program
        program_data = {'name': name, 'config': config}
        program = self.create_program(program_data)
        
        logger.info(f"Program imported: {name}")
        
        return program

