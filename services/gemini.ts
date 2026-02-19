
import { GoogleGenAI, Type } from "@google/genai";
import { MASCOT_STYLE_DESCRIPTION } from "../constants";
import { PromptSuggestion, GenerationConfig } from "../types";

/**
 * Helper to execute API calls with exponential backoff retry logic and a safety timeout.
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 2000): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Generation timed out. The network might be slow.')), 45000)
      );
      
      return await Promise.race([fn(), timeoutPromise]) as T;
    } catch (error: any) {
      lastError = error;
      const errorString = String(error).toLowerCase();
      const errorObjString = JSON.stringify(error).toLowerCase();
      
      const isRetryable = 
        errorString.includes('429') || 
        errorString.includes('resource_exhausted') || 
        errorString.includes('quota') ||
        errorString.includes('500') ||
        errorString.includes('internal') ||
        errorString.includes('xhr error') ||
        errorObjString.includes('500') ||
        errorObjString.includes('xhr');
      
      if (isRetryable && i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        console.warn(`Retryable error encountered. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

/**
 * Generates a mascot image based on a prompt and optional configuration.
 */
export const generateMascotImage = async (userPrompt: string, config: GenerationConfig = {}): Promise<string> => {
  return withRetry(async () => {
    // ALWAYS create a new instance to ensure we use the most up-to-date API key
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const { masterReference, useUltra } = config;
    
    const styleConstraint = "CRITICAL: The entire image, including the background and environment, MUST be in a flat 2D vector cartoon style. No 3D, no realism.";
    
    const systemPrompt = masterReference 
      ? `${styleConstraint}\n\nUse the PROVIDED IMAGE as the absolute reference for the character $CHAD. 
         MAINTAIN THE EXACT CHARACTER DESIGN: Green skin, thick black beard, large expressive white eyes, orange lips, and muscular build.
         Place THIS EXACT character in the following scene: ${userPrompt}.
         Ensure the environment perfectly matches the flat 2D cartoon aesthetic of the character.`
      : `${MASCOT_STYLE_DESCRIPTION}\n\nSCENE DESCRIPTION: ${userPrompt}\n\n${styleConstraint}`;

    const parts: any[] = [{ text: systemPrompt }];
    
    if (masterReference) {
      const parts_data = masterReference.split(',');
      if (parts_data.length > 1) {
        parts.unshift({
          inlineData: {
            mimeType: "image/png",
            data: parts_data[1]
          }
        });
      }
    }

    const modelName = useUltra ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';

    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
          ...(useUltra ? { imageSize: "2K" } : {})
        }
      }
    });

    const candidateParts = response.candidates?.[0]?.content?.parts || [];
    for (const part of candidateParts) {
      if (part.inlineData) {
        const mime = part.inlineData.mimeType || 'image/png';
        return `data:${mime};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data found in response. If using Ultra mode, ensure your API key is from a project with billing enabled.");
  });
};

/**
 * Refines an existing mascot image by adding shadows and highlights.
 */
export const refineMascotImage = async (base64ImageUrl: string): Promise<string> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const dataParts = base64ImageUrl.split(',');
    if (dataParts.length < 2) throw new Error("Invalid image format for refinement");
    
    const base64Data = dataParts[1];
    const mimeType = base64ImageUrl.split(';')[0].split(':')[1] || 'image/png';

    const refinePrompt = `You are an expert 2D cartoon illustrator. Please enhance this illustration by adding professional 2D cel-shading, deeper shadows, and sharp highlights to provide more depth.
    
    CRITICAL RULES:
    1. DO NOT change the character's pose, the background, or the core design.
    2. Maintain the EXACT flat 2D vector cartoon style.
    3. Use sharp, clean shadow edges (cel-shading).
    4. The output must be the refined version of the input image.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          { text: refinePrompt },
        ],
      },
    });

    const candidateParts = response.candidates?.[0]?.content?.parts || [];
    for (const part of candidateParts) {
      if (part.inlineData) {
        const mime = part.inlineData.mimeType || 'image/png';
        return `data:${mime};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data found in refinement response");
  });
};

/**
 * Suggests creative prompt ideas for the mascot.
 */
export const suggestPrompts = async (): Promise<{ suggestions: PromptSuggestion[] }> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Generate 6 creative and funny prompt ideas for a meme coin mascot named '$CHAD' who is a muscular green bearded guy. Categorize them into 'Action', 'Crypto', 'Luxury', or 'Funny'. Focus on 2D cartoonish scenarios. Provide short titles and descriptive prompts.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  prompt: { type: Type.STRING },
                  category: { 
                    type: Type.STRING,
                    description: "Category of the suggestion: Action, Crypto, Luxury, or Funny"
                  }
                },
                required: ["title", "prompt", "category"]
              }
            }
          },
          required: ["suggestions"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from Gemini");
    
    return JSON.parse(text) as { suggestions: PromptSuggestion[] };
  });
};
