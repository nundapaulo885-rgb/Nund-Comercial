import { GoogleGenAI, Type } from "@google/genai";
import { TradeType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// Simulate a market analysis request
export const analyzeMarketTrend = async (priceHistory: number[]): Promise<{ recommendation: TradeType | 'HOLD', reasoning: string, confidence: number }> => {
  if (!process.env.API_KEY) {
    console.warn("API Key not found, returning mock analysis");
    // Fallback Mock Logic if no API Key
    const last = priceHistory[priceHistory.length - 1];
    const prev = priceHistory[priceHistory.length - 5];
    const diff = last - prev;
    return {
      recommendation: diff > 0 ? TradeType.CALL : TradeType.PUT,
      reasoning: "Análise simulada sem API Key: Tendência baseada em momento simples.",
      confidence: 75
    };
  }

  try {
    const recentPrices = priceHistory.slice(-20); // Analyze last 20 ticks
    const prompt = `
      Atue como um especialista em Scalping Trading para o índice Volatility 100.
      Analise os seguintes preços de fechamento (ticks) recentes: ${JSON.stringify(recentPrices)}.
      A estratégia é Scalping de altíssima frequência.
      Identifique se há uma micro-tendência de alta (CALL) ou baixa (PUT).
      Se o mercado estiver lateral, responda HOLD.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendation: { type: Type.STRING, enum: ["CALL", "PUT", "HOLD"] },
            reasoning: { type: Type.STRING },
            confidence: { type: Type.NUMBER, description: "Confidence score 0-100" }
          },
          required: ["recommendation", "reasoning", "confidence"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return {
      recommendation: result.recommendation as TradeType | 'HOLD',
      reasoning: result.reasoning || "Análise completada.",
      confidence: result.confidence || 50
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      recommendation: 'HOLD',
      reasoning: "Erro na conexão com IA. Aguardando...",
      confidence: 0
    };
  }
};