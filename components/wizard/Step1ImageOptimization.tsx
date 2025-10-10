"use client"

import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { 
  Camera, Settings, Zap, Eye, Image as ImageIcon, 
  Activity, CheckCircle2, AlertCircle, Info, 
  RotateCcw, Save, Download, Play, Pause 
} from "lucide-react"
import { api } from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"

interface Step1Props {
  brightnessMode: 'normal' | 'hdr' | 'highgain';
  setBrightnessMode: (mode: 'normal' | 'hdr' | 'highgain') => void;
  focusValue: number[];
  setFocusValue: (value: number[]) => void;
}

export default function Step1ImageOptimization({
  brightnessMode,
  setBrightnessMode,
  focusValue,
  setFocusValue,
}: Step1Props) {
  const { toast } = useToast()
  // Sensor Configuration States
  const [lightingMode, setLightingMode] = useState("normal")
  const [exposureTime, setExposureTime] = useState([5000]) // microseconds
  const [analogGain, setAnalogGain] = useState([1.0]) // 1.0-16.0x
  const [digitalGain, setDigitalGain] = useState([1.0])
  const [whiteBalanceMode, setWhiteBalanceMode] = useState("auto")
  const [awbRedGain, setAwbRedGain] = useState([1.5])
  const [awbBlueGain, setAwbBlueGain] = useState([1.8])
  
  // OpenCV Enhancement States
  const [denoisingMode, setDenoisingMode] = useState("gaussian")
  const [denoisingH, setDenoisingH] = useState([10])
  const [claheEnabled, setClaheEnabled] = useState(true)
  const [claheClipLimit, setClaheClipLimit] = useState([2.0])
  const [claheTileSize, setClaheTileSize] = useState([8])
  const [sharpenEnabled, setSharpenEnabled] = useState(true)
  const [sharpenAmount, setSharpenAmount] = useState([1.0])
  const [sharpenSigma, setSharpenSigma] = useState([1.5])
  
  // Performance States
  const [targetResolution, setTargetResolution] = useState("1080p")
  const [targetFps, setTargetFps] = useState(30)
  const [neonEnabled, setNeonEnabled] = useState(true)
  const [dualStreamEnabled, setDualStreamEnabled] = useState(true)
  
  // Live Preview States
  const [isPreviewActive, setIsPreviewActive] = useState(false)
  const [currentFps, setCurrentFps] = useState(0)
  const [processingTime, setProcessingTime] = useState(0)
  const [previewMode, setPreviewMode] = useState("enhanced")
  
  // Camera Integration States
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [imageQuality, setImageQuality] = useState<any>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [cameraStatus, setCameraStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected')
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Sync lighting mode with parent brightnessMode
  useEffect(() => {
    if (lightingMode === 'bright' || lightingMode === 'normal') {
      setBrightnessMode('normal')
    } else if (lightingMode === 'low' || lightingMode === 'astro') {
      setBrightnessMode('highgain')
    }
  }, [lightingMode, setBrightnessMode])
  
  // Calculate ISO from analog gain
  const calculateISO = (gain: number) => {
    return Math.round(100 * gain)
  }
  
  // Calculate suggested exposure time based on lighting
  const getSuggestedExposure = () => {
    switch(lightingMode) {
      case "bright": return { min: 125, max: 1000, suggested: 500 }
      case "normal": return { min: 1000, max: 10000, suggested: 5000 }
      case "low": return { min: 10000, max: 100000, suggested: 33333 }
      case "astro": return { min: 100000, max: 5000000, suggested: 1000000 }
      default: return { min: 1000, max: 10000, suggested: 5000 }
    }
  }
  
  // Calculate suggested analog gain based on lighting
  const getSuggestedGain = () => {
    switch(lightingMode) {
      case "bright": return { min: 1.0, max: 2.0, suggested: 1.0 }
      case "normal": return { min: 1.0, max: 4.0, suggested: 2.0 }
      case "low": return { min: 4.0, max: 16.0, suggested: 8.0 }
      case "astro": return { min: 8.0, max: 16.0, suggested: 16.0 }
      default: return { min: 1.0, max: 4.0, suggested: 2.0 }
    }
  }
  
  // Check camera connection on mount
  useEffect(() => {
    checkCameraConnection()
  }, [])
  
  const checkCameraConnection = async () => {
    try {
      const health = await fetch('/api/health')
      const data = await health.json()
      if (data.components?.camera === 'ok') {
        setCameraStatus('connected')
      } else {
        setCameraStatus('error')
      }
    } catch (error) {
      console.error('Camera connection check failed:', error)
      setCameraStatus('error')
    }
  }
  
  // Capture image from real camera
  const captureRealImage = async () => {
    if (cameraStatus !== 'connected') {
      toast({
        title: "Camera Not Available",
        description: "Please ensure the Logitech C925e is connected.",
        variant: "destructive"
      })
      return
    }
    
    setIsCapturing(true)
    try {
      const result = await api.captureImage({
        brightnessMode,
        focusValue: focusValue[0]
      })
      
      setCapturedImage(result.image)
      setImageQuality(result.quality)
      
      // Draw captured image to canvas
      if (canvasRef.current && result.image) {
        const img = new Image()
        img.onload = () => {
          const ctx = canvasRef.current?.getContext('2d')
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height)
            ctx.drawImage(img, 0, 0, canvasRef.current!.width, canvasRef.current!.height)
          }
        }
        img.src = `data:image/jpeg;base64,${result.image}`
      }
      
      toast({
        title: "Image Captured",
        description: `Quality Score: ${result.quality?.score?.toFixed(2) || 'N/A'}`,
      })
    } catch (error) {
      console.error('Capture failed:', error)
      toast({
        title: "Capture Failed",
        description: "Failed to capture image from camera.",
        variant: "destructive"
      })
    } finally {
      setIsCapturing(false)
    }
  }
  
  // Auto-optimize using backend
  const autoOptimizeCamera = async () => {
    if (cameraStatus !== 'connected') {
      toast({
        title: "Camera Not Available",
        description: "Please ensure the Logitech C925e is connected.",
        variant: "destructive"
      })
      return
    }
    
    setIsOptimizing(true)
    try {
      const result = await api.autoOptimize()
      
      // Update local state with optimized values
      if (result.optimalBrightness) {
        setBrightnessMode(result.optimalBrightness as any)
      }
      if (result.optimalFocus !== undefined) {
        setFocusValue([result.optimalFocus])
      }
      
      toast({
        title: "Auto-Optimization Complete",
        description: `Optimal Focus: ${result.optimalFocus}, Brightness: ${result.optimalBrightness}`,
      })
      
      // Capture a test image with new settings
      setTimeout(() => captureRealImage(), 500)
    } catch (error) {
      console.error('Auto-optimize failed:', error)
      toast({
        title: "Optimization Failed",
        description: "Failed to auto-optimize camera settings.",
        variant: "destructive"
      })
    } finally {
      setIsOptimizing(false)
    }
  }
  
  // Auto-optimize based on lighting mode (local simulation)
  const autoOptimize = () => {
    const exposure = getSuggestedExposure()
    const gain = getSuggestedGain()
    
    setExposureTime([exposure.suggested])
    setAnalogGain([gain.suggested])
    
    // Adjust denoising based on gain
    if (gain.suggested >= 8.0) {
      setDenoisingMode("nlmeans")
      setDenoisingH([15])
    } else if (gain.suggested >= 4.0) {
      setDenoisingMode("bilateral")
      setDenoisingH([10])
    } else {
      setDenoisingMode("gaussian")
      setDenoisingH([5])
    }
    
    // Enable aggressive CLAHE for low light
    if (lightingMode === "low" || lightingMode === "astro") {
      setClaheClipLimit([3.0])
    } else {
      setClaheClipLimit([2.0])
    }
  }
  
  // Simulate live preview rendering
  useEffect(() => {
    if (!isPreviewActive || !canvasRef.current) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const animate = () => {
      // Simulate camera frame
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Draw gradient to simulate image
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width / 2
      )
      
      // Adjust brightness based on exposure and gain
      const brightness = Math.min(255, (exposureTime[0] / 10000) * analogGain[0] * 50)
      gradient.addColorStop(0, `rgb(${brightness}, ${brightness}, ${brightness})`)
      gradient.addColorStop(1, `rgb(${brightness * 0.3}, ${brightness * 0.3}, ${brightness * 0.3})`)
      
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Add noise pattern based on gain
      if (analogGain[0] > 4.0) {
        const noiseIntensity = (analogGain[0] - 4.0) * 5
        for (let i = 0; i < 500; i++) {
          const x = Math.random() * canvas.width
          const y = Math.random() * canvas.height
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * noiseIntensity / 100})`
          ctx.fillRect(x, y, 1, 1)
        }
      }
      
      // Draw enhancement indicators
      if (previewMode === "enhanced") {
        // CLAHE indicator
        if (claheEnabled) {
          ctx.fillStyle = 'rgba(16, 185, 129, 0.2)'
          ctx.fillRect(10, 10, 120, 30)
          ctx.fillStyle = '#10B981'
          ctx.font = '12px monospace'
          ctx.fillText('CLAHE Active', 15, 30)
        }
        
        // Sharpening indicator
        if (sharpenEnabled) {
          ctx.fillStyle = 'rgba(59, 130, 246, 0.2)'
          ctx.fillRect(140, 10, 120, 30)
          ctx.fillStyle = '#3B82F6'
          ctx.fillText('Sharpen Active', 145, 30)
        }
      }
      
      // Performance metrics
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.fillRect(10, canvas.height - 80, 200, 70)
      
      ctx.fillStyle = '#10B981'
      ctx.font = '14px monospace'
      ctx.fillText(`FPS: ${currentFps}`, 20, canvas.height - 55)
      ctx.fillText(`Latency: ${processingTime}ms`, 20, canvas.height - 35)
      ctx.fillText(`ISO: ${calculateISO(analogGain[0])}`, 20, canvas.height - 15)
    }
    
    const interval = setInterval(() => {
      animate()
      // Simulate performance metrics
      setCurrentFps(Math.round(25 + Math.random() * 10))
      setProcessingTime(Math.round(15 + Math.random() * 10))
    }, 100)
    
    return () => clearInterval(interval)
  }, [isPreviewActive, exposureTime, analogGain, claheEnabled, sharpenEnabled, previewMode, currentFps, processingTime])
  
  // Get performance recommendation
  const getPerformanceStatus = () => {
    const expectedFps = targetFps
    if (processingTime < 1000 / expectedFps) {
      return { status: "excellent", color: "text-green-500", message: "Performance excellent" }
    } else if (processingTime < 1000 / (expectedFps * 0.8)) {
      return { status: "good", color: "text-blue-500", message: "Performance good" }
    } else if (processingTime < 1000 / (expectedFps * 0.6)) {
      return { status: "warning", color: "text-yellow-500", message: "Consider reducing resolution" }
    } else {
      return { status: "critical", color: "text-red-500", message: "Optimization required" }
    }
  }
  
  const perfStatus = getPerformanceStatus()
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            Step 1: Image Optimization
            <Badge 
              variant={cameraStatus === 'connected' ? 'default' : 'destructive'}
              className={cameraStatus === 'connected' ? 'bg-green-500' : ''}
            >
              <Camera className="mr-1 h-3 w-3" />
              {cameraStatus === 'connected' ? 'Logitech C925e Connected' : 'Camera Disconnected'}
            </Badge>
          </h2>
          <p className="text-muted-foreground mt-1">
            Real-time camera preview and optimization for Logitech Webcam C925e
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={autoOptimizeCamera}
            disabled={cameraStatus !== 'connected' || isOptimizing}
          >
            <Zap className="mr-2 h-4 w-4" />
            {isOptimizing ? 'Optimizing...' : 'Auto Optimize Camera'}
          </Button>
          <Button 
            variant="outline"
            onClick={captureRealImage}
            disabled={cameraStatus !== 'connected' || isCapturing}
          >
            <Camera className="mr-2 h-4 w-4" />
            {isCapturing ? 'Capturing...' : 'Capture Test Image'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="sensor" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sensor">
            <Camera className="mr-2 h-4 w-4" />
            Sensor Config
          </TabsTrigger>
          <TabsTrigger value="opencv">
            <Eye className="mr-2 h-4 w-4" />
            OpenCV Enhancement
          </TabsTrigger>
          <TabsTrigger value="performance">
            <Activity className="mr-2 h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="preview">
            <ImageIcon className="mr-2 h-4 w-4" />
            Live Preview
          </TabsTrigger>
        </TabsList>

        {/* Sensor Configuration Tab */}
        <TabsContent value="sensor" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Left Column - Settings */}
            <div className="space-y-4">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Settings className="mr-2 h-5 w-5" />
                  Lighting Scenario
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    {['bright', 'normal', 'low', 'astro'].map((mode) => (
                      <Button
                        key={mode}
                        variant={lightingMode === mode ? "default" : "outline"}
                        onClick={() => setLightingMode(mode)}
                        className="capitalize"
                      >
                        {mode === 'bright' && '☀️ Bright'}
                        {mode === 'normal' && '🌤️ Normal'}
                        {mode === 'low' && '🌙 Low Light'}
                        {mode === 'astro' && '⭐ Astrophotography'}
                      </Button>
                    ))}
                  </div>
                  
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-blue-500 mb-1">Recommended Settings</p>
                        <p className="text-muted-foreground">
                          Exposure: {getSuggestedExposure().suggested}μs | 
                          Gain: {getSuggestedGain().suggested}x (ISO {calculateISO(getSuggestedGain().suggested)})
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Exposure Control</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Exposure Time (μs)</Label>
                      <Badge variant="outline">{exposureTime[0]}μs</Badge>
                    </div>
                    <Slider
                      value={exposureTime}
                      onValueChange={setExposureTime}
                      min={getSuggestedExposure().min}
                      max={getSuggestedExposure().max}
                      step={100}
                      className="mb-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{getSuggestedExposure().min}μs</span>
                      <span>{getSuggestedExposure().max}μs</span>
                    </div>
                  </div>

                  <div className="p-3 bg-accent rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Frame Rate Impact</span>
                      <span className="font-mono font-semibold">
                        ~{Math.min(30, Math.floor(1000000 / exposureTime[0]))} FPS max
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Gain Control</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Analog Gain (1.0-16.0x)</Label>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{analogGain[0].toFixed(1)}x</Badge>
                        <Badge className={analogGain[0] <= 4.0 ? "bg-green-500" : "bg-yellow-500"}>
                          ISO {calculateISO(analogGain[0])}
                        </Badge>
                      </div>
                    </div>
                    <Slider
                      value={analogGain}
                      onValueChange={setAnalogGain}
                      min={getSuggestedGain().min}
                      max={getSuggestedGain().max}
                      step={0.1}
                      className="mb-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>1.0x (ISO 100)</span>
                      <span>16.0x (ISO 1600)</span>
                    </div>
                  </div>

                  {analogGain[0] > 8.0 && (
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-yellow-500">High Gain Warning</p>
                          <p className="text-muted-foreground">
                            Noise will be significant. Enable aggressive denoising.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Digital Gain</Label>
                      <Badge variant="secondary">{digitalGain[0].toFixed(1)}x</Badge>
                    </div>
                    <Slider
                      value={digitalGain}
                      onValueChange={setDigitalGain}
                      min={1.0}
                      max={8.0}
                      step={0.1}
                      disabled={analogGain[0] < 16.0}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Only use after maximizing analog gain (16.0x)
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">White Balance</h3>
                <div className="space-y-4">
                  <div>
                    <Label className="mb-2 block">Mode</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {['auto', 'daylight', 'manual'].map((mode) => (
                        <Button
                          key={mode}
                          variant={whiteBalanceMode === mode ? "default" : "outline"}
                          onClick={() => setWhiteBalanceMode(mode)}
                          size="sm"
                          className="capitalize"
                        >
                          {mode}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {whiteBalanceMode === 'manual' && (
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label>Red Gain</Label>
                          <Badge variant="outline">{awbRedGain[0].toFixed(2)}</Badge>
                        </div>
                        <Slider
                          value={awbRedGain}
                          onValueChange={setAwbRedGain}
                          min={0.5}
                          max={3.0}
                          step={0.01}
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label>Blue Gain</Label>
                          <Badge variant="outline">{awbBlueGain[0].toFixed(2)}</Badge>
                        </div>
                        <Slider
                          value={awbBlueGain}
                          onValueChange={setAwbBlueGain}
                          min={0.5}
                          max={3.0}
                          step={0.01}
                        />
                      </div>
                    </>
                  )}
                </div>
              </Card>

              {/* Focus Adjustment (from original) */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Focus Adjustment</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-base font-semibold">Focus Value</Label>
                    <span className="text-2xl font-bold text-primary">{focusValue[0]}%</span>
                  </div>
                  <Slider
                    value={focusValue}
                    onValueChange={setFocusValue}
                    min={0}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Infinity (0%)</span>
                    <span>Close focus (100%)</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Column - Info & Stats */}
            <div className="space-y-4">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Camera Specifications</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Model</span>
                    <span className="font-medium">Logitech C925e</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Resolution</span>
                    <span className="font-medium">1920×1080 @ 30fps</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Device Path</span>
                    <span className="font-medium">/dev/video1</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Format</span>
                    <span className="font-medium">YUYV 4:2:2</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Field of View</span>
                    <span className="font-medium">78° diagonal</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Focus</span>
                    <span className="font-medium">Auto/Manual</span>
                  </div>
                </div>
              </Card>

              {imageQuality && (
                <Card className="p-6 border-green-500/50 bg-green-500/5">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Last Capture Quality
                  </h3>
                  <div className="space-y-3">
                    <div className="p-3 bg-accent rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Overall Score</div>
                      <div className="text-2xl font-mono font-bold">
                        {imageQuality.score?.toFixed(2) || 'N/A'}/100
                      </div>
                    </div>

                    <div className="p-3 bg-accent rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Brightness</div>
                      <div className="text-2xl font-mono font-bold">
                        {imageQuality.brightness?.toFixed(2) || 'N/A'}
                      </div>
                    </div>

                    <div className="p-3 bg-accent rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Sharpness</div>
                      <div className="text-2xl font-mono font-bold">
                        {imageQuality.sharpness?.toFixed(2) || 'N/A'}
                      </div>
                    </div>

                    <div className="p-3 bg-accent rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Exposure</div>
                      <div className="text-2xl font-mono font-bold">
                        {imageQuality.exposure?.toFixed(2) || 'N/A'}%
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Current Configuration</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-accent rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Exposure</div>
                    <div className="text-2xl font-mono font-bold">
                      {(exposureTime[0] / 1000).toFixed(1)}ms
                    </div>
                  </div>

                  <div className="p-3 bg-accent rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Total Gain</div>
                    <div className="text-2xl font-mono font-bold">
                      {(analogGain[0] * digitalGain[0]).toFixed(1)}x
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Analog: {analogGain[0].toFixed(1)}x | Digital: {digitalGain[0].toFixed(1)}x
                    </div>
                  </div>

                  <div className="p-3 bg-accent rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">ISO Equivalent</div>
                    <div className="text-2xl font-mono font-bold">
                      {calculateISO(analogGain[0] * digitalGain[0])}
                    </div>
                  </div>

                  <div className="p-3 bg-accent rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">SNR Estimate</div>
                    <div className="text-2xl font-mono font-bold">
                      {analogGain[0] <= 4.0 ? 'Excellent' : analogGain[0] <= 8.0 ? 'Good' : 'Moderate'}
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-2">Optimization Tips</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Prioritize analog gain up to 16.0x</li>
                      <li>• Use longer exposures before increasing gain</li>
                      <li>• Enable manual WB for consistent color</li>
                      <li>• Capture RAW (DNG) for maximum flexibility</li>
                      <li>• IMX477 excels at low light with proper config</li>
                    </ul>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* OpenCV Enhancement Tab */}
        <TabsContent value="opencv" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Enhancement Settings */}
            <div className="space-y-4">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Noise Reduction</h3>
                <div className="space-y-4">
                  <div>
                    <Label className="mb-2 block">Algorithm</Label>
                    <Select value={denoisingMode} onValueChange={setDenoisingMode}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (Fastest)</SelectItem>
                        <SelectItem value="gaussian">Gaussian Blur (Fast)</SelectItem>
                        <SelectItem value="bilateral">Bilateral Filter (Medium)</SelectItem>
                        <SelectItem value="nlmeans">Non-Local Means (Slow, Best)</SelectItem>
                        <SelectItem value="temporal">Temporal (Video only)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {denoisingMode !== 'none' && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Strength (h parameter)</Label>
                        <Badge variant="outline">{denoisingH[0]}</Badge>
                      </div>
                      <Slider
                        value={denoisingH}
                        onValueChange={setDenoisingH}
                        min={5}
                        max={20}
                        step={1}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Higher values = more smoothing, may blur details
                      </p>
                    </div>
                  )}

                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div className="text-sm">
                      <p className="font-medium text-blue-500 mb-1">Performance Impact</p>
                      <p className="text-muted-foreground">
                        {denoisingMode === 'none' && 'No impact - 0ms'}
                        {denoisingMode === 'gaussian' && 'Minimal - ~2-5ms @ 1080p'}
                        {denoisingMode === 'bilateral' && 'Moderate - ~30-50ms @ 1080p'}
                        {denoisingMode === 'nlmeans' && 'High - ~2000-5000ms @ 1080p'}
                        {denoisingMode === 'temporal' && 'Low - ~10-20ms @ 1080p'}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">CLAHE (Adaptive Histogram Equalization)</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Enable CLAHE</Label>
                    <Switch checked={claheEnabled} onCheckedChange={setClaheEnabled} />
                  </div>

                  {claheEnabled && (
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label>Clip Limit</Label>
                          <Badge variant="outline">{claheClipLimit[0].toFixed(1)}</Badge>
                        </div>
                        <Slider
                          value={claheClipLimit}
                          onValueChange={setClaheClipLimit}
                          min={1.0}
                          max={5.0}
                          step={0.1}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Lower = less noise amplification, Higher = more contrast
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label>Tile Grid Size</Label>
                          <Badge variant="outline">{claheTileSize[0]}×{claheTileSize[0]}</Badge>
                        </div>
                        <Select 
                          value={claheTileSize[0].toString()} 
                          onValueChange={(val) => setClaheTileSize([parseInt(val)])}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="4">4×4 (Fine detail)</SelectItem>
                            <SelectItem value="8">8×8 (Recommended)</SelectItem>
                            <SelectItem value="16">16×16 (Broad areas)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="p-3 bg-accent rounded-lg">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Processing Time:</span>
                          <span className="font-mono font-semibold ml-2">~5-10ms @ 1080p</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Sharpening</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Enable Unsharp Mask</Label>
                    <Switch checked={sharpenEnabled} onCheckedChange={setSharpenEnabled} />
                  </div>

                  {sharpenEnabled && (
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label>Amount</Label>
                          <Badge variant="outline">{sharpenAmount[0].toFixed(1)}</Badge>
                        </div>
                        <Slider
                          value={sharpenAmount}
                          onValueChange={setSharpenAmount}
                          min={0.5}
                          max={2.0}
                          step={0.1}
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label>Sigma (Blur radius)</Label>
                          <Badge variant="outline">{sharpenSigma[0].toFixed(1)}</Badge>
                        </div>
                        <Slider
                          value={sharpenSigma}
                          onValueChange={setSharpenSigma}
                          min={1.0}
                          max={3.0}
                          step={0.1}
                        />
                      </div>

                      <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                          <div className="text-sm">
                            <p className="font-medium text-yellow-500">Important</p>
                            <p className="text-muted-foreground">
                              Always denoise BEFORE sharpening to avoid amplifying noise
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </Card>
            </div>

            {/* Pipeline Visualization */}
            <div className="space-y-4">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Processing Pipeline</h3>
                <div className="space-y-3">
                  {/* Pipeline Steps */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                      1
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Sensor Capture</div>
                      <div className="text-sm text-muted-foreground">
                        IMX477 @ {calculateISO(analogGain[0])} ISO, {(exposureTime[0]/1000).toFixed(1)}ms
                      </div>
                    </div>
                  </div>

                  <div className="ml-4 border-l-2 border-muted h-6"></div>

                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      denoisingMode !== 'none' ? 'bg-green-500' : 'bg-gray-400'
                    }`}>
                      2
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Noise Reduction</div>
                      <div className="text-sm text-muted-foreground">
                        {denoisingMode === 'none' ? 'Disabled' : `${denoisingMode} (h=${denoisingH[0]})`}
                      </div>
                    </div>
                  </div>

                  <div className="ml-4 border-l-2 border-muted h-6"></div>

                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      claheEnabled ? 'bg-green-500' : 'bg-gray-400'
                    }`}>
                      3
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">CLAHE Enhancement</div>
                      <div className="text-sm text-muted-foreground">
                        {claheEnabled ? `Clip: ${claheClipLimit[0]}, Grid: ${claheTileSize[0]}×${claheTileSize[0]}` : 'Disabled'}
                      </div>
                    </div>
                  </div>

                  <div className="ml-4 border-l-2 border-muted h-6"></div>

                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      sharpenEnabled ? 'bg-green-500' : 'bg-gray-400'
                    }`}>
                      4
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Sharpening</div>
                      <div className="text-sm text-muted-foreground">
                        {sharpenEnabled ? `Amount: ${sharpenAmount[0]}, Sigma: ${sharpenSigma[0]}` : 'Disabled'}
                      </div>
                    </div>
                  </div>

                  <div className="ml-4 border-l-2 border-muted h-6"></div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-sm">
                      5
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Output</div>
                      <div className="text-sm text-muted-foreground">
                        Enhanced frame ready
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Recommended Pipelines</h3>
                <div className="space-y-3">
                  <button 
                    className="w-full p-3 text-left rounded-lg border border-border hover:bg-accent transition-colors"
                    onClick={() => {
                      setDenoisingMode('gaussian')
                      setDenoisingH([5])
                      setClaheEnabled(true)
                      setClaheClipLimit([2.0])
                      setSharpenEnabled(true)
                      setSharpenAmount([1.0])
                    }}
                  >
                    <div className="font-medium mb-1">⚡ Real-time (30+ FPS)</div>
                    <div className="text-sm text-muted-foreground">
                      Gaussian + CLAHE + Light sharpen
                    </div>
                  </button>

                  <button 
                    className="w-full p-3 text-left rounded-lg border border-border hover:bg-accent transition-colors"
                    onClick={() => {
                      setDenoisingMode('bilateral')
                      setDenoisingH([10])
                      setClaheEnabled(true)
                      setClaheClipLimit([2.5])
                      setSharpenEnabled(true)
                      setSharpenAmount([1.5])
                    }}
                  >
                    <div className="font-medium mb-1">⚖️ Balanced (15-20 FPS)</div>
                    <div className="text-sm text-muted-foreground">
                      Bilateral + CLAHE + Medium sharpen
                    </div>
                  </button>

                  <button 
                    className="w-full p-3 text-left rounded-lg border border-border hover:bg-accent transition-colors"
                    onClick={() => {
                      setDenoisingMode('nlmeans')
                      setDenoisingH([15])
                      setClaheEnabled(true)
                      setClaheClipLimit([3.0])
                      setSharpenEnabled(true)
                      setSharpenAmount([0.5])
                    }}
                  >
                    <div className="font-medium mb-1">🎯 Maximum Quality (Offline)</div>
                    <div className="text-sm text-muted-foreground">
                      Non-local means + Aggressive CLAHE + Gentle sharpen
                    </div>
                  </button>
                </div>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-green-500/10 to-blue-500/10 border-green-500/20">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-2">Processing Best Practices</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Process from coarse to fine (denoise → enhance → sharpen)</li>
                      <li>• NEVER sharpen before denoising</li>
                      <li>• Use CLAHE in LAB color space for better results</li>
                      <li>• Higher gain = more aggressive denoising needed</li>
                      <li>• Test pipeline on real captures, not test patterns</li>
                    </ul>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Target Configuration</h3>
                <div className="space-y-4">
                  <div>
                    <Label className="mb-2 block">Resolution</Label>
                    <Select value={targetResolution} onValueChange={setTargetResolution}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="480p">480p (640×480) - Fastest</SelectItem>
                        <SelectItem value="720p">720p (1280×720) - Balanced</SelectItem>
                        <SelectItem value="1080p">1080p (1920×1080) - Recommended</SelectItem>
                        <SelectItem value="4k">4K (4056×3040) - Maximum Quality</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="mb-2 block">Target Frame Rate</Label>
                    <Select value={targetFps.toString()} onValueChange={(val) => setTargetFps(parseInt(val))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 FPS</SelectItem>
                        <SelectItem value="30">30 FPS (Recommended)</SelectItem>
                        <SelectItem value="60">60 FPS (Pi 5 only)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>NEON SIMD Optimizations</Label>
                    <Switch checked={neonEnabled} onCheckedChange={setNeonEnabled} />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Dual-Stream Processing</Label>
                    <Switch checked={dualStreamEnabled} onCheckedChange={setDualStreamEnabled} />
                  </div>

                  {dualStreamEnabled && (
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <div className="text-sm">
                        <p className="font-medium text-blue-500 mb-1">Dual-Stream Active</p>
                        <p className="text-muted-foreground">
                          Processing low-res stream (720p) while capturing high-res ({targetResolution})
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Raspberry Pi 5 Optimizations</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
                    <span className="text-sm font-medium">Cortex-A76 @ 2.4GHz</span>
                    <Badge variant="secondary">4 Cores</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
                    <span className="text-sm font-medium">VideoCore VII ISP</span>
                    <Badge className="bg-green-500">Hardware Accel</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
                    <span className="text-sm font-medium">NEON SIMD</span>
                    <Badge className={neonEnabled ? "bg-green-500" : "bg-gray-500"}>
                      {neonEnabled ? '+48% DNN' : 'Disabled'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
                    <span className="text-sm font-medium">Hardware Temporal Denoising</span>
                    <Badge className="bg-green-500">Auto-Enabled</Badge>
                  </div>

                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="text-sm">
                      <p className="font-medium text-green-500 mb-1">Performance Advantage</p>
                      <p className="text-muted-foreground">
                        Pi 5 is 2-3x faster than Pi 4 for identical workloads
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            <div className="space-y-4">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Performance Estimate</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-lg border-2 border-green-500/30">
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground mb-1">Expected Frame Rate</div>
                      <div className="text-4xl font-mono font-bold text-green-500">
                        {(() => {
                          let baseFps = 30
                          if (targetResolution === '4k') baseFps = 10
                          if (targetResolution === '720p') baseFps = 50
                          if (targetResolution === '480p') baseFps = 60
                          
                          if (denoisingMode === 'nlmeans') baseFps *= 0.1
                          else if (denoisingMode === 'bilateral') baseFps *= 0.7
                          else if (denoisingMode === 'gaussian') baseFps *= 0.95
                          
                          if (neonEnabled) baseFps *= 1.3
                          if (dualStreamEnabled && targetResolution !== '4k') baseFps *= 1.5
                          
                          return Math.round(baseFps)
                        })()}
                      </div>
                      <div className="text-lg font-medium mt-1">FPS</div>
                    </div>
                  </div>

                  <div className={`p-3 rounded-lg border-2 ${
                    perfStatus.status === 'excellent' ? 'bg-green-500/10 border-green-500/30' :
                    perfStatus.status === 'good' ? 'bg-blue-500/10 border-blue-500/30' :
                    perfStatus.status === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' :
                    'bg-red-500/10 border-red-500/30'
                  }`}>
                    <div className="flex items-center gap-2">
                      {perfStatus.status === 'excellent' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                      {perfStatus.status === 'good' && <CheckCircle2 className="h-5 w-5 text-blue-500" />}
                      {perfStatus.status === 'warning' && <AlertCircle className="h-5 w-5 text-yellow-500" />}
                      {perfStatus.status === 'critical' && <AlertCircle className="h-5 w-5 text-red-500" />}
                      <div>
                        <div className={`font-medium ${perfStatus.color}`}>
                          {perfStatus.status.charAt(0).toUpperCase() + perfStatus.status.slice(1)} Performance
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {perfStatus.message}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Processing Budget</span>
                      <span className="font-mono">{(1000 / targetFps).toFixed(1)}ms/frame</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Estimated Time</span>
                      <span className="font-mono">{processingTime}ms/frame</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Headroom</span>
                      <span className={`font-mono ${
                        (1000/targetFps - processingTime) > 10 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {Math.max(0, (1000/targetFps - processingTime)).toFixed(1)}ms
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Benchmark Timings (Raspberry Pi 5)</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GaussianBlur (720p)</span>
                    <span className="font-mono">1-3ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CLAHE (720p)</span>
                    <span className="font-mono">5-10ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bilateral Filter (720p)</span>
                    <span className="font-mono">30-50ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Unsharp Mask (720p)</span>
                    <span className="font-mono">2-4ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">NL Means (720p)</span>
                    <span className="font-mono">2000-5000ms</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
                <div className="flex items-start gap-3">
                  <Activity className="h-5 w-5 text-purple-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-2">Optimization Recommendations</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Compile OpenCV with ENABLE_NEON=ON</li>
                      <li>• Use dual-stream: process lores, save main</li>
                      <li>• Precompute lens correction maps</li>
                      <li>• Enable CMA 512MB for 4K capture</li>
                      <li>• Add active cooling for sustained processing</li>
                      <li>• Fix frame rate to prevent thermal throttling</li>
                    </ul>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Live Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          <div className="grid grid-cols-[1fr_350px] gap-4">
            {/* Live Canvas */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Live Camera Preview</h3>
                <div className="flex gap-2">
                  <Button
                    variant={isPreviewActive ? "destructive" : "default"}
                    onClick={() => setIsPreviewActive(!isPreviewActive)}
                  >
                    {isPreviewActive ? (
                      <>
                        <Pause className="mr-2 h-4 w-4" />
                        Stop Preview
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Start Preview
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <canvas
                  ref={canvasRef}
                  width={960}
                  height={540}
                  className="w-full rounded-lg border-2 border-border bg-black"
                />

                <div className="grid grid-cols-4 gap-2">
                  <Button
                    variant={previewMode === 'original' ? 'default' : 'outline'}
                    onClick={() => setPreviewMode('original')}
                    size="sm"
                  >
                    Original
                  </Button>
                  <Button
                    variant={previewMode === 'denoised' ? 'default' : 'outline'}
                    onClick={() => setPreviewMode('denoised')}
                    size="sm"
                  >
                    Denoised
                  </Button>
                  <Button
                    variant={previewMode === 'enhanced' ? 'default' : 'outline'}
                    onClick={() => setPreviewMode('enhanced')}
                    size="sm"
                  >
                    Enhanced
                  </Button>
                  <Button
                    variant={previewMode === 'comparison' ? 'default' : 'outline'}
                    onClick={() => setPreviewMode('comparison')}
                    size="sm"
                  >
                    Split View
                  </Button>
                </div>
              </div>
            </Card>

            {/* Preview Stats */}
            <div className="space-y-4">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-accent rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Frame Rate</div>
                    <div className="text-3xl font-mono font-bold text-green-500">
                      {currentFps}
                    </div>
                    <div className="text-sm text-muted-foreground">FPS</div>
                  </div>

                  <div className="p-3 bg-accent rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Processing Time</div>
                    <div className="text-3xl font-mono font-bold text-blue-500">
                      {processingTime}
                    </div>
                    <div className="text-sm text-muted-foreground">milliseconds</div>
                  </div>

                  <div className="p-3 bg-accent rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">CPU Usage</div>
                    <div className="text-3xl font-mono font-bold text-purple-500">
                      {Math.round(45 + Math.random() * 20)}
                    </div>
                    <div className="text-sm text-muted-foreground">percent</div>
                  </div>

                  <div className="p-3 bg-accent rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Temperature</div>
                    <div className="text-3xl font-mono font-bold text-orange-500">
                      {Math.round(55 + Math.random() * 10)}
                    </div>
                    <div className="text-sm text-muted-foreground">°C</div>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Image Quality Metrics</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Brightness</span>
                      <span className="font-mono">128/255</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-black via-gray-500 to-white" style={{ width: "50%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Contrast</span>
                      <span className="font-mono">Good</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-green-500" style={{ width: "75%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Sharpness</span>
                      <span className="font-mono">Excellent</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: "85%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Noise Level</span>
                      <span className="font-mono">{analogGain[0] > 8 ? 'High' : analogGain[0] > 4 ? 'Medium' : 'Low'}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${
                        analogGain[0] > 8 ? 'bg-red-500' : analogGain[0] > 4 ? 'bg-yellow-500' : 'bg-green-500'
                      }`} style={{ width: `${analogGain[0] * 6}%` }} />
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={captureRealImage}
                    disabled={cameraStatus !== 'connected' || isCapturing}
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    {isCapturing ? 'Capturing...' : 'Capture from C925e'}
                  </Button>
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={autoOptimizeCamera}
                    disabled={cameraStatus !== 'connected' || isOptimizing}
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    {isOptimizing ? 'Optimizing...' : 'Auto-Optimize Camera'}
                  </Button>
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => checkCameraConnection()}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Refresh Camera Status
                  </Button>
                  <Button 
                    className="w-full" 
                    variant="outline" 
                    onClick={autoOptimize}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset Settings
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

