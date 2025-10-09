'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Trash2, Check, X, ChevronDown, ChevronUp, Grid3x3, Layers } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ToolConfig, ROI, ToolType } from '@/types';
import { TOOL_TYPES } from '@/types';

interface Step3Props {
  configuredTools: ToolConfig[];
  setConfiguredTools: (tools: ToolConfig[]) => void;
  masterImageData: string | null;
}

type EditMode = 'none' | 'drawing' | 'editing';
type ResizeHandle = 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r' | 'move' | null;

export default function Step3ToolConfiguration({
  configuredTools,
  setConfiguredTools,
  masterImageData,
}: Step3Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const masterImageRef = useRef<HTMLImageElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const [selectedToolType, setSelectedToolType] = useState<ToolType | null>(null);
  const [threshold, setThreshold] = useState([65]);
  const [editMode, setEditMode] = useState<EditMode>('none');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<ROI | null>(null);
  const [activeHandle, setActiveHandle] = useState<ResizeHandle>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [hoverHandle, setHoverHandle] = useState<ResizeHandle>(null);
  const [needsRedraw, setNeedsRedraw] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [toolListExpanded, setToolListExpanded] = useState(false);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const { toast } = useToast();

  // Load and cache master image
  useEffect(() => {
    if (masterImageData) {
      const img = new Image();
      img.onload = () => {
        masterImageRef.current = img;
        if (!offscreenCanvasRef.current) {
          offscreenCanvasRef.current = document.createElement('canvas');
          offscreenCanvasRef.current.width = 640;
          offscreenCanvasRef.current.height = 480;
        }
        setNeedsRedraw(true);
      };
      img.src = `data:image/jpeg;base64,${masterImageData}`;
    } else {
      masterImageRef.current = null;
      setNeedsRedraw(true);
    }
  }, [masterImageData]);

  // Optimized rendering loop
  useEffect(() => {
    if (needsRedraw) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(() => {
        drawCanvas();
        setNeedsRedraw(false);
      });
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [needsRedraw]);

  // Trigger redraw on state changes
  useEffect(() => {
    setNeedsRedraw(true);
  }, [configuredTools, currentRect, editMode, hoverHandle, showGrid, showLegend]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const offscreen = offscreenCanvasRef.current;
    const offscreenCtx = offscreen?.getContext('2d', { alpha: false });
    
    const drawingContext = offscreenCtx || ctx;
    const targetCanvas = offscreen || canvas;

    // Clear canvas
    drawingContext.fillStyle = '#1e293b';
    drawingContext.fillRect(0, 0, 640, 480);

    // Draw master image
    if (masterImageRef.current) {
      drawingContext.drawImage(masterImageRef.current, 0, 0, 640, 480);
    } else {
      drawingContext.fillStyle = '#64748b';
      drawingContext.font = '20px sans-serif';
      drawingContext.textAlign = 'center';
      drawingContext.fillText('No master image', 320, 240);
    }

    // Draw grid overlay
    if (showGrid) {
      drawGrid(drawingContext);
    }

    // Draw all ROIs
    drawROIs(drawingContext);

    // Draw legend overlay
    if (showLegend && configuredTools.length > 0) {
      drawLegend(drawingContext);
    }

    // Draw mouse coordinates overlay
    if (mousePos && selectedToolType) {
      drawMouseCoordinates(drawingContext);
    }

    // Copy to main canvas
    if (offscreen && offscreenCtx) {
      ctx.drawImage(offscreen, 0, 0);
    }
  };

  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    
    // Vertical lines
    for (let x = 0; x <= 640; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 480);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y <= 480; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(640, y);
      ctx.stroke();
    }
    
    ctx.restore();
  };

  const drawLegend = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(10, 10, 200, 30 + (configuredTools.length * 25));
    
    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, 200, 30 + (configuredTools.length * 25));
    
    // Title
    ctx.fillStyle = 'white';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Legend', 20, 28);
    
    // Tools
    ctx.font = '11px sans-serif';
    configuredTools.forEach((tool, index) => {
      const y = 48 + (index * 25);
      
      // Color indicator
      ctx.fillStyle = tool.color;
      ctx.fillRect(20, y - 8, 12, 12);
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 1;
      ctx.strokeRect(20, y - 8, 12, 12);
      
      // Tool name
      ctx.fillStyle = 'white';
      ctx.fillText(`${index + 1}. ${tool.name}`, 38, y);
    });
    
    ctx.restore();
  };

  const drawMouseCoordinates = (ctx: CanvasRenderingContext2D) => {
    if (!mousePos) return;
    
    ctx.save();
    
    const text = `X:${Math.round(mousePos.x)} Y:${Math.round(mousePos.y)}`;
    ctx.font = '12px monospace';
    const metrics = ctx.measureText(text);
    const padding = 8;
    const width = metrics.width + (padding * 2);
    const height = 24;
    
    // Position at top right
    const x = 640 - width - 10;
    const y = 10;
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(x, y, width, height);
    
    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
    
    // Text
    ctx.fillStyle = 'white';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + padding, y + height / 2);
    
    ctx.restore();
  };

  const drawROIs = (ctx: CanvasRenderingContext2D) => {
    ctx.save();

    // Draw all configured tool ROIs
    configuredTools.forEach((tool, index) => {
      ctx.strokeStyle = tool.color;
      ctx.lineWidth = 3;
      ctx.strokeRect(tool.roi.x, tool.roi.y, tool.roi.width, tool.roi.height);

      // Draw label with background
      ctx.fillStyle = tool.color;
      ctx.fillRect(tool.roi.x, tool.roi.y - 25, 150, 25);
      ctx.fillStyle = 'white';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${index + 1}. ${tool.name}`, tool.roi.x + 5, tool.roi.y - 12);
    });

    // Draw current rectangle being drawn/edited
    if (currentRect && selectedToolType) {
      const tool = TOOL_TYPES.find(t => t.id === selectedToolType);
      if (tool) {
        ctx.strokeStyle = tool.color;
        ctx.lineWidth = editMode === 'editing' ? 3 : 2;
        
        if (editMode === 'drawing') {
          ctx.setLineDash([5, 5]);
        } else {
          ctx.setLineDash([]);
        }
        
        ctx.strokeRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
        ctx.setLineDash([]);

        // Draw resize handles in edit mode
        if (editMode === 'editing') {
          drawResizeHandles(ctx, currentRect, tool.color);
        }
      }
    }

    ctx.restore();
  };

  const drawResizeHandles = (ctx: CanvasRenderingContext2D, roi: ROI, color: string) => {
    const handleSize = 10;
    const halfSize = handleSize / 2;
    
    const midX = roi.x + roi.width / 2;
    const midY = roi.y + roi.height / 2;
    const rightX = roi.x + roi.width;
    const bottomY = roi.y + roi.height;
    
    const handles = [
      { x: roi.x, y: roi.y },
      { x: rightX, y: roi.y },
      { x: roi.x, y: bottomY },
      { x: rightX, y: bottomY },
      { x: midX, y: roi.y },
      { x: midX, y: bottomY },
      { x: roi.x, y: midY },
      { x: rightX, y: midY },
    ];

    ctx.save();
    ctx.fillStyle = 'white';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    
    handles.forEach(handle => {
      const hx = handle.x - halfSize;
      const hy = handle.y - halfSize;
      ctx.fillRect(hx, hy, handleSize, handleSize);
      ctx.strokeRect(hx, hy, handleSize, handleSize);
    });
    
    ctx.restore();
  };

  const getHandleAtPosition = (x: number, y: number, roi: ROI): ResizeHandle => {
    const tolerance = 12;

    if (Math.abs(x - roi.x) <= tolerance && Math.abs(y - roi.y) <= tolerance) return 'tl';
    if (Math.abs(x - (roi.x + roi.width)) <= tolerance && Math.abs(y - roi.y) <= tolerance) return 'tr';
    if (Math.abs(x - roi.x) <= tolerance && Math.abs(y - (roi.y + roi.height)) <= tolerance) return 'bl';
    if (Math.abs(x - (roi.x + roi.width)) <= tolerance && Math.abs(y - (roi.y + roi.height)) <= tolerance) return 'br';

    if (Math.abs(x - (roi.x + roi.width / 2)) <= tolerance && Math.abs(y - roi.y) <= tolerance) return 't';
    if (Math.abs(x - (roi.x + roi.width / 2)) <= tolerance && Math.abs(y - (roi.y + roi.height)) <= tolerance) return 'b';
    if (Math.abs(x - roi.x) <= tolerance && Math.abs(y - (roi.y + roi.height / 2)) <= tolerance) return 'l';
    if (Math.abs(x - (roi.x + roi.width)) <= tolerance && Math.abs(y - (roi.y + roi.height / 2)) <= tolerance) return 'r';

    if (x >= roi.x && x <= roi.x + roi.width && y >= roi.y && y <= roi.y + roi.height) return 'move';

    return null;
  };

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    return { x, y };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e);
    if (!coords) return;
    const { x, y } = coords;

    if (editMode === 'editing' && currentRect) {
      const handle = getHandleAtPosition(x, y, currentRect);
      if (handle) {
        setActiveHandle(handle);
        setDragStart({ x, y });
        return;
      }
    }

    if (!selectedToolType) {
      toast({
        title: "No Tool Selected",
        description: "Please select a tool type first",
        variant: "destructive",
      });
      return;
    }

    if (editMode !== 'none') {
      return;
    }

    // Check constraints
    if (selectedToolType === 'position_adjust') {
      const posCount = configuredTools.filter(t => t.type === 'position_adjust').length;
      if (posCount >= 1) {
        toast({
          title: "Limit Reached",
          description: "Maximum 1 position adjustment tool allowed",
          variant: "destructive",
        });
        return;
      }
    }

    if (configuredTools.length >= 16) {
      toast({
        title: "Limit Reached",
        description: "Maximum 16 tools allowed per program",
        variant: "destructive",
      });
      return;
    }

    setEditMode('drawing');
    setIsDrawing(true);
    setStartPoint({ x, y });
    setCurrentRect({ x, y, width: 0, height: 0 });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e);
    if (!coords) return;
    const { x, y } = coords;

    // Update mouse position for coordinates display
    setMousePos({ x, y });

    if (editMode === 'editing' && currentRect && !activeHandle) {
      const handle = getHandleAtPosition(x, y, currentRect);
      if (handle !== hoverHandle) {
        setHoverHandle(handle);
      }
    }

    if (isDrawing && startPoint && editMode === 'drawing') {
      const width = x - startPoint.x;
      const height = y - startPoint.y;

      const newRect = {
        x: width < 0 ? x : startPoint.x,
        y: height < 0 ? y : startPoint.y,
        width: Math.abs(width),
        height: Math.abs(height),
      };
      
      setCurrentRect(newRect);
      setNeedsRedraw(true);
      return;
    }

    if (activeHandle && dragStart && currentRect && editMode === 'editing') {
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;

      let newRect = { ...currentRect };

      switch (activeHandle) {
        case 'tl':
          newRect = {
            x: currentRect.x + dx,
            y: currentRect.y + dy,
            width: currentRect.width - dx,
            height: currentRect.height - dy,
          };
          break;
        case 'tr':
          newRect = {
            x: currentRect.x,
            y: currentRect.y + dy,
            width: currentRect.width + dx,
            height: currentRect.height - dy,
          };
          break;
        case 'bl':
          newRect = {
            x: currentRect.x + dx,
            y: currentRect.y,
            width: currentRect.width - dx,
            height: currentRect.height + dy,
          };
          break;
        case 'br':
          newRect = {
            x: currentRect.x,
            y: currentRect.y,
            width: currentRect.width + dx,
            height: currentRect.height + dy,
          };
          break;
        case 't':
          newRect = {
            x: currentRect.x,
            y: currentRect.y + dy,
            width: currentRect.width,
            height: currentRect.height - dy,
          };
          break;
        case 'b':
          newRect = {
            x: currentRect.x,
            y: currentRect.y,
            width: currentRect.width,
            height: currentRect.height + dy,
          };
          break;
        case 'l':
          newRect = {
            x: currentRect.x + dx,
            y: currentRect.y,
            width: currentRect.width - dx,
            height: currentRect.height,
          };
          break;
        case 'r':
          newRect = {
            x: currentRect.x,
            y: currentRect.y,
            width: currentRect.width + dx,
            height: currentRect.height,
          };
          break;
        case 'move':
          newRect = {
            x: currentRect.x + dx,
            y: currentRect.y + dy,
            width: currentRect.width,
            height: currentRect.height,
          };
          break;
      }

      // Ensure positive dimensions
      if (newRect.width < 0) {
        newRect.x += newRect.width;
        newRect.width = Math.abs(newRect.width);
      }
      if (newRect.height < 0) {
        newRect.y += newRect.height;
        newRect.height = Math.abs(newRect.height);
      }

      setCurrentRect(newRect);
      setDragStart({ x, y });
      setNeedsRedraw(true);
    }
  };

  const handleCanvasMouseUp = () => {
    if (isDrawing && currentRect && editMode === 'drawing') {
      setIsDrawing(false);
      setStartPoint(null);

      if (currentRect.width > 10 && currentRect.height > 10) {
        setEditMode('editing');
        toast({
          title: "ROI Created",
          description: "Adjust the ROI or click 'Save Tool' to confirm",
        });
      } else {
        setCurrentRect(null);
        setEditMode('none');
      }
      return;
    }

    if (activeHandle && editMode === 'editing') {
      setActiveHandle(null);
      setDragStart(null);
    }
  };

  const handleCanvasMouseLeave = () => {
    setMousePos(null);
    setHoverHandle(null);
    
    if (isDrawing || activeHandle) {
      handleCanvasMouseUp();
    }
  };

  const handleSaveTool = () => {
    if (!currentRect || !selectedToolType) return;

    const tool = TOOL_TYPES.find(t => t.id === selectedToolType);
    if (tool) {
      const newTool: ToolConfig = {
        id: `${selectedToolType}-${Date.now()}`,
        type: selectedToolType,
        name: tool.name,
        color: tool.color,
        roi: currentRect,
        threshold: threshold[0],
      };
      setConfiguredTools([...configuredTools, newTool]);
      
      toast({
        title: "Tool Added",
        description: `${tool.name} configured successfully`,
      });

      setEditMode('none');
      setCurrentRect(null);
      // Keep threshold and selected tool for next tool
    }
  };

  const handleCancelTool = () => {
    setEditMode('none');
    setCurrentRect(null);
    setIsDrawing(false);
    setStartPoint(null);
    setActiveHandle(null);
    setDragStart(null);
    
    toast({
      title: "Cancelled",
      description: "Tool creation cancelled",
    });
  };

  const handleDeleteTool = (id: string) => {
    setConfiguredTools(configuredTools.filter(t => t.id !== id));
    toast({
      title: "Tool Removed",
      description: "Tool configuration deleted",
    });
  };

  const handleClearSelection = () => {
    setSelectedToolType(null);
    setEditMode('none');
    setCurrentRect(null);
    setThreshold([65]);
  };

  const getCursorStyle = () => {
    if (editMode === 'editing') {
      if (hoverHandle === 'tl' || hoverHandle === 'br') return 'cursor-nwse-resize';
      if (hoverHandle === 'tr' || hoverHandle === 'bl') return 'cursor-nesw-resize';
      if (hoverHandle === 't' || hoverHandle === 'b') return 'cursor-ns-resize';
      if (hoverHandle === 'l' || hoverHandle === 'r') return 'cursor-ew-resize';
      if (hoverHandle === 'move') return 'cursor-move';
      return 'cursor-default';
    }
    if (editMode === 'drawing') {
      return 'cursor-crosshair';
    }
    return selectedToolType ? 'cursor-crosshair' : 'cursor-default';
  };

  // Count tools by type
  const getToolCount = (toolType: ToolType) => {
    return configuredTools.filter(t => t.type === toolType).length;
  };

  const isToolDisabled = (toolType: ToolType) => {
    if (editMode !== 'none') return true;
    if (toolType === 'position_adjust' && getToolCount(toolType) >= 1) return true;
    if (configuredTools.length >= 16) return true;
    return false;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Step 3: Tool Configuration</h2>
        <p className="text-muted-foreground mt-2">
          Draw regions of interest and configure inspection tools
        </p>
      </div>

      {/* Section 1: Horizontal Tool Selection Bar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>SELECT TOOL TYPE</CardTitle>
            {selectedToolType && (
              <Badge variant="outline" className="text-sm">
                Selected: {TOOL_TYPES.find(t => t.id === selectedToolType)?.name}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {TOOL_TYPES.map((tool) => {
              const count = getToolCount(tool.id);
              const disabled = isToolDisabled(tool.id);
              const isSelected = selectedToolType === tool.id;

              return (
                <button
                  key={tool.id}
                  onClick={() => {
                    if (!disabled) {
                      setSelectedToolType(tool.id);
                    }
                  }}
                  disabled={disabled}
                  className={`flex-shrink-0 w-32 p-4 border-2 rounded-lg transition-all duration-200 ${
                    isSelected
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/20 scale-105'
                      : disabled
                      ? 'opacity-50 cursor-not-allowed border-border'
                      : 'border-border hover:border-primary/50 hover:bg-accent/50'
                  }`}
                  style={{
                    borderColor: isSelected ? tool.color : undefined,
                  }}
                >
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-2xl"
                      style={{ backgroundColor: tool.color }}
                    >
                      {count}
                    </div>
                    <div className="text-xs font-semibold line-clamp-2">
                      {tool.name}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          
          {selectedToolType ? (
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-900 dark:text-green-100">
                ✓ Tool selected. Draw on the canvas below to create a region of interest (ROI).
              </p>
            </div>
          ) : (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                Select a tool type above to begin configuration
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Full-Width Interactive Canvas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {editMode === 'editing' 
                  ? 'EDIT ROI - Drag handles to resize, drag body to move' 
                  : 'INTERACTIVE CANVAS'}
              </CardTitle>
              <CardDescription>
                {!selectedToolType && 'Select a tool type above to start drawing'}
                {selectedToolType && editMode === 'none' && 'Click and drag to draw a rectangular ROI'}
                {editMode === 'editing' && 'Adjust the ROI size and position as needed'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={showLegend ? "default" : "outline"}
                onClick={() => setShowLegend(!showLegend)}
                disabled={configuredTools.length === 0}
              >
                <Layers className="h-4 w-4 mr-1" />
                Legend
              </Button>
              <Button
                size="sm"
                variant={showGrid ? "default" : "outline"}
                onClick={() => setShowGrid(!showGrid)}
              >
                <Grid3x3 className="h-4 w-4 mr-1" />
                Grid
              </Button>
              <Badge variant="outline" className="text-sm">
                {configuredTools.length}/16
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseLeave}
              className={`border rounded w-full aspect-[4/3] ${getCursorStyle()}`}
              style={{ maxWidth: '100%', height: 'auto' }}
            />
          </div>
          
          {editMode === 'editing' && (
            <div className="flex gap-2 mt-4">
              <Button 
                onClick={handleSaveTool} 
                className="flex-1"
                variant="default"
              >
                <Check className="h-4 w-4 mr-2" />
                Save Tool
              </Button>
              <Button 
                onClick={handleCancelTool} 
                className="flex-1"
                variant="outline"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Contextual Threshold Bar (only when tool selected) */}
      {selectedToolType && editMode !== 'none' && (
        <Card className="border-2" style={{ borderColor: TOOL_TYPES.find(t => t.id === selectedToolType)?.color }}>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded"
                    style={{ backgroundColor: TOOL_TYPES.find(t => t.id === selectedToolType)?.color }}
                  />
                  <div>
                    <Label className="text-base font-semibold">
                      {TOOL_TYPES.find(t => t.id === selectedToolType)?.name}
                    </Label>
                    <p className="text-xs text-muted-foreground">Active Tool</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">{threshold[0]}%</div>
                  <p className="text-xs text-muted-foreground">Threshold</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Slider
                  value={threshold}
                  onValueChange={setThreshold}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Strict (0)</span>
                  <span>Balanced (50)</span>
                  <span>Lenient (100)</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleClearSelection}
                  className="flex-1"
                >
                  Clear Selection
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelTool}
                  className="flex-1"
                >
                  Undo Last
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 4: Collapsible Configured Tools List */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => setToolListExpanded(!toolListExpanded)}>
          <div className="flex items-center justify-between">
            <CardTitle>
              CONFIGURED TOOLS ({configuredTools.length}/16)
            </CardTitle>
            <Button size="sm" variant="ghost">
              {toolListExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Collapse
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Expand
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {configuredTools.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No tools configured yet. Select a tool type and draw on the canvas.
            </p>
          ) : toolListExpanded ? (
            // Expanded View: Grid Layout
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {configuredTools.map((tool, index) => (
                <div
                  key={tool.id}
                  className="p-4 border-2 rounded-lg hover:border-primary/50 hover:shadow-lg transition-all"
                  style={{ borderColor: tool.color }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded flex-shrink-0"
                        style={{ backgroundColor: tool.color }}
                      />
                      <span className="font-semibold text-sm">
                        {index + 1}. {tool.name}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteTool(tool.id)}
                      className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      disabled={editMode !== 'none'}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Position:</span>
                      <span className="font-mono">X:{tool.roi.x} Y:{tool.roi.y}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Size:</span>
                      <span className="font-mono">{tool.roi.width}×{tool.roi.height}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Threshold:</span>
                      <Badge variant="secondary" className="text-xs">{tool.threshold}%</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Collapsed View: Horizontal Chips
            <div className="flex flex-wrap gap-2">
              {configuredTools.map((tool, index) => (
                <div
                  key={tool.id}
                  className="flex items-center gap-2 px-3 py-2 bg-accent/50 border rounded-full hover:bg-accent hover:shadow-md transition-all"
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tool.color }}
                  />
                  <span className="text-sm font-medium">
                    {index + 1}. {tool.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {tool.roi.width}×{tool.roi.height}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteTool(tool.id)}
                    className="h-5 w-5 p-0 rounded-full ml-1"
                    disabled={editMode !== 'none'}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
