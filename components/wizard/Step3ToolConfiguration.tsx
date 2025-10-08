'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ToolConfig, ROI, ToolType } from '@/types';
import { TOOL_TYPES } from '@/types';

interface Step3Props {
  configuredTools: ToolConfig[];
  setConfiguredTools: (tools: ToolConfig[]) => void;
  masterImageData: string | null;
}

export default function Step3ToolConfiguration({
  configuredTools,
  setConfiguredTools,
  masterImageData,
}: Step3Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedToolType, setSelectedToolType] = useState<ToolType | null>(null);
  const [threshold, setThreshold] = useState([65]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<ROI | null>(null);
  const { toast } = useToast();

  // Draw canvas whenever tools or master image changes
  useEffect(() => {
    drawCanvas();
  }, [configuredTools, currentRect, masterImageData]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, 640, 480);

    // Draw master image if available
    if (masterImageData) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, 640, 480);
        drawROIs(ctx);
      };
      img.src = `data:image/jpeg;base64,${masterImageData}`;
    } else {
      // Draw placeholder
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, 640, 480);
      ctx.fillStyle = '#64748b';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No master image', 320, 240);
      drawROIs(ctx);
    }
  };

  const drawROIs = (ctx: CanvasRenderingContext2D) => {
    // Draw all configured tool ROIs
    configuredTools.forEach((tool, index) => {
      ctx.strokeStyle = tool.color;
      ctx.lineWidth = 3;
      ctx.strokeRect(tool.roi.x, tool.roi.y, tool.roi.width, tool.roi.height);

      // Draw label
      ctx.fillStyle = tool.color;
      ctx.fillRect(tool.roi.x, tool.roi.y - 25, 150, 25);
      ctx.fillStyle = 'white';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${index + 1}. ${tool.name}`, tool.roi.x + 5, tool.roi.y - 8);
    });

    // Draw current rectangle being drawn
    if (currentRect && selectedToolType) {
      const tool = TOOL_TYPES.find(t => t.id === selectedToolType);
      if (tool) {
        ctx.strokeStyle = tool.color;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
        ctx.setLineDash([]);
      }
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedToolType) {
      toast({
        title: "No Tool Selected",
        description: "Please select a tool type first",
        variant: "destructive",
      });
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

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setStartPoint({ x, y });
    setCurrentRect({ x, y, width: 0, height: 0 });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const width = x - startPoint.x;
    const height = y - startPoint.y;

    setCurrentRect({
      x: width < 0 ? x : startPoint.x,
      y: height < 0 ? y : startPoint.y,
      width: Math.abs(width),
      height: Math.abs(height),
    });
  };

  const handleCanvasMouseUp = () => {
    if (!isDrawing || !currentRect || !selectedToolType) return;

    // Only add if rectangle has meaningful size
    if (currentRect.width > 10 && currentRect.height > 10) {
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
      }
    }

    setIsDrawing(false);
    setStartPoint(null);
    setCurrentRect(null);
  };

  const handleDeleteTool = (id: string) => {
    setConfiguredTools(configuredTools.filter(t => t.id !== id));
    toast({
      title: "Tool Removed",
      description: "Tool configuration deleted",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Step 3: Tool Configuration</h2>
        <p className="text-muted-foreground mt-2">
          Draw regions of interest and configure inspection tools
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Canvas */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Draw ROI (Region of Interest)</CardTitle>
            </CardHeader>
            <CardContent>
              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                className={`border rounded w-full ${
                  selectedToolType ? 'cursor-crosshair' : 'cursor-not-allowed'
                }`}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Tool Selection & Configuration */}
        <div className="space-y-4">
          {/* Tool Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Tool Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {TOOL_TYPES.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => setSelectedToolType(tool.id)}
                  className={`w-full text-left p-3 border rounded transition-all ${
                    selectedToolType === tool.id
                      ? 'border-2 bg-accent'
                      : 'hover:bg-accent/50'
                  }`}
                  style={{
                    borderColor: selectedToolType === tool.id ? tool.color : undefined,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: tool.color }}
                    />
                    <div className="flex-1">
                      <p className="font-semibold">{tool.name}</p>
                      <p className="text-xs text-muted-foreground">{tool.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Threshold Setting */}
          <Card>
            <CardHeader>
              <CardTitle>Threshold Setting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <Label>Threshold</Label>
                <span className="font-bold">{threshold[0]}</span>
              </div>
              <Slider
                value={threshold}
                onValueChange={setThreshold}
                min={0}
                max={100}
                step={1}
              />
            </CardContent>
          </Card>

          {/* Configured Tools List */}
          <Card>
            <CardHeader>
              <CardTitle>
                Configured Tools ({configuredTools.length}/16)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {configuredTools.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No tools configured yet. Select a tool type and draw on the canvas.
                </p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {configuredTools.map((tool, index) => (
                    <div
                      key={tool.id}
                      className="flex items-center justify-between p-2 border rounded hover:bg-accent/50"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <div
                          className="w-3 h-3 rounded flex-shrink-0"
                          style={{ backgroundColor: tool.color }}
                        />
                        <span className="text-sm">
                          {index + 1}. {tool.name}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {tool.threshold}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteTool(tool.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

