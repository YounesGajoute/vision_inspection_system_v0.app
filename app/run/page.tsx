"use client"
import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Play,
  Pause,
  StampIcon as StopIcon,
  Settings,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Activity,
  Clock,
  TrendingUp,
  BarChart3,
  Download,
  ImageIcon,
} from "lucide-react"
import {
  Line,
  LineChart,
  Pie,
  PieChart,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { storage, Program } from "@/lib/storage"

interface Tool {
  id: string
  type: string
  name: string
  color: string
  roi: { x: number; y: number; width: number; height: number }
  threshold: number
  matchRate?: number
  status?: "OK" | "NG"
}

interface InspectionImage {
  id: string
  timestamp: Date
  status: "OK" | "NG"
  processingTime: number
  imageData: string
}

export default function ProductionMode() {
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [imageFilter, setImageFilter] = useState<"ALL" | "OK" | "NG">("ALL")
  const [selectedImage, setSelectedImage] = useState<InspectionImage | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Program data - loaded from storage or fallback
  const [programInfo, setProgramInfo] = useState({
    id: "PRG-001",
    name: "PCB Assembly Check",
  })
  const [currentProgram, setCurrentProgram] = useState<Program | null>(null)

  // Tools loaded from program configuration
  const [tools, setTools] = useState<Tool[]>([])

  // Statistics
  const [stats, setStats] = useState({
    totalInspections: 0,
    okCount: 0,
    ngCount: 0,
    currentCycleTime: 0,
    avgCycleTime: 0,
    minCycleTime: 0,
    maxCycleTime: 0,
  })

  const [processingTimeHistory, setProcessingTimeHistory] = useState<Array<{ time: string; value: number }>>([])
  const [inspectionRateHistory, setInspectionRateHistory] = useState<Array<{ time: string; ok: number; ng: number }>>(
    [],
  )
  const [imageHistory, setImageHistory] = useState<InspectionImage[]>([])

  const [toolResults, setToolResults] = useState<Tool[]>([])
  const [currentStatus, setCurrentStatus] = useState<"IDLE" | "RUNNING" | "OK" | "NG">("IDLE")

  // Load program from storage on mount
  useEffect(() => {
    const loadProgram = () => {
      try {
        // Get program ID from URL params or use default
        const urlParams = new URLSearchParams(window.location.search)
        const programId = urlParams.get('id') || 'PRG-001'
        
        const program = storage.getProgram(programId)
        if (program) {
          setCurrentProgram(program)
          setProgramInfo({
            id: program.id,
            name: program.name
          })
          
          // Load tools from program configuration
          if (program.config.tools && program.config.tools.length > 0) {
            const configuredTools: Tool[] = program.config.tools.map((tool: any, index: number) => ({
              id: tool.id || `${tool.type}-${index}`,
              type: tool.type,
              name: tool.name,
              color: tool.color,
              roi: tool.roi,
              threshold: tool.threshold,
              matchRate: 0,
              status: "OK" as const,
            }))
            setTools(configuredTools)
          } else {
            // Fallback to default tools if no tools configured
            const defaultTools: Tool[] = [
              {
                id: "1",
                type: "pattern",
                name: "Pattern Match",
                color: "#3b82f6",
                roi: { x: 50, y: 50, width: 150, height: 100 },
                threshold: 85,
                matchRate: 0,
                status: "OK",
              },
              {
                id: "2",
                type: "edge",
                name: "Edge Detection",
                color: "#10b981",
                roi: { x: 250, y: 100, width: 180, height: 120 },
                threshold: 75,
                matchRate: 0,
                status: "OK",
              },
              {
                id: "3",
                type: "blob",
                name: "Blob Analysis",
                color: "#eab308",
                roi: { x: 450, y: 150, width: 140, height: 140 },
                threshold: 90,
                matchRate: 0,
                status: "OK",
              },
            ]
            setTools(defaultTools)
          }
          
          // Update stats from stored program
          setStats({
            totalInspections: program.totalInspections,
            okCount: program.okCount,
            ngCount: program.ngCount,
            currentCycleTime: 0,
            avgCycleTime: 0,
            minCycleTime: 0,
            maxCycleTime: 0,
          })
        } else {
          // Program not found, use default tools
          const defaultTools: Tool[] = [
            {
              id: "1",
              type: "pattern",
              name: "Pattern Match",
              color: "#3b82f6",
              roi: { x: 50, y: 50, width: 150, height: 100 },
              threshold: 85,
              matchRate: 0,
              status: "OK",
            },
            {
              id: "2",
              type: "edge",
              name: "Edge Detection",
              color: "#10b981",
              roi: { x: 250, y: 100, width: 180, height: 120 },
              threshold: 75,
              matchRate: 0,
              status: "OK",
            },
            {
              id: "3",
              type: "blob",
              name: "Blob Analysis",
              color: "#eab308",
              roi: { x: 450, y: 150, width: 140, height: 140 },
              threshold: 90,
              matchRate: 0,
              status: "OK",
            },
          ]
          setTools(defaultTools)
        }
      } catch (error) {
        console.error("Failed to load program:", error)
      }
    }
    
    loadProgram()
  }, [])

  // Update toolResults when tools change
  useEffect(() => {
    setToolResults([...tools])
  }, [tools])

  // Simulation effect - runs inspection cycle every 2 seconds
  useEffect(() => {
    if (!isRunning || isPaused) return

    const interval = setInterval(() => {
      runInspectionCycle()
    }, 2000)

    return () => clearInterval(interval)
  }, [isRunning, isPaused])

  // Draw canvas
  useEffect(() => {
    drawCanvas()
  }, [toolResults, currentStatus])

  const runInspectionCycle = () => {
    try {
      const startTime = performance.now()

      // Simulate tool results
      const updatedTools = tools.map((tool) => {
        try {
          const matchRate = Math.random() * 100
          const status = matchRate >= tool.threshold ? "OK" : "NG"
          return { ...tool, matchRate, status }
        } catch (error) {
          console.error('Error simulating tool result:', error)
          return { ...tool, matchRate: 0, status: "NG" }
        }
      })

      setToolResults(updatedTools)

      // Determine overall status
      const hasNG = updatedTools.some((tool) => tool.status === "NG")
      const overallStatus = hasNG ? "NG" : "OK"
      setCurrentStatus(overallStatus)

    // Update statistics
    const cycleTime = performance.now() - startTime
    setStats((prev) => {
      const newTotal = prev.totalInspections + 1
      const newOk = overallStatus === "OK" ? prev.okCount + 1 : prev.okCount
      const newNg = overallStatus === "NG" ? prev.ngCount + 1 : prev.ngCount
      const newAvg = (prev.avgCycleTime * prev.totalInspections + cycleTime) / newTotal
      const newMin = prev.minCycleTime === 0 ? cycleTime : Math.min(prev.minCycleTime, cycleTime)
      const newMax = Math.max(prev.maxCycleTime, cycleTime)

      const newStats = {
        totalInspections: newTotal,
        okCount: newOk,
        ngCount: newNg,
        currentCycleTime: cycleTime,
        avgCycleTime: newAvg,
        minCycleTime: newMin,
        maxCycleTime: newMax,
      }

      // Save stats to localStorage
      if (currentProgram) {
        try {
          storage.updateStats(currentProgram.id, {
            totalInspections: newTotal,
            okCount: newOk,
            ngCount: newNg,
            lastRun: new Date().toLocaleString()
          })
        } catch (error) {
          console.error("Failed to update program stats:", error)
        }
      }

      return newStats
    })

    const currentTime = new Date().toLocaleTimeString()
    setProcessingTimeHistory((prev) => {
      const newHistory = [...prev, { time: currentTime, value: cycleTime }]
      return newHistory.slice(-20) // Keep last 20 data points
    })

    setInspectionRateHistory((prev) => {
      const newHistory = [
        ...prev,
        {
          time: currentTime,
          ok: overallStatus === "OK" ? 1 : 0,
          ng: overallStatus === "NG" ? 1 : 0,
        },
      ]
      return newHistory.slice(-20) // Keep last 20 data points
    })

    captureImageForHistory(overallStatus, cycleTime)

    // Reset to RUNNING after showing result
    setTimeout(() => {
      if (isRunning && !isPaused) {
        setCurrentStatus("RUNNING")
      }
    }, 500)
    } catch (error) {
      console.error('Error in inspection cycle:', error)
      setCurrentStatus("NG")
    }
  }

  const captureImageForHistory = (status: "OK" | "NG", processingTime: number) => {
    try {
      const canvas = canvasRef.current
      if (!canvas) {
        console.warn('Canvas not available for image capture')
        return
      }

      const imageData = canvas.toDataURL("image/png")
      const newImage: InspectionImage = {
        id: `IMG-${Date.now()}`,
        timestamp: new Date(),
        status,
        processingTime,
        imageData,
      }

      setImageHistory((prev) => {
        const newHistory = [newImage, ...prev]
        return newHistory.slice(0, 100) // Keep last 100 images
      })
    } catch (error) {
      console.error('Error capturing image for history:', error)
    }
  }

  const drawCanvas = () => {
    try {
      const canvas = canvasRef.current
      if (!canvas) {
        console.warn('Canvas ref not available')
        return
      }

      const ctx = canvas.getContext("2d")
      if (!ctx) {
        console.error('Failed to get canvas context')
        return
      }

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw background (simulated camera image)
      ctx.fillStyle = "#1e293b"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw grid
      ctx.strokeStyle = "#334155"
      ctx.lineWidth = 1
      for (let i = 0; i < canvas.width; i += 40) {
        ctx.beginPath()
        ctx.moveTo(i, 0)
        ctx.lineTo(i, canvas.height)
        ctx.stroke()
      }
      for (let i = 0; i < canvas.height; i += 40) {
        ctx.beginPath()
        ctx.moveTo(0, i)
        ctx.lineTo(canvas.width, i)
        ctx.stroke()
      }

      // Draw tool ROIs with status
      toolResults.forEach((tool) => {
        try {
          // Draw ROI border
          ctx.strokeStyle = tool.color
          ctx.lineWidth = 3
          ctx.strokeRect(tool.roi.x, tool.roi.y, tool.roi.width, tool.roi.height)

          // Draw label background
          const labelText = `${tool.name} - ${tool.status || "IDLE"}`
          const textWidth = ctx.measureText(labelText).width
          ctx.fillStyle = tool.color
          ctx.fillRect(tool.roi.x, tool.roi.y - 24, textWidth + 16, 24)

          // Draw label text
          ctx.fillStyle = "#ffffff"
          ctx.font = "12px sans-serif"
          ctx.fillText(labelText, tool.roi.x + 8, tool.roi.y - 8)

          // Draw match rate if available
          if (tool.matchRate !== undefined) {
            ctx.fillStyle = tool.status === "OK" ? "#10b981" : "#ef4444"
            ctx.font = "bold 16px sans-serif"
            ctx.fillText(
              `${tool.matchRate.toFixed(1)}%`,
              tool.roi.x + tool.roi.width / 2 - 20,
              tool.roi.y + tool.roi.height / 2,
            )
          }
        } catch (error) {
          console.error('Error drawing tool ROI:', error)
        }
      })

      // Draw overall status overlay
      if (currentStatus === "OK" || currentStatus === "NG") {
        ctx.fillStyle = currentStatus === "OK" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
    } catch (error) {
      console.error('Error in drawCanvas:', error)
    }
  }

  const handleStart = () => {
    setIsRunning(true)
    setIsPaused(false)
    setCurrentStatus("RUNNING")
  }

  const handlePause = () => {
    setIsPaused(!isPaused)
  }

  const handleStop = () => {
    setIsRunning(false)
    setIsPaused(false)
    setCurrentStatus("IDLE")
  }

  const exportStatistics = () => {
    const data = {
      programInfo,
      stats,
      processingTimeHistory,
      inspectionRateHistory,
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `statistics-${programInfo.id}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredImages = imageHistory.filter((img) => {
    if (imageFilter === "ALL") return true
    return img.status === imageFilter
  })

  const pieData = [
    { name: "OK", value: stats.okCount, color: "#10b981" },
    { name: "NG", value: stats.ngCount, color: "#ef4444" },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-foreground">
      {/* Top Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Program Info */}
          <div className="flex items-center gap-4">
            <Button
              onClick={() => (window.location.href = "/")}
              variant="ghost"
              className="text-slate-400 hover:text-white"
            >
              ← Back
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">{programInfo.name}</h1>
              <p className="text-sm text-slate-400">Program ID: {programInfo.id}</p>
            </div>
          </div>

          {/* Status Indicator */}
          <div className="flex items-center gap-3">
            <div
              className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 ${
                currentStatus === "IDLE"
                  ? "bg-slate-800 text-slate-400"
                  : currentStatus === "RUNNING"
                    ? "bg-blue-600 text-white"
                    : currentStatus === "OK"
                      ? "bg-green-600 text-white"
                      : "bg-red-600 text-white"
              }`}
            >
              {currentStatus === "OK" && <CheckCircle2 className="h-5 w-5" />}
              {currentStatus === "NG" && <XCircle className="h-5 w-5" />}
              {currentStatus === "RUNNING" && <Activity className="h-5 w-5 animate-pulse" />}
              {currentStatus}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center gap-2">
            {!isRunning ? (
              <Button onClick={handleStart} className="bg-green-600 hover:bg-green-700 text-white gap-2">
                <Play className="h-4 w-4" />
                Start
              </Button>
            ) : (
              <>
                <Button
                  onClick={handlePause}
                  className={`${isPaused ? "bg-blue-600 hover:bg-blue-700" : "bg-yellow-600 hover:bg-yellow-700"} text-white gap-2`}
                >
                  <Pause className="h-4 w-4" />
                  {isPaused ? "Resume" : "Pause"}
                </Button>
                <Button onClick={handleStop} className="bg-red-600 hover:bg-red-700 text-white gap-2">
                  <StopIcon className="h-4 w-4" />
                  Stop
                </Button>
              </>
            )}
            <Button
              onClick={() => setShowConfig(!showConfig)}
              variant="secondary"
              className="bg-slate-700 hover:bg-slate-600 text-white gap-2"
            >
              <Settings className="h-4 w-4" />
              Config
            </Button>
            <Button
              onClick={() => setShowStats(!showStats)}
              variant="secondary"
              className="bg-slate-700 hover:bg-slate-600 text-white gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Stats
            </Button>
            <Button
              onClick={() => setShowHistory(!showHistory)}
              variant="secondary"
              className="bg-slate-700 hover:bg-slate-600 text-white gap-2"
            >
              <ImageIcon className="h-4 w-4" />
              History
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - 3 Column Layout */}
      <div className="grid grid-cols-12 gap-6 p-6">
        {/* Left Column - Live View */}
        <div className="col-span-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-400" />
                Live View
              </CardTitle>
            </CardHeader>
            <CardContent>
              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                className="border-2 border-slate-800 rounded-lg w-full"
              />
            </CardContent>
          </Card>
        </div>

        {/* Middle Column - Tool Results */}
        <div className="col-span-3 space-y-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-green-400" />
                Tool Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {toolResults.map((tool) => (
                <div key={tool.id} className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tool.color }} />
                      <span className="text-white font-semibold text-sm">{tool.name}</span>
                    </div>
                    {tool.status && (
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${
                          tool.status === "OK" ? "bg-green-600 text-white" : "bg-red-600 text-white"
                        }`}
                      >
                        {tool.status}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Match Rate</span>
                      <span className="text-blue-400 font-mono font-semibold">
                        {tool.matchRate?.toFixed(1) || "0.0"}%
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Threshold</span>
                      <span className="text-slate-300 font-mono">{tool.threshold}%</span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-slate-800 rounded-full h-2 mt-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          tool.status === "OK" ? "bg-green-500" : tool.status === "NG" ? "bg-red-500" : "bg-slate-600"
                        }`}
                        style={{ width: `${tool.matchRate || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Statistics */}
        <div className="col-span-3 space-y-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-400" />
                Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Inspection Counts */}
              <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                <div className="text-slate-400 text-xs mb-2">Total Inspections</div>
                <div className="text-white text-2xl font-bold">{stats.totalInspections}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-950 rounded-lg p-3 border border-green-800">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                    <span className="text-green-400 text-xs">OK</span>
                  </div>
                  <div className="text-white text-xl font-bold">{stats.okCount}</div>
                  <div className="text-green-400 text-xs">
                    {stats.totalInspections > 0 ? ((stats.okCount / stats.totalInspections) * 100).toFixed(1) : "0.0"}%
                  </div>
                </div>

                <div className="bg-red-950 rounded-lg p-3 border border-red-800">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="h-4 w-4 text-red-400" />
                    <span className="text-red-400 text-xs">NG</span>
                  </div>
                  <div className="text-white text-xl font-bold">{stats.ngCount}</div>
                  <div className="text-red-400 text-xs">
                    {stats.totalInspections > 0 ? ((stats.ngCount / stats.totalInspections) * 100).toFixed(1) : "0.0"}%
                  </div>
                </div>
              </div>

              {/* Cycle Times */}
              <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-blue-400" />
                  <span className="text-slate-400 text-xs">Cycle Times (ms)</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Current</span>
                    <span className="text-blue-400 font-mono font-semibold">{stats.currentCycleTime.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Average</span>
                    <span className="text-slate-300 font-mono">{stats.avgCycleTime.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Min</span>
                    <span className="text-green-400 font-mono">{stats.minCycleTime.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Max</span>
                    <span className="text-red-400 font-mono">{stats.maxCycleTime.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Expandable Configuration Panel */}
      {showConfig && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 shadow-lg z-10">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuration
              </h3>
              <Button
                onClick={() => setShowConfig(false)}
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-white"
              >
                <ChevronDown className="h-5 w-5" />
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {tools.map((tool) => (
                <div key={tool.id} className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tool.color }} />
                    <span className="text-white text-sm font-semibold">{tool.name}</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Threshold</span>
                      <span className="text-slate-300 font-mono">{tool.threshold}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">ROI</span>
                      <span className="text-slate-300 font-mono">
                        {tool.roi.width}x{tool.roi.height}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showStats && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 shadow-lg z-10 max-h-[70vh] overflow-y-auto">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Detailed Statistics
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  onClick={exportStatistics}
                  variant="secondary"
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export
                </Button>
                <Button
                  onClick={() => setShowStats(false)}
                  variant="ghost"
                  size="sm"
                  className="text-slate-400 hover:text-white"
                >
                  <ChevronDown className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* Processing Time Trend Chart */}
              <Card className="bg-slate-950 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Processing Time Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  {processingTimeHistory.length > 0 ? (
                    <ChartContainer
                      config={{
                        value: {
                          label: "Time (ms)",
                          color: "hsl(var(--chart-1))",
                        },
                      }}
                      className="h-[200px]"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={processingTimeHistory}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} />
                          <YAxis stroke="#94a3b8" fontSize={10} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">No data yet</div>
                  )}
                </CardContent>
              </Card>

              {/* OK/NG Ratio Pie Chart */}
              <Card className="bg-slate-950 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white text-sm">OK/NG Ratio</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.totalInspections > 0 ? (
                    <ChartContainer
                      config={{
                        ok: {
                          label: "OK",
                          color: "#10b981",
                        },
                        ng: {
                          label: "NG",
                          color: "#ef4444",
                        },
                      }}
                      className="h-[200px]"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={60}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">No data yet</div>
                  )}
                </CardContent>
              </Card>

              {/* Inspection Rate Bar Chart */}
              <Card className="bg-slate-950 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Inspection Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  {inspectionRateHistory.length > 0 ? (
                    <ChartContainer
                      config={{
                        ok: {
                          label: "OK",
                          color: "#10b981",
                        },
                        ng: {
                          label: "NG",
                          color: "#ef4444",
                        },
                      }}
                      className="h-[200px]"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={inspectionRateHistory}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} />
                          <YAxis stroke="#94a3b8" fontSize={10} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Legend />
                          <Bar dataKey="ok" fill="#10b981" name="OK" />
                          <Bar dataKey="ng" fill="#ef4444" name="NG" />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">No data yet</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 shadow-lg z-10 max-h-[70vh] overflow-y-auto">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Image History ({filteredImages.length} images)
              </h3>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-slate-950 rounded-lg p-1 border border-slate-800">
                  <Button
                    onClick={() => setImageFilter("ALL")}
                    variant="ghost"
                    size="sm"
                    className={`text-xs ${imageFilter === "ALL" ? "bg-slate-700 text-white" : "text-slate-400"}`}
                  >
                    All
                  </Button>
                  <Button
                    onClick={() => setImageFilter("OK")}
                    variant="ghost"
                    size="sm"
                    className={`text-xs ${imageFilter === "OK" ? "bg-green-600 text-white" : "text-slate-400"}`}
                  >
                    OK
                  </Button>
                  <Button
                    onClick={() => setImageFilter("NG")}
                    variant="ghost"
                    size="sm"
                    className={`text-xs ${imageFilter === "NG" ? "bg-red-600 text-white" : "text-slate-400"}`}
                  >
                    NG
                  </Button>
                </div>
                <Button
                  onClick={() => setShowHistory(false)}
                  variant="ghost"
                  size="sm"
                  className="text-slate-400 hover:text-white"
                >
                  <ChevronDown className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Horizontal scrolling gallery */}
            <div className="flex gap-3 overflow-x-auto pb-4">
              {filteredImages.length > 0 ? (
                filteredImages.map((img) => (
                  <div
                    key={img.id}
                    className="flex-shrink-0 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden cursor-pointer hover:border-blue-500 transition-colors"
                    onClick={() => setSelectedImage(img)}
                  >
                    <div className="relative">
                      <img src={img.imageData || "/placeholder.svg"} alt={img.id} className="w-48 h-36 object-cover" />
                      <div
                        className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold ${
                          img.status === "OK" ? "bg-green-600 text-white" : "bg-red-600 text-white"
                        }`}
                      >
                        {img.status}
                      </div>
                    </div>
                    <div className="p-2 space-y-1">
                      <div className="text-xs text-slate-400">{img.timestamp.toLocaleTimeString()}</div>
                      <div className="text-xs text-slate-300 font-mono">{img.processingTime.toFixed(2)} ms</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="w-full h-40 flex items-center justify-center text-slate-500 text-sm">
                  No images captured yet
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-8"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="bg-slate-900 rounded-lg border border-slate-800 max-w-4xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <h3 className="text-white font-semibold">{selectedImage.id}</h3>
                <span
                  className={`px-3 py-1 rounded text-sm font-bold ${
                    selectedImage.status === "OK" ? "bg-green-600 text-white" : "bg-red-600 text-white"
                  }`}
                >
                  {selectedImage.status}
                </span>
              </div>
              <Button
                onClick={() => setSelectedImage(null)}
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-white"
              >
                Close
              </Button>
            </div>
            <div className="p-4">
              <img
                src={selectedImage.imageData || "/placeholder.svg"}
                alt={selectedImage.id}
                className="w-full rounded-lg"
              />
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                  <div className="text-slate-400 text-xs mb-1">Timestamp</div>
                  <div className="text-white text-sm">{selectedImage.timestamp.toLocaleString()}</div>
                </div>
                <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                  <div className="text-slate-400 text-xs mb-1">Processing Time</div>
                  <div className="text-white text-sm font-mono">{selectedImage.processingTime.toFixed(2)} ms</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
