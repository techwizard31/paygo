"use client"

import { useState, useEffect } from "react"
import {
  Upload,
  FileText,
  Download,
  CheckCircle,
  AlertCircle,
  Code,
  Table as TableIcon,
  BarChart3,
  Loader2,
  X,
  File,
} from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"
import toast, { Toaster } from "react-hot-toast"

interface ExtractedDataItem {
  value: string;
  confidence: number;
}

interface ExtractedData {
  [key: string]: ExtractedDataItem;
}

export default function FileExtractor() {
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showRawJson, setShowRawJson] = useState(false)
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeView, setActiveView] = useState("both") // table, charts, both

  const processInvoice = async (selectedFile: File) => {
    setIsProcessing(true)
    setError(null)
    setExtractedData(null)

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)

      const response = await fetch("http://localhost:8000/process-invoice", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Failed to process invoice: ${response.statusText}`)
      }

      const result = await response.json()
      // Extract the 'data' property from the response
      const data = result.data || result
      setExtractedData(data)
      
      // Check due date and show toast notification if within 3 days
      checkDueDate(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while processing the invoice")
      console.error("Error:", err)
    } finally {
      setIsProcessing(false)
    }
  }

  const checkDueDate = (data: ExtractedData) => {
    if (data.due_date && data.due_date.value && data.due_date.value !== "nil") {
      try {
        const dueDate = new Date(data.due_date.value)
        const today = new Date()
        const diffTime = dueDate.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays >= 0 && diffDays <= 3) {
          toast.error(
            `⚠️ Payment Due Soon! Due date is in ${diffDays} ${diffDays === 1 ? "day" : "days"}. Please pay on time!`,
            {
              duration: 8000,
              position: "top-center",
              style: {
                background: "#ef4444",
                color: "#fff",
                fontWeight: "bold",
                padding: "16px",
                borderRadius: "8px",
              },
              icon: "🔔",
            }
          )
        } else if (diffDays < 0) {
          toast.error(
            `⚠️ Payment Overdue! The due date has passed ${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? "day" : "days"} ago!`,
            {
              duration: 8000,
              position: "top-center",
              style: {
                background: "#dc2626",
                color: "#fff",
                fontWeight: "bold",
                padding: "16px",
                borderRadius: "8px",
              },
              icon: "❌",
            }
          )
        } else {
          toast.success(
            `✓ Payment due in ${diffDays} days. You have time!`,
            {
              duration: 4000,
              position: "top-center",
              style: {
                background: "#10b981",
                color: "#fff",
                padding: "16px",
                borderRadius: "8px",
              },
            }
          )
        }
      } catch (error) {
        console.error("Error parsing due date:", error)
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const selectedFile = files[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)
      // Automatically process the file
      processInvoice(selectedFile)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      setFile(droppedFile)
      setError(null)
      // Automatically process the file
      processInvoice(droppedFile)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return "text-green-600 dark:text-green-400"
    if (confidence >= 0.75) return "text-yellow-600 dark:text-yellow-400"
    return "text-red-600 dark:text-red-400"
  }

  const getConfidenceBgColor = (confidence: number) => {
    if (confidence >= 0.9) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    if (confidence >= 0.75) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
  }

  const getConfidenceBarColor = (confidence: number) => {
    if (confidence >= 0.9) return "#10b981"
    if (confidence >= 0.75) return "#f59e0b"
    return "#ef4444"
  }

  const downloadJson = () => {
    if (!extractedData) return
    const dataStr = JSON.stringify(extractedData, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = "extracted-invoice-data.json"
    link.click()
    URL.revokeObjectURL(url)
  }

  const removeFile = () => {
    setFile(null)
    setExtractedData(null)
    setError(null)
  }

  // Prepare chart data
  const chartData = extractedData
    ? Object.entries(extractedData).map(([key, data]) => ({
        field: key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        confidence: parseFloat((data.confidence * 100).toFixed(1)),
        confidenceValue: data.confidence,
      }))
    : []

  const calculateStats = () => {
    if (!extractedData) return null

    const confidences = Object.values(extractedData).map((d) => d.confidence)
    const avgConfidence = (confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100
    const highConfidence = confidences.filter((c) => c >= 0.9).length
    const mediumConfidence = confidences.filter((c) => c >= 0.75 && c < 0.9).length
    const lowConfidence = confidences.filter((c) => c < 0.75).length

    return {
      avgConfidence: avgConfidence.toFixed(1),
      highConfidence,
      mediumConfidence,
      lowConfidence,
      totalFields: confidences.length,
    }
  }

  const stats = calculateStats()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 md:p-8">
      {/* Toast Container */}
      <Toaster />
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Invoice Data Extractor</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Upload invoice files and extract structured data with AI-powered confidence scoring
        </p>
      </div>

      {/* Upload Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Upload Card */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Upload Invoice</h2>

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer"
          >
            <input
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.png,.jpg,.jpeg"
              className="hidden"
              id="file-upload"
              disabled={isProcessing}
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span className="font-semibold text-blue-600 dark:text-blue-400">Click to upload</span> or drag and
                drop
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">PDF, PNG, JPG (MAX. 10MB)</p>
            </label>
          </div>

          {isProcessing && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 rounded-lg flex items-center gap-3">
              <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Processing invoice...</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Extracting data from your file</p>
              </div>
            </div>
          )}

          {file && !isProcessing && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900 dark:bg-opacity-20 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {(file.size / 1024).toFixed(2)} KB • Processed successfully
                  </p>
                </div>
              </div>
              <button
                onClick={removeFile}
                className="p-2 hover:bg-red-100 dark:hover:bg-red-900 dark:hover:bg-opacity-30 rounded-lg transition-colors"
              >
                <X className="h-4 w-4 text-red-600 dark:text-red-400" />
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900 dark:bg-opacity-20 rounded-lg flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}
        </div>

        {/* Stats Card */}
        {stats && (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Extraction Summary</h2>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500 to-green-600 p-4">
                <div className="absolute top-0 right-0 w-20 h-20 bg-white opacity-10 rounded-full -mr-10 -mt-10"></div>
                <div className="relative z-10">
                  <p className="text-sm font-medium text-green-100">Avg Confidence</p>
                  <p className="text-2xl font-bold text-white mt-1">{stats.avgConfidence}%</p>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-4">
                <div className="absolute top-0 right-0 w-20 h-20 bg-white opacity-10 rounded-full -mr-10 -mt-10"></div>
                <div className="relative z-10">
                  <p className="text-sm font-medium text-blue-100">Total Fields</p>
                  <p className="text-2xl font-bold text-white mt-1">{stats.totalFields}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900 dark:bg-opacity-20 rounded-lg">
                <span className="text-sm font-medium text-gray-900 dark:text-white">High Confidence (≥90%)</span>
                <span className="text-sm font-bold text-green-600 dark:text-green-400">{stats.highConfidence}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900 dark:bg-opacity-20 rounded-lg">
                <span className="text-sm font-medium text-gray-900 dark:text-white">Medium Confidence (75-89%)</span>
                <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400">
                  {stats.mediumConfidence}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900 dark:bg-opacity-20 rounded-lg">
                <span className="text-sm font-medium text-gray-900 dark:text-white">Low Confidence (&lt;75%)</span>
                <span className="text-sm font-bold text-red-600 dark:text-red-400">{stats.lowConfidence}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Section */}
      {extractedData && (
        <>
          {/* View Controls */}
          <div className="flex items-center justify-between mb-6">
            <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1">
              <button
                onClick={() => setActiveView("both")}
                className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeView === "both"
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <TableIcon className="h-4 w-4 mr-2" />
                Both
              </button>
              <button
                onClick={() => setActiveView("table")}
                className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeView === "table"
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <TableIcon className="h-4 w-4 mr-2" />
                Table
              </button>
              <button
                onClick={() => setActiveView("charts")}
                className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeView === "charts"
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Charts
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowRawJson(!showRawJson)}
                className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Code className="h-4 w-4 mr-2" />
                {showRawJson ? "Hide" : "Show"} JSON
              </button>
              <button
                onClick={downloadJson}
                className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Download JSON
              </button>
            </div>
          </div>

          {/* Raw JSON Display */}
          {showRawJson && (
            <div className="mb-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Code className="h-5 w-5 mr-2" />
                Raw JSON Data
              </h2>
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-green-400 font-mono">
                  {JSON.stringify(extractedData, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Table View */}
          {(activeView === "table" || activeView === "both") && (
            <div className="mb-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
              <div className="p-6 pb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <TableIcon className="h-5 w-5 mr-2" />
                  Extracted Data Table
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Field Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Extracted Value
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Confidence Score
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {Object.entries(extractedData).map(([key, data]) => (
                      <tr key={key} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {data.value === "nil" ? (
                              <span className="text-gray-400 italic">Not Available</span>
                            ) : (
                              data.value
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex flex-col items-center">
                            <span className={`text-sm font-bold ${getConfidenceColor(data.confidence)}`}>
                              {(data.confidence * 100).toFixed(1)}%
                            </span>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                              <div
                                className="h-2 rounded-full transition-all"
                                style={{
                                  width: `${data.confidence * 100}%`,
                                  backgroundColor: getConfidenceBarColor(data.confidence),
                                }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConfidenceBgColor(
                              data.confidence
                            )}`}
                          >
                            {data.confidence >= 0.9 ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                High
                              </>
                            ) : data.confidence >= 0.75 ? (
                              <>
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Medium
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Low
                              </>
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Charts View */}
          {(activeView === "charts" || activeView === "both") && (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Confidence Score Visualization
              </h2>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-600" />
                  <XAxis
                    dataKey="field"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    className="text-gray-600 dark:text-gray-400"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    label={{ value: "Confidence Score (%)", angle: -90, position: "insideLeft" }}
                    className="text-gray-600 dark:text-gray-400"
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                    formatter={(value) => [`${value}%`, "Confidence"]}
                  />
                  <Bar dataKey="confidence" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getConfidenceBarColor(entry.confidenceValue)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!extractedData && !isProcessing && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Data Extracted Yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Upload an invoice file to automatically extract and view structured data
          </p>
        </div>
      )}
    </div>
  )
}