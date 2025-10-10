"""Main Inspection Engine - Orchestrates the complete inspection flow"""

import time
import numpy as np
from typing import Dict, List, Optional, Tuple
from src.hardware.camera import CameraController
from src.hardware.gpio_controller import GPIOController, OutputManager
from src.tools.outline_tool import OutlineToolProcessor
from src.tools.area_tool import AreaToolProcessor
from src.tools.color_area_tool import ColorAreaToolProcessor
from src.tools.edge_detection_tool import EdgePixelsToolProcessor
from src.tools.position_adjustment import PositionAdjustmentToolProcessor
from src.utils.logger import get_logger

logger = get_logger('inspection')


class InspectionEngine:
    """
    Main inspection controller that orchestrates the complete inspection flow.
    
    Flow:
    1. Set BUSY output HIGH
    2. Capture image from camera
    3. If position tool exists: find offset, adjust ROIs
    4. Process all detection tools in sequence
    5. Aggregate results (OK if all tools OK)
    6. Set output states based on configuration
    7. Set BUSY output LOW
    8. Log results to database
    9. Update statistics
    """
    
    TOOL_CLASSES = {
        'outline': OutlineToolProcessor,
        'area': AreaToolProcessor,
        'color_area': ColorAreaToolProcessor,
        'edge_detection': EdgePixelsToolProcessor,
        'position_adjust': PositionAdjustmentToolProcessor
    }
    
    def __init__(
        self,
        program_config: Dict,
        camera: Optional[CameraController] = None,
        gpio: Optional[GPIOController] = None
    ):
        """
        Initialize inspection engine.
        
        Args:
            program_config: Program configuration dictionary
            camera: Optional camera controller (creates new if None)
            gpio: Optional GPIO controller (creates new if None)
        """
        self.program_config = program_config
        self.program_id = program_config.get('id')
        self.program_name = program_config.get('name', 'Unknown')
        
        # Initialize hardware
        self.camera = camera or CameraController()
        self.gpio = gpio or GPIOController()
        self.output_manager = OutputManager(self.gpio)
        
        # Tool processors
        self.tools: List = []
        self.position_tool: Optional[PositionAdjustmentToolProcessor] = None
        
        # Configuration
        self.trigger_type = program_config.get('triggerType', 'internal')
        self.brightness_mode = program_config.get('brightnessMode', 'normal')
        self.focus_value = program_config.get('focusValue', 50)
        self.output_config = program_config.get('outputs', {})
        
        # Load program
        self.load_program(program_config)
        
        logger.info(f"Inspection engine initialized for program: {self.program_name}")
    
    def load_program(self, config: Dict):
        """
        Load program configuration and initialize tools.
        
        Args:
            config: Program configuration dictionary
        """
        tools_config = config.get('tools', [])
        master_image_path = config.get('masterImage')
        
        if not master_image_path:
            raise ValueError("No master image specified in program configuration")
        
        # Load master image
        import cv2
        master_image = cv2.imread(master_image_path)
        if master_image is None:
            raise FileNotFoundError(f"Master image not found: {master_image_path}")
        
        # Convert BGR to RGB
        master_image = cv2.cvtColor(master_image, cv2.COLOR_BGR2RGB)
        
        # Initialize tools
        self.tools = []
        self.position_tool = None
        
        for tool_config in tools_config:
            tool_type = tool_config['type']
            
            if tool_type not in self.TOOL_CLASSES:
                logger.warning(f"Unknown tool type: {tool_type}")
                continue
            
            # Create tool instance
            tool_class = self.TOOL_CLASSES[tool_type]
            tool = tool_class()
            
            # Configure tool
            roi = tool_config['roi']
            threshold = tool_config['threshold']
            upper_limit = tool_config.get('upperLimit')
            
            # Extract master features
            try:
                tool.configure(roi=roi, threshold=threshold, upper_limit=upper_limit)
                tool.extract_master_features(master_image, roi)
                
                # Handle position adjustment tool specially
                if tool_type == 'position_adjust':
                    if self.position_tool is not None:
                        logger.warning("Multiple position adjustment tools found. Only first will be used.")
                    else:
                        self.position_tool = tool
                else:
                    self.tools.append(tool)
                
                logger.info(f"Loaded tool: {tool.name} (threshold: {threshold})")
                
            except Exception as e:
                logger.error(f"Failed to initialize tool {tool_type}: {e}")
        
        logger.info(f"Program loaded with {len(self.tools)} detection tools" + 
                   (f" + 1 position tool" if self.position_tool else ""))
    
    def run_inspection_cycle(self) -> Tuple[str, List[Dict], float, Optional[np.ndarray]]:
        """
        Execute single inspection cycle.
        
        Returns:
            Tuple of (status, tool_results, processing_time_ms, captured_image)
            - status: 'OK' or 'NG'
            - tool_results: List of tool result dictionaries
            - processing_time_ms: Total processing time
            - captured_image: Captured image (RGB)
        """
        start_time = time.time()
        
        try:
            # Step 1: Set BUSY output HIGH
            self.output_manager.set_busy(True)
            
            # Step 2: Capture image
            logger.debug("Capturing image...")
            image = self.camera.capture_image(
                brightness_mode=self.brightness_mode,
                focus_value=self.focus_value
            )
            
            if image is None:
                raise RuntimeError("Failed to capture image")
            
            # Quality consistency check (first cycle only)
            # This validates that captured images have consistent quality with master image
            # Critical for accurate template matching and inspection
            if not hasattr(self, '_quality_checked'):
                self._quality_checked = True
                if self.master_image is not None:
                    consistency = self.camera.validate_image_consistency(
                        self.master_image,
                        image
                    )
                    if not consistency['consistent']:
                        logger.error(
                            f"Image quality consistency check failed: "
                            f"{consistency['issues']}"
                        )
                        # Don't fail inspection, but log warnings
                    if consistency['warnings']:
                        logger.warning(
                            f"Image quality warnings (may affect matching accuracy): "
                            f"{consistency['warnings']}"
                        )
                    logger.info(f"Quality check: {consistency['recommendation']}")
            
            # Step 3: Position adjustment (if configured)
            position_offset = None
            position_result = None
            
            if self.position_tool:
                logger.debug("Processing position adjustment...")
                position_result = self.position_tool.process(image)
                
                if position_result['status'] == 'OK':
                    position_offset = position_result['offset']
                    logger.debug(f"Position offset: dx={position_offset['dx']}, dy={position_offset['dy']}")
                    
                    # Adjust all tool ROIs
                    if position_offset['dx'] != 0 or position_offset['dy'] != 0:
                        for tool in self.tools:
                            original_roi = tool.roi.copy()
                            tool.roi['x'] += position_offset['dx']
                            tool.roi['y'] += position_offset['dy']
                            logger.debug(f"Adjusted {tool.name} ROI by offset")
                else:
                    logger.warning(f"Position adjustment failed (confidence: {position_result['matching_rate']:.1f})")
            
            # Step 4: Process all detection tools
            logger.debug(f"Processing {len(self.tools)} detection tools...")
            tool_results = self.process_tools(image)
            
            # Add position tool result if present
            if position_result:
                tool_results.insert(0, position_result)
            
            # Step 5: Aggregate results (OK if all tools OK)
            overall_status = self.aggregate_results(tool_results)
            
            # Step 6: Set output states
            self.set_output_states(overall_status, tool_results)
            
            # Calculate processing time
            processing_time_ms = (time.time() - start_time) * 1000
            
            logger.info(f"Inspection complete: {overall_status} ({processing_time_ms:.1f}ms)")
            
            return overall_status, tool_results, processing_time_ms, image
            
        except Exception as e:
            logger.error(f"Inspection cycle failed: {e}", exc_info=True)
            raise
            
        finally:
            # Step 7: Set BUSY output LOW
            self.output_manager.set_busy(False)
    
    def process_tools(self, image: np.ndarray) -> List[Dict]:
        """
        Process all tools and return results.
        
        Args:
            image: Captured image (RGB)
            
        Returns:
            List of tool result dictionaries
        """
        tool_results = []
        
        for tool in self.tools:
            try:
                result = tool.process(image)
                tool_results.append(result)
                
                logger.debug(f"{tool.name}: {result['status']} (rate: {result['matching_rate']:.1f})")
                
            except Exception as e:
                logger.error(f"Tool {tool.name} failed: {e}")
                # Add failed result
                tool_results.append({
                    'tool_type': tool.tool_type,
                    'name': tool.name,
                    'status': 'NG',
                    'matching_rate': 0.0,
                    'error': str(e)
                })
        
        return tool_results
    
    def aggregate_results(self, tool_results: List[Dict]) -> str:
        """
        Aggregate tool results to determine overall status.
        
        Args:
            tool_results: List of tool result dictionaries
            
        Returns:
            Overall status: 'OK' if all tools OK, 'NG' otherwise
        """
        # OK only if ALL tools are OK
        for result in tool_results:
            if result['status'] == 'NG':
                return 'NG'
        
        return 'OK'
    
    def set_output_states(self, overall_status: str, tool_results: List[Dict]):
        """
        Set GPIO outputs based on configuration.
        
        Args:
            overall_status: Overall inspection status
            tool_results: List of tool results (not currently used, but available for custom logic)
        """
        # Apply inspection result to outputs
        self.output_manager.apply_inspection_result(
            status=overall_status,
            custom_output_config=self.output_config,
            pulse_duration_ms=100
        )
    
    def run_continuous(
        self,
        interval_ms: int = 1000,
        callback: Optional[callable] = None,
        stop_flag: Optional[callable] = None
    ):
        """
        Run continuous inspection loop.
        
        Args:
            interval_ms: Interval between inspections (for internal trigger)
            callback: Optional callback function(status, tool_results, processing_time, image)
            stop_flag: Optional function that returns True when loop should stop
        """
        logger.info(f"Starting continuous inspection (trigger: {self.trigger_type})")
        
        inspection_count = 0
        
        try:
            while True:
                # Check stop flag
                if stop_flag and stop_flag():
                    logger.info("Stop flag detected, ending continuous inspection")
                    break
                
                # Run inspection
                try:
                    status, tool_results, processing_time, image = self.run_inspection_cycle()
                    inspection_count += 1
                    
                    # Call callback if provided
                    if callback:
                        callback(status, tool_results, processing_time, image)
                    
                except Exception as e:
                    logger.error(f"Inspection cycle {inspection_count + 1} failed: {e}")
                
                # Wait for next trigger
                if self.trigger_type == 'internal':
                    # Internal trigger: wait for interval
                    time.sleep(interval_ms / 1000.0)
                else:
                    # External trigger: wait for GPIO signal
                    # TODO: Implement GPIO trigger monitoring
                    time.sleep(0.1)  # Polling interval
                    
        except KeyboardInterrupt:
            logger.info("Continuous inspection interrupted by user")
        
        finally:
            logger.info(f"Continuous inspection ended. Total inspections: {inspection_count}")
    
    def cleanup(self):
        """Cleanup resources."""
        logger.info("Cleaning up inspection engine resources...")
        
        if self.camera:
            self.camera.close()
        
        if self.gpio:
            self.gpio.cleanup()
    
    def __del__(self):
        """Cleanup on deletion."""
        self.cleanup()

