"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Play, Settings, Plus, Calendar, CheckCircle2, XCircle, Trash2 } from "lucide-react"
import { storage, Program } from "@/lib/storage"

interface DisplayProgram {
  id: string
  name: string
  createdDate: string
  lastRun: string
  totalInspections: number
  okCount: number
  ngCount: number
}

// Sample programs for initial setup
const samplePrograms: DisplayProgram[] = [
  {
    id: "PROG_001",
    name: "PCB Assembly Check",
    createdDate: "2024-01-15",
    lastRun: "2024-10-05 14:32:18",
    totalInspections: 15847,
    okCount: 15623,
    ngCount: 224,
  },
  {
    id: "PROG_002",
    name: "Label Position Verify",
    createdDate: "2024-02-20",
    lastRun: "2024-10-06 09:15:42",
    totalInspections: 8932,
    okCount: 8901,
    ngCount: 31,
  },
  {
    id: "PROG_003",
    name: "Connector Pin Inspection",
    createdDate: "2024-03-10",
    lastRun: "2024-10-06 11:48:55",
    totalInspections: 23456,
    okCount: 22987,
    ngCount: 469,
  },
]

export default function ProgramSelectionScreen() {
  const [programs, setPrograms] = useState<DisplayProgram[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadPrograms()
  }, [])

  const loadPrograms = () => {
    try {
      const storedPrograms = storage.getAllPrograms()
      
      if (storedPrograms.length === 0) {
        // Initialize with sample programs if no programs exist
        const initialPrograms = samplePrograms.map(prog => ({
          id: prog.id,
          name: prog.name,
          created: prog.createdDate,
          lastRun: prog.lastRun,
          totalInspections: prog.totalInspections,
          okCount: prog.okCount,
          ngCount: prog.ngCount,
          config: {
            triggerType: "internal",
            triggerInterval: 100,
            triggerDelay: 10,
            brightnessMode: "normal",
            focusValue: 50,
            masterImage: null,
            tools: [],
            outputs: {}
          }
        }))
        
        initialPrograms.forEach(program => storage.saveProgram(program))
        setPrograms(samplePrograms)
      } else {
        // Convert stored programs to display format
        const displayPrograms = storedPrograms.map(prog => ({
          id: prog.id,
          name: prog.name,
          createdDate: prog.created,
          lastRun: prog.lastRun || "Never",
          totalInspections: prog.totalInspections,
          okCount: prog.okCount,
          ngCount: prog.ngCount
        }))
        setPrograms(displayPrograms)
      }
    } catch (error) {
      console.error("Failed to load programs:", error)
      setPrograms(samplePrograms) // Fallback to sample programs
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteProgram = (programId: string) => {
    if (confirm("Are you sure you want to delete this program?")) {
      try {
        storage.deleteProgram(programId)
        setPrograms(programs.filter(p => p.id !== programId))
      } catch (error) {
        console.error("Failed to delete program:", error)
        alert("Failed to delete program. Please try again.")
      }
    }
  }
  const handleRun = (programId: string) => {
    window.location.href = `/run?id=${programId}`
  }

  const handleConfigure = (programId: string) => {
    window.location.href = `/configure?id=${programId}`
  }

  const handleNewProgram = () => {
    window.location.href = "/configure"
  }

  return (
    <div className="min-h-screen bg-slate-950 text-foreground p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Vision Inspection System</h1>
          <p className="text-slate-400">Select a program to run or configure</p>
        </div>
        <Button onClick={handleNewProgram} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
          <Plus className="h-5 w-5" />
          New Program
        </Button>
      </div>

      {/* Program Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center text-slate-400 py-8">
            Loading programs...
          </div>
        ) : programs.length === 0 ? (
          <div className="col-span-full text-center text-slate-400 py-8">
            No programs found. Create your first program to get started.
          </div>
        ) : (
          programs.map((program) => {
          const passRate = ((program.okCount / program.totalInspections) * 100).toFixed(2)

          return (
            <Card key={program.id} className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <CardTitle className="text-xl text-white mb-1">{program.name}</CardTitle>
                    <CardDescription className="text-blue-400 font-mono text-sm">{program.id}</CardDescription>
                  </div>
                  <Button
                    onClick={() => handleDeleteProgram(program.id)}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-red-950 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-400 mt-3">
                  <Calendar className="h-4 w-4" />
                  <span>Created: {program.createdDate}</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Last Run */}
                <div className="text-sm">
                  <span className="text-slate-400">Last Run: </span>
                  <span className="text-slate-300 font-mono">{program.lastRun}</span>
                </div>

                {/* Statistics */}
                <div className="bg-slate-950 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">Total Inspections</span>
                    <span className="text-white font-semibold">{program.totalInspections.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-slate-400 text-sm">OK Count</span>
                    </div>
                    <span className="text-green-500 font-semibold">{program.okCount.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-slate-400 text-sm">NG Count</span>
                    </div>
                    <span className="text-red-500 font-semibold">{program.ngCount.toLocaleString()}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">Pass Rate</span>
                      <span className="text-blue-400 font-semibold">{passRate}%</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => handleRun(program.id)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2"
                  >
                    <Play className="h-4 w-4" />
                    Run
                  </Button>
                  <Button
                    onClick={() => handleConfigure(program.id)}
                    variant="secondary"
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Configure
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        }))}
      </div>
    </div>
  )
}
