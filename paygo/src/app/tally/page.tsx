"use client"

import { useState, useEffect } from "react"
import { Download, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import toast, { Toaster } from "react-hot-toast"

interface Invoice {
  _id: string
  uuid: string
  user_uuid: string
  invoice_number: string
  vendor_name: string
  invoice_date: string
  total_amount: number
  tax_amount?: number
  due_date?: string
  purchase_order?: string
  gst_number?: string
  scraped_data: string
}

export default function BalanceSheet() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userUuid, setUserUuid] = useState<string | null>(null)

  // Fetch user UUID from localStorage and invoices on component mount
  useEffect(() => {
    const uuid = localStorage.getItem('user_uuid')
    if (!uuid) {
      setError('User UUID not found. Please log in.')
      setIsLoading(false)
      toast.error('Please log in to view your invoices', {
        duration: 5000,
        position: "top-center",
      })
      return
    }
    setUserUuid(uuid)
    fetchInvoices(uuid)
  }, [])

  const fetchInvoices = async (uuid: string) => {
    setIsLoading(true)
    setError(null)

    try {
      console.log('[BalanceSheet] - Fetching invoices for user:', uuid)
      const response = await fetch('/api/mails', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch invoices: ${response.statusText}`)
      }

      const allInvoices = await response.json()
      console.log('[BalanceSheet] - All invoices received:', allInvoices)

      // Filter invoices by user_uuid
      const userInvoices = allInvoices.filter((inv: Invoice) => inv.user_uuid === uuid)
      console.log('[BalanceSheet] - Filtered user invoices:', userInvoices)

      setInvoices(userInvoices)

      if (userInvoices.length === 0) {
        toast('No invoices found for your account', {
          icon: 'ℹ️',
          duration: 4000,
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch invoices'
      setError(errorMessage)
      console.error('[BalanceSheet] - Error fetching invoices:', err)
      toast.error(errorMessage, {
        duration: 5000,
        position: "top-center",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    if (userUuid) {
      fetchInvoices(userUuid)
      toast.success('Refreshing invoices...', {
        duration: 2000,
      })
    }
  }

  const filteredInvoices = invoices.filter(
    (invoice) =>
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const totalAmount = invoices.reduce((sum, inv) => sum + inv.total_amount, 0)
  const totalTax = invoices.reduce((sum, inv) => sum + (inv.tax_amount || 0), 0)

  // Calculate status based on due_date
  const getInvoiceStatus = (invoice: Invoice): "paid" | "pending" | "overdue" => {
    if (!invoice.due_date || invoice.due_date === "nil") {
      return "pending"
    }

    const dueDate = new Date(invoice.due_date)
    const today = new Date()
    const diffTime = dueDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return "overdue"
    }

    // You can add logic here to mark as "paid" based on your payment tracking
    return "pending"
  }

  const paidCount = invoices.filter((inv) => getInvoiceStatus(inv) === "paid").length
  const pendingCount = invoices.filter((inv) => getInvoiceStatus(inv) === "pending").length
  const overdueCount = invoices.filter((inv) => getInvoiceStatus(inv) === "overdue").length

  const getStatusBadge = (status: string) => {
    const baseClass = "px-2.5 py-1 rounded-full text-xs font-medium"
    switch (status) {
      case "paid":
        return <span className={`${baseClass} bg-emerald-500/20 text-emerald-300`}>Paid</span>
      case "pending":
        return <span className={`${baseClass} bg-amber-500/20 text-amber-300`}>Pending</span>
      case "overdue":
        return <span className={`${baseClass} bg-red-500/20 text-red-300`}>Overdue</span>
      default:
        return <span className={baseClass}>Unknown</span>
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === "nil") return "N/A"
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const exportToCSV = () => {
    if (invoices.length === 0) {
      toast.error('No invoices to export')
      return
    }

    const headers = [
      "Invoice Number",
      "Vendor Name",
      "Invoice Date",
      "Due Date",
      "Total Amount (INR)",
      "Tax Amount (INR)",
      "GST Number",
      "Purchase Order",
      "Status"
    ]

    const rows = invoices.map(invoice => [
      invoice.invoice_number,
      invoice.vendor_name,
      formatDate(invoice.invoice_date),
      formatDate(invoice.due_date || ""),
      invoice.total_amount,
      invoice.tax_amount || 0,
      invoice.gst_number || "N/A",
      invoice.purchase_order || "N/A",
      getInvoiceStatus(invoice)
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `balance-sheet-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)

    toast.success('Report exported successfully!', {
      duration: 3000,
    })
  }

  return (
    <div className="p-6 md:p-8">
      {/* Toast Container */}
      <Toaster />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Balance Sheet</h1>
        <p className="text-slate-400">Financial record of company invoices and purchases for the current period</p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading invoices...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-6 mb-8">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
            <div>
              <h3 className="text-red-400 font-semibold mb-1">Error Loading Invoices</h3>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Only show when not loading */}
      {!isLoading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {/* Total Invoices Card */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <p className="text-slate-400 text-xs font-medium mb-2">Total Invoices</p>
              <p className="text-2xl font-bold text-white">{invoices.length}</p>
            </div>

            {/* Total Amount Card */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <p className="text-slate-400 text-xs font-medium mb-2">Total Amount</p>
              <p className="text-2xl font-bold text-white text-balance">{formatCurrency(totalAmount)}</p>
            </div>

            {/* Total Tax Card */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <p className="text-slate-400 text-xs font-medium mb-2">Total Tax</p>
              <p className="text-2xl font-bold text-blue-400">{formatCurrency(totalTax)}</p>
              <p className="text-xs text-slate-500 mt-1">
                {totalAmount > 0 ? ((totalTax / totalAmount) * 100).toFixed(1) : "0"}% of total
              </p>
            </div>

            {/* Paid Card */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <p className="text-slate-400 text-xs font-medium mb-2">Paid</p>
              <p className="text-2xl font-bold text-emerald-400">{paidCount}</p>
            </div>

            {/* Pending & Overdue Card */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <p className="text-slate-400 text-xs font-medium mb-2">Pending & Overdue</p>
              <p className="text-2xl font-bold text-red-400">{pendingCount + overdueCount}</p>
              <p className="text-xs text-slate-500 mt-1">
                {pendingCount} pending, {overdueCount} overdue
              </p>
            </div>
          </div>

          {/* Main Content Section */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            {/* Header Section */}
            <div className="border-b border-slate-700 p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Invoices & Purchases Register</h2>
                  <p className="text-slate-400 text-sm mt-1">
                    Complete ledger of all vendor transactions and related tax information
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleRefresh}
                    className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </button>
                  <button
                    onClick={exportToCSV}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap"
                  >
                    <Download className="w-4 h-4" />
                    Export Report
                  </button>
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="p-6">
              {/* Search Bar */}
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="Search invoices by number or vendor name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 text-white placeholder-slate-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Invoice Number</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Vendor Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Invoice Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Due Date</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-300">Total Amount</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-300">Tax Amount</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-300">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.length > 0 ? (
                      filteredInvoices.map((invoice) => (
                        <tr key={invoice._id} className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors">
                          <td className="px-4 py-4 text-sm text-white font-medium">{invoice.invoice_number}</td>
                          <td className="px-4 py-4 text-sm text-slate-300">{invoice.vendor_name}</td>
                          <td className="px-4 py-4 text-sm text-slate-400">{formatDate(invoice.invoice_date)}</td>
                          <td className="px-4 py-4 text-sm text-slate-400">{formatDate(invoice.due_date || "")}</td>
                          <td className="px-4 py-4 text-sm text-right text-white font-medium">
                            {formatCurrency(invoice.total_amount)}
                          </td>
                          <td className="px-4 py-4 text-sm text-right text-blue-400 font-medium">
                            {formatCurrency(invoice.tax_amount || 0)}
                          </td>
                          <td className="px-4 py-4 text-center">{getStatusBadge(getInvoiceStatus(invoice))}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                          {searchTerm ? "No invoices found matching your search" : "No invoices found. Upload an invoice to get started."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer Summary */}
              {filteredInvoices.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-700">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex justify-between md:justify-start md:gap-2">
                      <span className="text-slate-400">Records shown:</span>
                      <span className="text-white font-semibold">
                        {filteredInvoices.length} of {invoices.length}
                      </span>
                    </div>
                    <div className="flex justify-between md:justify-start md:gap-2">
                      <span className="text-slate-400">Subtotal:</span>
                      <span className="text-white font-semibold">
                        {formatCurrency(filteredInvoices.reduce((sum, inv) => sum + inv.total_amount, 0))}
                      </span>
                    </div>
                    <div className="flex justify-between md:justify-start md:gap-2">
                      <span className="text-slate-400">Tax Total:</span>
                      <span className="text-blue-400 font-semibold">
                        {formatCurrency(filteredInvoices.reduce((sum, inv) => sum + (inv.tax_amount || 0), 0))}
                      </span>
                    </div>
                    <div className="flex justify-between md:justify-start md:gap-2">
                      <span className="text-slate-400">Tax %:</span>
                      <span className="text-white font-semibold">
                        {filteredInvoices.length > 0
                          ? (
                              (filteredInvoices.reduce((sum, inv) => sum + (inv.tax_amount || 0), 0) /
                                filteredInvoices.reduce((sum, inv) => sum + inv.total_amount, 0)) *
                              100
                            ).toFixed(2)
                          : "0"}
                        %
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}