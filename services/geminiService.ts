import { GoogleGenAI, Type } from "@google/genai";
import { EnhancementConfig, AspectRatio, EnhancementType } from "../types";
import { ENHANCEMENT_PROMPTS } from "../constants";

interface OptimizedPrompts {
  refinedPrompt: string;
  autoNegativePrompt: string;
}

const STORAGE_KEY = 'lynx_gemini_usage';
const API_KEY_STORAGE = 'GEMINI_API_KEY';

export const getDailyUsage = (): number => {
    if (typeof window === 'undefined') return 0;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return 0;
        const data = JSON.parse(raw);
        const today = new Date().toDateString();
        if (data.date !== today) {
            // Reset if new day
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, count: 0 }));
            return 0;
        }
        return data.count;
    } catch (e) {
        return 0;
    }
};

const incrementDailyUsage = () => {
    if (typeof window === 'undefined') return;
    const current = getDailyUsage();
    const today = new Date().toDateString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, count: current + 1 }));
    window.dispatchEvent(new Event('geminiUsageUpdated'));
};

export const getStoredApiKey = (): string => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem(API_KEY_STORAGE) || '';
    }
    return '';
};

export const setStoredApiKey = (key: string) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(API_KEY_STORAGE, key.trim());
    }
};

export const clearStoredApiKey = () => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(API_KEY_STORAGE);
    }
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Robust Prompt Optimization
const optimizeUserPrompt = async (ai: GoogleGenAI, rawPrompt: string, hasReference: boolean): Promise<OptimizedPrompts> => {
  try {
    const referenceContext = hasReference ? "The user has also uploaded a REFERENCE IMAGE to guide this edit." : "";

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are an expert AI prompt engineer for image editing. 
      
      Your task is to analyze the user's image editing instruction: "${rawPrompt}"
      ${referenceContext}
      
      1. Create a "refinedPrompt": Rewrite the instruction to be precise, descriptive, and optimized for a generative AI image editor. Focus on visual details, lighting, and texture. 
         If a reference image is mentioned, explicitly state "Use the provided reference image to..."
      2. Create a "autoNegativePrompt": detailed list of elements to avoid, specifically tailored to preventing artifacts related to this specific edit.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            refinedPrompt: { type: Type.STRING },
            autoNegativePrompt: { type: Type.STRING }
          },
          required: ["refinedPrompt", "autoNegativePrompt"]
        },
      }
    });

    const text = response.text;
    if (!text) return { refinedPrompt: rawPrompt, autoNegativePrompt: '' };

    return JSON.parse(text) as OptimizedPrompts;
  } catch (e) {
    console.warn("Prompt optimization failed, using original.", e);
    return { refinedPrompt: rawPrompt, autoNegativePrompt: '' };
  }
};

const processSingleRequest = async (
  ai: GoogleGenAI, 
  modelId: string, 
  contents: any, 
  imageConfig: any,
  onStatusUpdate?: (msg: string) => void,
  retries = 3
): Promise<string> => {
    
    // Safety Settings
    const safetySettings = [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' }
    ];

    let lastError: any;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await ai.models.generateContent({
              model: modelId,
              contents: contents,
              config: {
                imageConfig,
                safetySettings
              }
            });

            const candidate = response.candidates?.[0];
            const parts = candidate?.content?.parts;
            
            if (parts) {
              for (const part of parts) {
                if (part.inlineData && part.inlineData.data) {
                  incrementDailyUsage();
                  return `data:image/png;base64,${part.inlineData.data}`;
                }
              }
            }

            // Extract detailed error if no image
            let errorMessage = "No image generated.";
            if (candidate?.finishReason) {
                errorMessage = `Finish Reason: ${candidate.finishReason}`;
                if (candidate.finishReason === 'SAFETY') errorMessage += " (Safety Block)";
            }
            throw new Error(errorMessage);

        } catch (e: any) {
            lastError = e;
            
            // Normalize error message
            let msg = e.message || '';
            if (typeof e === 'string') msg = e;
            if (e.error && e.error.message) msg = e.error.message;
            if (e.toString() === '[object Object]') msg = JSON.stringify(e);

            const status = e.status || 0;
            
            // Detection
            const isRateLimit = msg.includes('429') || status === 429 || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED');
            const isServerOverload = msg.includes('503') || status === 503 || msg.includes('Overloaded');

            if ((isRateLimit || isServerOverload) && attempt < retries) {
                // Smart Retry: Extract wait time from error message if available
                // e.g. "Please retry in 57.61s"
                let waitTime = 5000; // Default 5s
                
                const timeMatch = msg.match(/retry in ([\d\.]+)s/);
                if (timeMatch && timeMatch[1]) {
                     // Add slight buffer to the suggested wait time
                     waitTime = (parseFloat(timeMatch[1]) * 1000) + 1000;
                } else {
                     // Exponential backoff if no specific time
                     waitTime = Math.pow(2, attempt) * 4000; 
                }

                // Cap max wait to 65 seconds
                waitTime = Math.min(waitTime, 65000);

                console.warn(`Attempt ${attempt + 1}/${retries} failed. Retrying in ${Math.ceil(waitTime/1000)}s...`);
                onStatusUpdate?.(`Rate limited. Retrying in ${Math.ceil(waitTime/1000)}s...`);
                
                await wait(waitTime);
                continue;
            }
            
            // If it's a client error (400, 403, 404), fail immediately
            if (status >= 400 && status < 500 && status !== 429) {
                throw e;
            }
            
            // For other generic errors, standard retry
            if (attempt < retries) {
                 await wait(2000);
                 continue;
            }
        }
    }
    throw lastError;
};

export const enhanceImage = async (
  imageBase64: string,
  config: EnhancementConfig,
  onStatusUpdate?: (msg: string) => void
): Promise<string[]> => {
  try {
    onStatusUpdate?.("Authenticating...");
    
    // Check for API Key in localStorage first, then env
    const apiKey = getStoredApiKey() || process.env.API_KEY;

    if (!apiKey) {
        throw new Error("MISSING_API_KEY");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const cleanBase64 = imageBase64 ? imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '') : '';
    const isVariation = config.types.includes(EnhancementType.VARIATION);
    const isEdit = config.types.includes(EnhancementType.EDIT);
    const isGeneration = config.types.includes(EnhancementType.GENERATION);
    
    let userPromptText = config.customPrompt || '';
    let negativePromptText = config.negativePrompt || '';
    const hasReference = !!config.referenceImage;
    const hasMask = !!config.maskImage;

    // Optimize Prompt
    if (userPromptText && (isEdit || isVariation || isGeneration)) {
        onStatusUpdate?.("Optimizing prompt...");
        // We wrap this in a try/catch so prompt optimization failure doesn't block generation
        try {
            const optimized = await optimizeUserPrompt(ai, userPromptText, hasReference);
            userPromptText = optimized.refinedPrompt;
            if (!negativePromptText) negativePromptText = optimized.autoNegativePrompt;
        } catch (promptError) {
            console.warn("Prompt optimization skipped due to error", promptError);
        }
    }
    
    const instructions = config.types.map(t => ENHANCEMENT_PROMPTS[t]).join(" ");
    const userPromptSection = userPromptText ? ` User Instruction: ${userPromptText}` : '';
    const negativePromptSection = negativePromptText ? `\nNEGATIVE PROMPT: ${negativePromptText}` : '';
    
    let finalPrompt = '';

    if (isGeneration) {
        finalPrompt = `Generate a high-quality, photorealistic image: "${userPromptText}"\n${hasReference ? 'Use the reference image as a style guide.' : ''}${negativePromptSection}`;
    } else if (isEdit) {
        if (!config.customPrompt) throw new Error("Please describe the edit.");
        finalPrompt = `Edit this image: "${userPromptText}"\n${hasReference ? 'Use reference for style/content.' : ''}\n${hasMask ? 'Apply changes ONLY to the masked (white) area.' : 'Modify only the requested elements, keep the rest identical.'}${negativePromptSection}`;
    } else if (isVariation) {
        finalPrompt = `Create a variation of this image. Maintain style and composition but make it unique.\n${instructions}\n${userPromptSection}${negativePromptSection}`;
    } else {
        finalPrompt = `Enhance this image: ${instructions}\n${userPromptSection}`;
    }

    const modelId = config.model;

    const imageConfig: any = {};
    if (config.aspectRatio === AspectRatio.CUSTOM && config.customWidth && config.customHeight) {
        imageConfig.aspectRatio = `${config.customWidth}:${config.customHeight}`;
    } else if (config.aspectRatio !== AspectRatio.AUTO) {
        imageConfig.aspectRatio = config.aspectRatio;
    }

    // Construct Payload
    const contentParts: any[] = [];
    if (cleanBase64) contentParts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanBase64 }});
    if (config.referenceImage) {
        contentParts.push({ inlineData: { mimeType: 'image/jpeg', data: config.referenceImage.replace(/^data:image\/.*base64,/, '') }});
    }
    if (config.maskImage) {
        contentParts.push({ inlineData: { mimeType: 'image/png', data: config.maskImage.replace(/^data:image\/.*base64,/, '') }});
    }
    contentParts.push({ text: finalPrompt });
    const contents = { parts: contentParts };

    // Handle Multiple Images - SERIALIZED to prevent Rate Limits
    const count = (isEdit || isVariation || isGeneration) ? (config.imageCount || 1) : 1;
    const results: string[] = [];
    
    onStatusUpdate?.("Processing...");

    for (let i = 0; i < count; i++) {
        if (count > 1) onStatusUpdate?.(`Generating image ${i + 1} of ${count}...`);
        
        try {
            // Wait a bit between serial requests to be kind to the API
            if (i > 0) await wait(2000); 
            
            const result = await processSingleRequest(ai, modelId, contents, imageConfig, onStatusUpdate);
            if (result) results.push(result);
        } catch (e: any) {
            console.error(`Variation ${i + 1} failed:`, e);
            if (count === 1) throw e; // If single request fails, throw. If batch, continue.
        }
    }

    if (results.length === 0) throw new Error("All generation attempts failed. Please try again.");

    onStatusUpdate?.("Done!");
    return results;
    
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes("API_KEY")) {
        throw new Error("MISSING_API_KEY");
    }
    
    // Improved user-facing error message
    let displayMsg = error.message || "Failed to process image.";
    if (displayMsg.includes('429') || displayMsg.includes('quota') || displayMsg.includes('RESOURCE_EXHAUSTED')) {
         displayMsg = "Google API Daily Quota Exceeded. Please try again tomorrow or use a different API key.";
    }
    
    throw new Error(displayMsg);
  }
};