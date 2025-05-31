"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, Calculator, AlertCircle, DollarSign } from "lucide-react"
import { parseReceipt, type ReceiptData } from "../actions/parse-receipt"
import imageCompression from "browser-image-compression"
import { heicTo, isHeic } from "heic-to"
import Image from 'next/image'

export default function TipCalculator() {
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [customTipPercent, setCustomTipPercent] = useState("")
  const [selectedTipPercent, setSelectedTipPercent] = useState<number | null>(null)
  const [receiptImageUrl, setReceiptImageUrl] = useState<string | null>(null)
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false)

  const handleFileUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    setIsPreviewExpanded(true)  // Expand preview when starting upload

    try {
      const formData = new FormData(event.currentTarget)
      const file = formData.get("receipt") as File

      if (file && file.size > 300 * 1024) { // 300KB
        const options = {
          maxSizeMB: 0.3,
          maxWidthOrHeight: 1920,
          useWebWorker: true
        }
        
        let processedFile = file;

        // If HEIC, convert to JPEG using a dynamic import of heic2any
        const fileIsHeic = await isHeic(file)
        if (fileIsHeic) {
          try {
            const jpeg = await heicTo({
              blob: file,
              type: "image/jpeg",
              quality: 0.5
            })
            // heic2any returns a Blob or an array of Blobs
            const jpegBlob = Array.isArray(jpeg) ? jpeg[0] : jpeg;
            processedFile = new File([jpegBlob], file.name.replace(/\.heic$/i, ".jpg"), { type: "image/jpeg" });
          } catch (err) {
            console.error("HEIC conversion failed:", err);
            throw new Error("Failed to convert HEIC image. Please use a JPG or PNG.");
          }
        }

        // Compress if needed
        let finalFile = processedFile;
        if (processedFile.size > 300 * 1024) {
          finalFile = await imageCompression(processedFile, options);
        }

        // Create URL for the processed image
        const imageUrl = URL.createObjectURL(finalFile)
        setReceiptImageUrl(imageUrl)

        formData.set("receipt", finalFile);
      } else {
        // For small files, just use the original
        const imageUrl = URL.createObjectURL(file)
        setReceiptImageUrl(imageUrl)
      }

      const result = await parseReceipt(formData)
      setReceiptData(result)
    } catch (error) {
      console.error("Error processing image:", error)
      setReceiptData({
        totalAmount: 0,
        preTaxAmount: 0,
        serviceFee: 0,
        success: false,
        error: "Failed to process image. Please try again."
      })
    } finally {
      setIsLoading(false)
      setSelectedTipPercent(null)
      setCustomTipPercent("")
      setIsPreviewExpanded(false)  // Collapse preview after processing
    }
  }

  const calculateTip = (percentage: number) => {
    if (!receiptData || !receiptData.success) return 0
    const baseAmount = receiptData.preTaxAmount - receiptData.serviceFee
    return (baseAmount * percentage) / 100
  }

  const calculateTotal = (tipAmount: number) => {
    if (!receiptData || !receiptData.success) return 0
    return receiptData.totalAmount + tipAmount
  }

  const baseAmount = receiptData?.success ? receiptData.preTaxAmount - receiptData.serviceFee : 0

  const currentTipPercent = selectedTipPercent || (customTipPercent ? Number.parseFloat(customTipPercent) : 0)
  const tipAmount = calculateTip(currentTipPercent)
  const adjustedTipAmount = receiptData?.success ? tipAmount - receiptData.serviceFee : tipAmount
  const finalTotal = calculateTotal(adjustedTipAmount)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Smart Tip Calculator</h1>
          <p className="text-gray-600">Upload your receipt and let AI calculate the perfect tip if you&apos;re tired of service charges</p>
          <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium">
            <span className="mr-1">✓</span> CPA Approved
          </div>
        </div>

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Receipt
            </CardTitle>
            <CardDescription>Take a photo or upload an image of your restaurant receipt</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFileUpload} className="space-y-4">
              <div>
                <Label htmlFor="receipt">Receipt Image</Label>
                <Input id="receipt" name="receipt" type="file" accept="image/*" required className="mt-1" />
              </div>
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? "Processing..." : "Analyze Receipt"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Error State */}
        {receiptData && !receiptData.success && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {receiptData.error} Please try uploading a clearer image of your receipt.
            </AlertDescription>
          </Alert>
        )}

        {/* Receipt Image Preview */}
        {receiptImageUrl && (
          <Card>
            <CardHeader className="cursor-pointer" onClick={() => setIsPreviewExpanded(!isPreviewExpanded)}>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Receipt Image
                </div>
                <span className="text-sm text-gray-500">
                  {isPreviewExpanded ? "Click to collapse" : "Click to expand"}
                </span>
              </CardTitle>
            </CardHeader>
            {isPreviewExpanded && (
              <CardContent>
                <div className="relative aspect-[3/4] w-full max-w-md mx-auto">
                  <Image
                    src={receiptImageUrl}
                    alt="Uploaded receipt"
                    className="object-contain w-full h-full rounded-lg shadow-sm"
                    fill
                    sizes="(max-width: 768px) 100vw, 400px"
                    priority
                  />
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Receipt Analysis Results */}
        {receiptData && receiptData.success && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Receipt Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-gray-600">Total Amount</Label>
                  <p className="text-lg font-semibold">${receiptData.totalAmount.toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Pre-tax Amount</Label>
                  <p className="text-lg font-semibold">${receiptData.preTaxAmount.toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Service Fees</Label>
                  <p className="text-lg font-semibold">${receiptData.serviceFee.toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Base for Tipping</Label>
                  <p className="text-lg font-semibold text-green-600">${baseAmount.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tip Calculator */}
        {receiptData && receiptData.success && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Calculate Tip
              </CardTitle>
              <CardDescription>
                Choose a tip percentage based on ${baseAmount.toFixed(2)} (pre-tax minus service fees)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Preset Tip Buttons */}
              <div className="grid grid-cols-3 gap-3">
                {[10, 15, 20].map((percent) => (
                  <Button
                    key={percent}
                    variant={selectedTipPercent === percent ? "default" : "outline"}
                    onClick={() => {
                      setSelectedTipPercent(percent)
                      setCustomTipPercent("")
                    }}
                    className="h-16 flex flex-col"
                  >
                    <span className="text-lg font-bold">{percent}%</span>
                    <span className="text-sm">${calculateTip(percent).toFixed(2)}</span>
                  </Button>
                ))}
              </div>

              {/* Custom Tip Input */}
              <div className="space-y-2">
                <Label htmlFor="custom-tip">Custom Tip Percentage</Label>
                <Input
                  id="custom-tip"
                  type="number"
                  placeholder="Enter custom percentage"
                  value={customTipPercent}
                  onChange={(e) => {
                    setCustomTipPercent(e.target.value)
                    setSelectedTipPercent(null)
                  }}
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>

              {/* Tip Summary */}
              {currentTipPercent > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span>Tip ({currentTipPercent}%):</span>
                    <span className="font-semibold">${tipAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Minus Extra Fees:</span>
                    <span className="font-semibold text-red-600">-${receiptData.serviceFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Actual Tip:</span>
                    <span className="font-bold">${adjustedTipAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total + Tip:</span>
                    <span className="text-green-600">${finalTotal.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
