"use server"

import { GoogleGenerativeAI } from "@google/generative-ai"

export interface ReceiptData {
  totalAmount: number
  preTaxAmount: number
  serviceFee: number
  success: boolean
  error?: string
}

export async function parseReceipt(formData: FormData): Promise<ReceiptData> {
  try {
    const file = formData.get("receipt") as File

    if (!file) {
      return {
        totalAmount: 0,
        preTaxAmount: 0,
        serviceFee: 0,
        success: false,
        error: "No file uploaded",
      }
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString("base64")

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!)

    const generationConfig = {
      responseMimeType:'application/json'
    };

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash", generationConfig })

    const prompt = `
    Analyze this restaurant receipt image and extract the following information:
    1. Total amount (final amount to pay)
    2. Pre-tax amount (subtotal before tax)
    3. Service charges/fees (any service fees, delivery fees, etc. that are added before tax)
    
    Return the response as a JSON object in this exact JSON format:
    {
      "totalAmount": number,
      "preTaxAmount": number,
      "serviceFee": number,
      "success": true
    }
    
    If you cannot clearly identify these amounts from the receipt, return:
    {
      "success": false,
      "error": "Unable to parse receipt clearly"
    }
    
    Only return valid JSON object, no other text.
    `

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64,
          mimeType: file.type,
        },
      },
    ])

    const response = await result.response
    const text = response.text()
    console.log("Model response: ", text)

    try {
      const parsed = JSON.parse(text)

      if (!parsed.success) {
        return {
          totalAmount: 0,
          preTaxAmount: 0,
          serviceFee: 0,
          success: false,
          error: parsed.error || "Unable to parse receipt",
        }
      }

      return {
        totalAmount: parsed.totalAmount || 0,
        preTaxAmount: parsed.preTaxAmount || 0,
        serviceFee: parsed.serviceFee || 0,
        success: true,
      }
    } catch (parseError) {
      console.error("Error parsing receipt:", parseError)
      return {
        totalAmount: 0,
        preTaxAmount: 0,
        serviceFee: 0,
        success: false,
        error: "Failed to parse receipt data",
      }
    }
  } catch (error) {
    console.error("Error parsing receipt:", error)
    return {
      totalAmount: 0,
      preTaxAmount: 0,
      serviceFee: 0,
      success: false,
      error: "Failed to process receipt",
    }
  }
}
