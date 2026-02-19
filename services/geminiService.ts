import { GoogleGenAI, Type } from "@google/genai";
import { FALLBACK_QUESTIONS } from "../constants";

export const fetchQuestions = async (): Promise<string[]> => {
  try {
    // Relying strictly on the environment variable as per instructions
    if (!process.env.API_KEY) {
      console.warn("No API_KEY found, using fallback questions.");
      return FALLBACK_QUESTIONS;
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "生成7个过年时亲戚长辈最爱问的、让人充满压力的犀利问题，必须非常简短（10个字以内），例如：工资多少？买房没？",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
          },
        },
      },
    });

    const text = response.text;
    if (text) {
       const questions = JSON.parse(text) as string[];
       if (questions && questions.length > 0) {
           return questions;
       }
    }
    return FALLBACK_QUESTIONS;
  } catch (error) {
    console.error("Failed to fetch questions from Gemini:", error);
    return FALLBACK_QUESTIONS;
  }
};