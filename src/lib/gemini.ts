import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

export const parseVoiceCommand = async (command: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Parse the following voice command into a financial transaction. 
      Command: "${command}"
      Extract the amount, category (Food, Transport, Shopping, Bills, Entertainment, Healthcare, Education, Other), type (income or expense), and notes.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER },
            category: { type: Type.STRING },
            type: { type: Type.STRING, enum: ["income", "expense"] },
            notes: { type: Type.STRING }
          },
          required: ["amount", "category", "type"]
        }
      }
    });
    
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error parsing voice command:", error);
    throw error;
  }
};

export const parseBankSMS = async (sms: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Parse the following bank SMS into a transaction.
      SMS: "${sms}"
      Extract the amount, category, type (income or expense), date (if available, otherwise leave empty), and merchant/notes.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER },
            category: { type: Type.STRING },
            type: { type: Type.STRING, enum: ["income", "expense"] },
            notes: { type: Type.STRING },
            date: { type: Type.STRING }
          },
          required: ["amount", "category", "type"]
        }
      }
    });
    
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error parsing bank SMS:", error);
    throw error;
  }
};

export const analyzeSpending = async (transactions: any[], budgets: any[]) => {
  try {
    const prompt = `Analyze the following financial data and provide insights.
    Transactions: ${JSON.stringify(transactions)}
    Budgets: ${JSON.stringify(budgets)}
    
    Provide:
    1. Top spending category
    2. Any unnecessary spending or anomalies
    3. Savings suggestions
    4. A financial health score from 0 to 100
    5. A brief summary of financial health`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topSpendingCategory: { type: Type.STRING },
            unnecessarySpending: { type: Type.ARRAY, items: { type: Type.STRING } },
            savingsSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            financialHealthScore: { type: Type.NUMBER },
            summary: { type: Type.STRING }
          },
          required: ["topSpendingCategory", "unnecessarySpending", "savingsSuggestions", "financialHealthScore", "summary"]
        }
      }
    });
    
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error analyzing spending:", error);
    throw error;
  }
};

export const parseReceiptImage = async (base64Image: string, mimeType: string) => {
  try {
    const imagePart = {
      inlineData: {
        mimeType,
        data: base64Image.split(',')[1] || base64Image,
      },
    };
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          imagePart,
          { text: "Extract the total amount, merchant name, and date from this receipt. Categorize the expense." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER },
            merchant: { type: Type.STRING },
            date: { type: Type.STRING },
            category: { type: Type.STRING }
          },
          required: ["amount", "merchant", "category"]
        }
      }
    });
    
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error parsing receipt:", error);
    throw error;
  }
};

export const generateFinancialStory = async (transactions: any[]) => {
  try {
    const prompt = `Based on these recent transactions, write a short, engaging, and personalized "Financial Story" (like Spotify Wrapped but for money). Highlight their spending habits, biggest wins, and areas for improvement in a fun, encouraging tone. Keep it under 150 words.
    Transactions: ${JSON.stringify(transactions.slice(0, 50))}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
    });
    
    return response.text;
  } catch (error) {
    console.error("Error generating story:", error);
    throw error;
  }
};

export const smartPurchaseAdvisor = async (item: string, price: number, transactions: any[], budgets: any[]) => {
  try {
    const prompt = `The user wants to buy "${item}" for $${price}. 
    Based on their recent transactions and budgets, act as a strict but helpful financial advisor.
    Tell them if they can afford it, if it's a good idea, and suggest alternatives or a saving plan if they can't.
    Transactions: ${JSON.stringify(transactions.slice(0, 50))}
    Budgets: ${JSON.stringify(budgets)}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
    });
    
    return response.text;
  } catch (error) {
    console.error("Error in purchase advisor:", error);
    throw error;
  }
};
