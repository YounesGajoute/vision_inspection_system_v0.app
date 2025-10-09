"use client"

/**
 * Production Run/Inspection Program Page
 * Real-time vision inspection with live camera feed, GPIO control, and statistics
 */

import { useState, useRef, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Play,
  Pause,
  Square,
  Camera,
  CheckCircle2,
  XCircle,
  Activity,
  Clock,
  TrendingUp,
  Zap,
  ArrowLeft,
  Settings,
  Download,
  AlertCircle,
  Target,
  RefreshCw,
} from "lucide-react"
import { storage, Program } from "@/lib/storage"
import { ws } from "@/lib/websocket"
import { processInspection, extractMasterFeatures } from "@/lib/inspection-engine"
import type {
  ToolConfig,
  ToolResult,
  InspectionResult as TypedInspectionResult,
  OutputAssignment,
  OutputCondition,
} from "@/types"

// ==================== INTERFACES ====================

interface InspectionResult {
  id: string
  timestamp: Date
  programId: string | number
  status: "OK" | "NG"
  overallConfidence: number
  processingTime: number
  toolResults: ToolResult[]
  image: string
  positionOffset?: { x: number; y: number }
}

interface Statistics {
  totalInspected: number
  passed: number
  failed: number
  passRate: number
  avgProcessingTime: number
  currentCycleTime: number
  avgConfidence: number
  uptime: number
}

interface GPIOOutput {
  pin: string
  name: string
  state: boolean
  color: string
  condition: OutputCondition
}

// ==================== MAIN COMPONENT ====================

export default function RunInspectionPage() {
  // ========== STATE MANAGEMENT ==========
  
  // Program Management
  const [programs, setPrograms] = useState<Program[]>([])
  const [selectedProgramId, setSelectedProgramId] = useState<string>("")
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null)
  
  // Inspection State
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentStatus, setCurrentStatus] = useState<"IDLE" | "RUNNING" | "OK" | "NG">("IDLE")
  
  // Image & Results
  const [currentFrame, setCurrentFrame] = useState<string>("")
  const [currentResult, setCurrentResult] = useState<InspectionResult | null>(null)
  const [recentResults, setRecentResults] = useState<InspectionResult[]>([])
  
  // Statistics
  const [statistics, setStatistics] = useState<Statistics>({
    totalInspected: 0,
    passed: 0,
    failed: 0,
    passRate: 0,
    avgProcessingTime: 0,
    currentCycleTime: 0,
    avgConfidence: 0,
    uptime: 0,
  })
  
  // GPIO Outputs
  const [gpioOutputs, setGpioOutputs] = useState<GPIOOutput[]>([])
  
  // Master Features
  const [masterFeatures, setMasterFeatures] = useState<Record<string, any>>({})
  
  // Loading State
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const inspectionTimerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)
  const wsConnectedRef = useRef<boolean>(false)
  
  // ========== LOAD PROGRAMS ON MOUNT ==========
  
  useEffect(() => {
    loadPrograms()
  }, [])
  
  const loadPrograms = async () => {
    setIsLoadingPrograms(true)
    setLoadError(null)
    
    try {
      let loadedPrograms: Program[] = []
      
      // Try to load from backend API first
      try {
        const response = await fetch('/api/programs', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        if (response.ok) {
          const data = await response.json()
          loadedPrograms = data.programs || data || []
          console.log(`Loaded ${loadedPrograms.length} programs from API`)
        } else {
          console.warn('API response not OK, falling back to localStorage')
          throw new Error('API failed')
        }
      } catch (apiError) {
        console.warn('Failed to load from API, trying localStorage:', apiError)
        
        // Fallback to localStorage
        loadedPrograms = storage.getAllPrograms()
        console.log(`Loaded ${loadedPrograms.length} programs from localStorage`)
      }
      
      // Filter out invalid programs
      const validPrograms = loadedPrograms.filter(p => 
        p && p.id && p.name && p.config
      )
      
      if (validPrograms.length < loadedPrograms.length) {
        console.warn(`Filtered out ${loadedPrograms.length - validPrograms.length} invalid programs`)
      }
      
      setPrograms(validPrograms)
      
      if (validPrograms.length === 0) {
        setLoadError("No inspection programs found. Please create a program first.")
        setIsLoadingPrograms(false)
        return
      }
      
      // Auto-select first program or from URL
      const urlParams = new URLSearchParams(window.location.search)
      const programId = urlParams.get("id")
      
      if (programId && validPrograms.find(p => p.id === programId)) {
        setSelectedProgramId(programId)
        console.log(`Auto-selected program from URL: ${programId}`)
      } else if (validPrograms.length > 0) {
        setSelectedProgramId(validPrograms[0].id)
        console.log(`Auto-selected first program: ${validPrograms[0].id}`)
      }
      
      setIsLoadingPrograms(false)
      
    } catch (error) {
      console.error("Failed to load programs:", error)
      setLoadError("Failed to load programs. Please try again.")
      setIsLoadingPrograms(false)
    }
  }
  
  // ========== LOAD SELECTED PROGRAM ==========
  
  useEffect(() => {
    if (selectedProgramId) {
      const program = programs.find(p => p.id === selectedProgramId)
      if (program) {
        setSelectedProgram(program)
        initializeGPIOOutputs(program.config.outputs)
        
        // Extract master features if master image exists
        if (program.config.masterImage && program.config.tools.length > 0) {
          extractMasterFeatures(program.config.masterImage, program.config.tools as ToolConfig[])
            .then(features => {
              setMasterFeatures(features)
              console.log("Master features extracted:", features)
            })
            .catch(err => console.error("Failed to extract master features:", err))
        }
      }
    }
  }, [selectedProgramId, programs])
  
  const initializeGPIOOutputs = (outputs: OutputAssignment) => {
    const gpios: GPIOOutput[] = [
      { pin: "OUT1", name: "BUSY", state: false, color: "#eab308", condition: outputs.OUT1 },
      { pin: "OUT2", name: "OK Signal", state: false, color: "#10b981", condition: outputs.OUT2 },
      { pin: "OUT3", name: "NG Signal", state: false, color: "#ef4444", condition: outputs.OUT3 },
      { pin: "OUT4", name: "Custom 1", state: false, color: "#3b82f6", condition: outputs.OUT4 },
      { pin: "OUT5", name: "Custom 2", state: false, color: "#8b5cf6", condition: outputs.OUT5 },
      { pin: "OUT6", name: "Custom 3", state: false, color: "#ec4899", condition: outputs.OUT6 },
      { pin: "OUT7", name: "Custom 4", state: false, color: "#14b8a6", condition: outputs.OUT7 },
      { pin: "OUT8", name: "Custom 5", state: false, color: "#f97316", condition: outputs.OUT8 },
    ]
    setGpioOutputs(gpios)
  }
  
  // ========== WEBSOCKET CONNECTION ==========
  
  useEffect(() => {
    if (isRunning && !isPaused && selectedProgram) {
      connectWebSocket()
    } else {
      disconnectWebSocket()
    }
    
    return () => disconnectWebSocket()
  }, [isRunning, isPaused, selectedProgram])
  
  const connectWebSocket = () => {
    if (wsConnectedRef.current) return
    
    try {
      ws.connect()
      wsConnectedRef.current = true
      
      // Subscribe to live feed
      ws.on("live_frame", handleLiveFrame)
      ws.on("inspection_result", handleInspectionResult)
      ws.on("error", handleWSError)
      
      // Start live feed at 10 FPS
      ws.subscribeLiveFeed(10)
      
      console.log("WebSocket connected for live feed")
    } catch (error) {
      console.error("WebSocket connection failed:", error)
    }
  }
  
  const disconnectWebSocket = () => {
    if (!wsConnectedRef.current) return
    
    try {
      ws.off("live_frame", handleLiveFrame)
      ws.off("inspection_result", handleInspectionResult)
      ws.off("error", handleWSError)
      ws.unsubscribeLiveFeed()
      ws.disconnect()
      wsConnectedRef.current = false
      console.log("WebSocket disconnected")
    } catch (error) {
      console.error("Error disconnecting WebSocket:", error)
    }
  }
  
  const handleLiveFrame = useCallback((data: any) => {
    if (data.image) {
      setCurrentFrame(data.image)
      // Draw frame on canvas if not currently showing result
      if (currentStatus === "RUNNING" || currentStatus === "IDLE") {
        drawFrame(data.image)
      }
    }
  }, [currentStatus])
  
  const handleInspectionResult = useCallback((data: any) => {
    // Handle inspection result from backend (if using backend processing)
    console.log("Inspection result from backend:", data)
  }, [])
  
  const handleWSError = useCallback((data: any) => {
    console.error("WebSocket error:", data)
  }, [])
  
  // ========== INSPECTION TRIGGER SYSTEM ==========
  
  useEffect(() => {
    if (!isRunning || isPaused || !selectedProgram) {
      if (inspectionTimerRef.current) {
        clearInterval(inspectionTimerRef.current)
        inspectionTimerRef.current = null
      }
      return
    }
    
    if (selectedProgram.config.triggerType === "internal") {
      const interval = selectedProgram.config.triggerInterval || 2000
      
      inspectionTimerRef.current = setInterval(() => {
        performInspection()
      }, interval)
      
      console.log(`Internal trigger started: ${interval}ms interval`)
    } else {
      // External trigger - handled via WebSocket
      console.log("External trigger mode - waiting for GPIO signal")
    }
    
    return () => {
      if (inspectionTimerRef.current) {
        clearInterval(inspectionTimerRef.current)
        inspectionTimerRef.current = null
      }
    }
  }, [isRunning, isPaused, selectedProgram])
  
  // ========== INSPECTION PROCESSING ==========
  
  const performInspection = async () => {
    if (!selectedProgram || !currentFrame) {
      console.warn("Cannot perform inspection: no program or frame")
      return
    }
    
    try {
      setCurrentStatus("RUNNING")
      
      // Set BUSY signal
      updateGPIOOutput("OUT1", true)
      
      const startTime = performance.now()
      
      // Process inspection using inspection engine
      const result = await processInspection(
        currentFrame,
        selectedProgram.config.tools as ToolConfig[],
        { masterFeatures, debugMode: false }
      )
      
      result.programId = selectedProgram.id
      result.processingTime = performance.now() - startTime
      
      // Update current result
      setCurrentResult(result)
      
      // Update recent results
      setRecentResults(prev => [result, ...prev].slice(0, 20))
      
      // Update statistics
      updateStatistics(result)
      
      // Update GPIO outputs
      updateGPIOFromResult(result)
      
      // Draw result on canvas
      drawInspectionResult(result)
      
      // Set status
      setCurrentStatus(result.status)
      
      // Save to storage (optional)
      saveInspectionResult(result)
      
      // Reset status after 500ms
      setTimeout(() => {
        if (isRunning && !isPaused) {
          setCurrentStatus("RUNNING")
        }
        // Clear BUSY signal
        updateGPIOOutput("OUT1", false)
      }, 500)
      
    } catch (error) {
      console.error("Inspection failed:", error)
      setCurrentStatus("NG")
      updateGPIOOutput("OUT3", true) // Error signal
      setTimeout(() => {
        updateGPIOOutput("OUT1", false)
        updateGPIOOutput("OUT3", false)
      }, 500)
    }
  }
  
  const updateStatistics = (result: InspectionResult) => {
    setStatistics(prev => {
      const total = prev.totalInspected + 1
      const passed = result.status === "OK" ? prev.passed + 1 : prev.passed
      const failed = result.status === "NG" ? prev.failed + 1 : prev.failed
      const passRate = (passed / total) * 100
      
      const totalTime = prev.avgProcessingTime * prev.totalInspected + result.processingTime
      const avgProcessingTime = totalTime / total
      
      const totalConfidence = prev.avgConfidence * prev.totalInspected + result.overallConfidence
      const avgConfidence = totalConfidence / total
      
      const uptime = Date.now() - startTimeRef.current
      
      return {
        totalInspected: total,
        passed,
        failed,
        passRate,
        avgProcessingTime,
        currentCycleTime: result.processingTime,
        avgConfidence,
        uptime,
      }
    })
  }
  
  const saveInspectionResult = async (result: InspectionResult) => {
    try {
      // Update program stats in storage
      if (selectedProgram) {
        storage.updateStats(selectedProgram.id, {
          totalInspections: statistics.totalInspected + 1,
          okCount: result.status === "OK" ? statistics.passed + 1 : statistics.passed,
          ngCount: result.status === "NG" ? statistics.failed + 1 : statistics.failed,
          lastRun: new Date().toISOString(),
        })
      }
      
      // Send to backend API (if available)
      // await fetch("/api/inspections", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(result),
      // })
    } catch (error) {
      console.error("Failed to save inspection result:", error)
    }
  }
  
  // ========== GPIO OUTPUT CONTROL ==========
  
  const updateGPIOFromResult = (result: InspectionResult) => {
    // Update outputs based on result
    gpioOutputs.forEach(gpio => {
      let shouldActivate = false
      
      switch (gpio.condition) {
        case "OK":
          shouldActivate = result.status === "OK"
          break
        case "NG":
          shouldActivate = result.status === "NG"
          break
        case "Always ON":
          shouldActivate = true
          break
        case "Always OFF":
          shouldActivate = false
          break
        case "Not Used":
          shouldActivate = false
          break
      }
      
      if (gpio.pin === "OUT2" && result.status === "OK") {
        // Pulse OK signal
        updateGPIOOutput(gpio.pin, true)
        setTimeout(() => updateGPIOOutput(gpio.pin, false), 300)
      } else if (gpio.pin === "OUT3" && result.status === "NG") {
        // Pulse NG signal
        updateGPIOOutput(gpio.pin, true)
        setTimeout(() => updateGPIOOutput(gpio.pin, false), 300)
      } else if (gpio.pin !== "OUT1" && gpio.pin !== "OUT2" && gpio.pin !== "OUT3") {
        updateGPIOOutput(gpio.pin, shouldActivate)
      }
    })
  }
  
  const updateGPIOOutput = (pin: string, state: boolean) => {
    setGpioOutputs(prev =>
      prev.map(gpio => (gpio.pin === pin ? { ...gpio, state } : gpio))
    )
    
    // Send to backend/hardware
    fetch("/api/gpio/write", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin, value: state }),
    }).catch(err => console.error("GPIO write failed:", err))
  }
  
  // ========== CANVAS DRAWING ==========
  
  const drawFrame = (frameBase64: string) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    const img = new Image()
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    }
    img.src = frameBase64.startsWith("data:") ? frameBase64 : `data:image/jpeg;base64,${frameBase64}`
  }
  
  const drawInspectionResult = (result: InspectionResult) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    const img = new Image()
    img.onload = () => {
      // Clear and draw image
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      
      // Draw ROI overlays
      if (selectedProgram) {
        selectedProgram.config.tools.forEach((tool: any, idx: number) => {
          const toolResult = result.toolResults[idx]
          if (!toolResult) return
          
          const roi = tool.roi
          const color = toolResult.status === "OK" ? "#10b981" : "#ef4444"
          
          // Apply position offset if available
          const offsetX = result.positionOffset?.x || 0
          const offsetY = result.positionOffset?.y || 0
          
          // Draw ROI rectangle
          ctx.strokeStyle = color
          ctx.lineWidth = 3
          ctx.strokeRect(roi.x + offsetX, roi.y + offsetY, roi.width, roi.height)
          
          // Draw label background
          const labelText = `${tool.name}: ${toolResult.matching_rate.toFixed(1)}%`
          ctx.font = "bold 14px sans-serif"
          const textWidth = ctx.measureText(labelText).width
          
          ctx.fillStyle = color
          ctx.fillRect(roi.x + offsetX, roi.y + offsetY - 25, textWidth + 16, 25)
          
          // Draw label text
          ctx.fillStyle = "#ffffff"
          ctx.fillText(labelText, roi.x + offsetX + 8, roi.y + offsetY - 7)
        })
      }
      
      // Draw overall status
      const statusColor = result.status === "OK" ? "#10b981" : "#ef4444"
      ctx.fillStyle = statusColor + "30"
      ctx.fillRect(10, 10, 200, 60)
      
      ctx.strokeStyle = statusColor
      ctx.lineWidth = 3
      ctx.strokeRect(10, 10, 200, 60)
      
      ctx.fillStyle = statusColor
      ctx.font = "bold 32px sans-serif"
      ctx.fillText(result.status, 20, 50)
    }
    img.src = result.image.startsWith("data:") ? result.image : `data:image/jpeg;base64,${result.image}`
  }
  
  // ========== CONTROL FUNCTIONS ==========
  
  const handleStart = () => {
    if (!selectedProgramId) {
      alert("Please select an inspection program")
      return
    }
    
    setIsRunning(true)
    setIsPaused(false)
    setCurrentStatus("RUNNING")
    startTimeRef.current = Date.now()
    
    // Reset statistics
    setStatistics({
      totalInspected: 0,
      passed: 0,
      failed: 0,
      passRate: 0,
      avgProcessingTime: 0,
      currentCycleTime: 0,
      avgConfidence: 0,
      uptime: 0,
    })
    
    setRecentResults([])
  }
  
  const handleStop = () => {
    setIsRunning(false)
    setIsPaused(false)
    setCurrentStatus("IDLE")
    
    // Reset all GPIO outputs
    gpioOutputs.forEach(gpio => {
      updateGPIOOutput(gpio.pin, false)
    })
  }
  
  const handlePause = () => {
    setIsPaused(!isPaused)
  }
  
  const handleManualTrigger = () => {
    if (!isRunning || isPaused) {
      return
    }
    
    // Manually trigger an inspection
    performInspection()
  }
  
  const handleProgramChange = (programId: string) => {
    if (isRunning) {
      alert("Stop inspection before changing programs")
      return
    }
    setSelectedProgramId(programId)
  }
  
  const exportResults = () => {
    const data = {
      program: selectedProgram?.name,
      statistics,
      recentResults: recentResults.map(r => ({
        id: r.id,
        timestamp: r.timestamp.toISOString(),
        status: r.status,
        processingTime: r.processingTime,
        confidence: r.overallConfidence,
      })),
      exportedAt: new Date().toISOString(),
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `inspection-results-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  // ========== RENDER ==========
  
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b px-6 py-4 bg-slate-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => (window.location.href = "/")}
              className="text-slate-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                Run Inspection Program
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadPrograms}
                  disabled={isLoadingPrograms || isRunning}
                  className="text-slate-400 hover:text-white"
                  title="Reload programs"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoadingPrograms ? 'animate-spin' : ''}`} />
                </Button>
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                {isLoadingPrograms 
                  ? "Loading programs..." 
                  : selectedProgram 
                    ? selectedProgram.name 
                    : programs.length === 0 
                      ? "No programs available - Please create one first"
                      : "Select a program to begin"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Status Badge */}
            {currentStatus === "IDLE" && <Badge variant="outline">IDLE</Badge>}
            {currentStatus === "RUNNING" && (
              <Badge className="bg-blue-600">
                <Activity className="h-3 w-3 mr-1 animate-pulse" />
                RUNNING
              </Badge>
            )}
            {currentStatus === "OK" && (
              <Badge className="bg-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                PASS
              </Badge>
            )}
            {currentStatus === "NG" && (
              <Badge className="bg-red-600">
                <XCircle className="h-3 w-3 mr-1" />
                FAIL
              </Badge>
            )}
            
            {/* Statistics Summary */}
            <div className="text-right">
              <div className="text-sm text-slate-400">Total Inspections</div>
              <div className="text-2xl font-bold text-white">{statistics.totalInspected}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Live Feed (60%) */}
        <div className="flex-1 flex flex-col p-6">
          {/* Control Bar */}
          <Card className="mb-4 bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              {/* Loading State */}
              {isLoadingPrograms && (
                <div className="flex items-center gap-3 text-slate-400">
                  <Activity className="h-5 w-5 animate-spin" />
                  <span>Loading programs...</span>
                </div>
              )}
              
              {/* Error State */}
              {!isLoadingPrograms && loadError && (
                <div className="flex items-center gap-3 text-red-400">
                  <AlertCircle className="h-5 w-5" />
                  <span>{loadError}</span>
                  <Button 
                    onClick={loadPrograms} 
                    variant="outline" 
                    size="sm"
                    className="ml-auto"
                  >
                    Retry
                  </Button>
                </div>
              )}
              
              {/* Normal State */}
              {!isLoadingPrograms && !loadError && (
                <div className="flex items-center gap-4">
                  {/* Program Selector */}
                  <Select 
                    value={selectedProgramId} 
                    onValueChange={handleProgramChange}
                    disabled={programs.length === 0}
                  >
                    <SelectTrigger className="flex-1 bg-slate-950 border-slate-700 text-white">
                      <SelectValue placeholder={
                        programs.length === 0 
                          ? "No programs available" 
                          : "Select Program"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {programs.map(program => (
                        <SelectItem key={program.id} value={program.id}>
                          {program.name} ({program.config.tools.length} tools)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Control Buttons */}
                {!isRunning ? (
                  <Button onClick={handleStart} size="lg" className="bg-green-600 hover:bg-green-700">
                    <Play className="h-5 w-5 mr-2" />
                    Start
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={handlePause}
                      size="lg"
                      variant="outline"
                      className="border-yellow-600 text-yellow-600 hover:bg-yellow-600 hover:text-white"
                    >
                      <Pause className="h-5 w-5 mr-2" />
                      {isPaused ? "Resume" : "Pause"}
                    </Button>
                    <Button onClick={handleStop} size="lg" variant="destructive">
                      <Square className="h-5 w-5 mr-2" />
                      Stop
                    </Button>
                  </>
                )}
                
                {/* Manual Trigger Button */}
                <Button 
                  onClick={handleManualTrigger}
                  disabled={!isRunning || isPaused}
                  size="lg"
                  className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Target className="h-5 w-5 mr-2" />
                  Trigger
                </Button>
                
                <Button onClick={exportResults} variant="outline" size="lg">
                  <Download className="h-5 w-5 mr-2" />
                  Export
                </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Canvas */}
          <Card className="flex-1 bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Camera className="h-5 w-5 text-blue-400" />
                Live Inspection View
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-80px)]">
              <div className="h-full bg-slate-950 rounded-lg flex items-center justify-center relative">
                <canvas
                  ref={canvasRef}
                  width={640}
                  height={480}
                  className="max-w-full max-h-full border border-slate-800 rounded"
                />
                {!currentFrame && !isRunning && (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                    <div className="text-center">
                      <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p>Camera feed will appear here when inspection starts</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Stats & GPIO (40%) */}
        <div className="w-[40%] border-l border-slate-800 overflow-y-auto p-6 space-y-4 bg-slate-950">
          {/* Statistics */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <TrendingUp className="h-5 w-5 text-blue-400" />
                Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-950 rounded border border-slate-800">
                  <div className="text-xs text-slate-400">Total</div>
                  <div className="text-2xl font-bold text-white">{statistics.totalInspected}</div>
                </div>
                <div className="p-3 bg-slate-950 rounded border border-slate-800">
                  <div className="text-xs text-slate-400">Pass Rate</div>
                  <div className="text-2xl font-bold text-green-400">
                    {statistics.passRate.toFixed(1)}%
                  </div>
                </div>
                <div className="p-3 bg-green-950 rounded border border-green-800">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                    <span className="text-xs text-green-400">Passed</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{statistics.passed}</div>
                </div>
                <div className="p-3 bg-red-950 rounded border border-red-800">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="h-4 w-4 text-red-400" />
                    <span className="text-xs text-red-400">Failed</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{statistics.failed}</div>
                </div>
              </div>
              
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Avg Processing Time</span>
                  <span className="text-blue-400 font-mono">
                    {statistics.avgProcessingTime.toFixed(2)}ms
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Current Cycle Time</span>
                  <span className="text-blue-400 font-mono">
                    {statistics.currentCycleTime.toFixed(2)}ms
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Avg Confidence</span>
                  <span className="text-blue-400 font-mono">
                    {statistics.avgConfidence.toFixed(1)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tool Results */}
          {currentResult && selectedProgram && (
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Settings className="h-5 w-5 text-purple-400" />
                  Tool Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {currentResult.toolResults.map((toolResult, idx) => {
                  const tool = selectedProgram.config.tools[idx]
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded border ${
                        toolResult.status === "OK"
                          ? "bg-green-950 border-green-800"
                          : "bg-red-950 border-red-800"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: tool.color }}
                          />
                          <span className="text-white font-semibold text-sm">
                            {toolResult.name}
                          </span>
                        </div>
                        <Badge
                          variant={toolResult.status === "OK" ? "default" : "destructive"}
                          className={toolResult.status === "OK" ? "bg-green-600" : ""}
                        >
                          {toolResult.status}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Match Rate</span>
                          <span className="text-white font-mono">
                            {toolResult.matching_rate.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Threshold</span>
                          <span className="text-slate-300 font-mono">
                            {toolResult.threshold}%
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full bg-slate-800 rounded-full h-2 mt-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              toolResult.status === "OK" ? "bg-green-500" : "bg-red-500"
                            }`}
                            style={{ width: `${Math.min(100, toolResult.matching_rate)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {/* GPIO Outputs */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Zap className="h-5 w-5 text-yellow-400" />
                GPIO Outputs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {gpioOutputs.map(gpio => (
                  <div
                    key={gpio.pin}
                    className={`p-2 border rounded transition-all ${
                      gpio.state
                        ? "border-2 shadow-lg"
                        : "border-slate-700 opacity-60"
                    }`}
                    style={{
                      borderColor: gpio.state ? gpio.color : undefined,
                      backgroundColor: gpio.state ? `${gpio.color}20` : "transparent",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full transition-all"
                        style={{
                          backgroundColor: gpio.state ? gpio.color : "#6b7280",
                          boxShadow: gpio.state ? `0 0 8px ${gpio.color}` : "none",
                        }}
                      />
                      <div className="flex-1">
                        <div className="text-xs font-bold text-white">{gpio.pin}</div>
                        <div className="text-xs text-slate-400">{gpio.name}</div>
                      </div>
                      <div className="text-xs text-white font-mono">
                        {gpio.state ? "ON" : "OFF"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Results */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Clock className="h-5 w-5 text-orange-400" />
                Recent Inspections
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {recentResults.length === 0 ? (
                  <div className="text-center text-slate-500 py-4 text-sm">
                    No inspections yet
                  </div>
                ) : (
                  recentResults.map(result => (
                    <div
                      key={result.id}
                      className={`p-3 border rounded ${
                        result.status === "OK"
                          ? "border-green-800 bg-green-950"
                          : "border-red-800 bg-red-950"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {result.status === "OK" ? (
                            <CheckCircle2 className="h-4 w-4 text-green-400" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-400" />
                          )}
                          <span className="font-bold text-white">{result.status}</span>
                        </div>
                        <span className="text-xs text-slate-400 font-mono">
                          {result.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300">
                        Confidence: {(result.overallConfidence).toFixed(1)}% | Time:{" "}
                        {result.processingTime.toFixed(1)}ms
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
