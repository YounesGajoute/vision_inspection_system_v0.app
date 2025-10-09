"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Play, Settings, Plus, Calendar, CheckCircle2, XCircle, Trash2 } from "lucide-react"
import { api } from "@/lib/api"

interface DisplayProgram {
  id: string
  name: string
  createdDate: string
  lastRun: string
  totalInspections: number
  okCount: number
  ngCount: number
}

// No more demo programs - fetch real data from database API

export default function ProgramSelectionScreen() {
  const [programs, setPrograms] = useState<DisplayProgram[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadPrograms()
  }, [])

  const loadPrograms = async () => {
    try {
      setIsLoading(true)
      
      // Fetch real programs from database API
      const apiPrograms = await api.getPrograms(true) // active only
      
      if (apiPrograms && apiPrograms.length > 0) {
        // Convert API programs to display format
        const displayPrograms = apiPrograms.map((prog: any) => ({
          id: prog.id.toString(),
          name: prog.name,
          createdDate: prog.created_at?.split(' ')[0] || 'Unknown',
          lastRun: prog.last_run || "Never",
          totalInspections: prog.total_inspections || 0,
          okCount: prog.ok_count || 0,
          ngCount: prog.ng_count || 0
        }))
        setPrograms(displayPrograms)
      } else {
        // No programs in database
        setPrograms([])
      }
    } catch (error) {
      console.error("Failed to load programs from API:", error)
      // Show empty state instead of demo programs
      setPrograms([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteProgram = async (programId: string) => {
    if (confirm("Are you sure you want to delete this program?")) {
      try {
        await api.deleteProgram(parseInt(programId))
        // Reload programs after delete
        await loadPrograms()
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
