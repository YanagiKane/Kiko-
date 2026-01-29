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

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Optimize user prompt and generate negative prompt
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
      2. Create a "autoNegativePrompt": detailed list of elements to avoid, specifically tailored to preventing artifacts related to this specific edit (e.g., if adding hands, negative prompt should mention "malformed hands, extra fingers").
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
        safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' }
        ]
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
  imageConfig: any
): Promise<string> => {
    // Safety Settings - Applied strictly to prevent filtering
    const safetySettings = [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' }
    ];

    let lastError: any;
    const maxRetries = 3;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            // Apply backoff if retrying
            if (attempt > 0) {
                const backoffMs = Math.pow(2, attempt) * 1000;
                const jitter = Math.random() * 1000;
                await wait(backoffMs + jitter);
            }

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
                  // Track usage on success
                  incrementDailyUsage();
                  return `data:image/png;base64,${part.inlineData.data}`;
                }
              }
            }

            let errorMessage = "No image generated.";
            if (parts) {
                for (const part of parts) {
                    if (part.text) {
                        errorMessage = part.text;
                        break;
                    }
                }
            } else if (candidate?.finishReason) {
                errorMessage = `Generation failed. Reason: ${candidate.finishReason}`;
                if (candidate.finishReason === 'SAFETY') {
                    errorMessage += " (Safety filters blocked the request despite settings)";
                }
            }
            throw new Error(errorMessage);

        } catch (e: any) {
            lastError = e;
            const isRateLimit = e.message?.includes('429') || e.message?.includes('quota') || e.status === 429;
            const isServerOverload = e.message?.includes('503') || e.message?.includes('Overloaded') || e.status === 503;
            
            // Only retry on rate limits or server errors
            if ((isRateLimit || isServerOverload) && attempt < maxRetries) {
                console.warn(`Attempt ${attempt + 1} failed: ${e.message}. Retrying...`);
                continue;
            }
            
            // If it's a client error or max retries reached, throw immediately
            throw e;
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
    onStatusUpdate?.("Initializing...");
    
    // Check for API Key in localStorage first, then env
    const apiKey = getStoredApiKey() || process.env.API_KEY;

    if (!apiKey) {
        throw new Error("MISSING_API_KEY");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Clean base64 string if present
    const cleanBase64 = imageBase64 ? imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '') : '';
    
    const isVariation = config.types.includes(EnhancementType.VARIATION);
    const isEdit = config.types.includes(EnhancementType.EDIT);
    const isGeneration = config.types.includes(EnhancementType.GENERATION);
    
    let userPromptText = config.customPrompt || '';
    let negativePromptText = config.negativePrompt || '';
    const hasReference = !!config.referenceImage;
    const hasMask = !!config.maskImage;

    // Optimize Prompt (for complex tasks)
    if (userPromptText && (isEdit || isVariation || isGeneration)) {
        onStatusUpdate?.("Refining instructions...");
        const optimized = await optimizeUserPrompt(ai, userPromptText, hasReference);
        userPromptText = optimized.refinedPrompt;
        if (!negativePromptText) {
            negativePromptText = optimized.autoNegativePrompt;
        }
    }
    
    const instructions = config.types.map(t => ENHANCEMENT_PROMPTS[t]).join(" ");
    const userPromptSection = userPromptText ? ` User Instruction: ${userPromptText}` : '';
    
    let negativePromptSection = '';
    if (negativePromptText) {
        negativePromptSection = `\nNEGATIVE PROMPT (STRICTLY AVOID): ${negativePromptText}\nDo not include any of the elements listed in the negative prompt.`;
    }
    
    let finalPrompt = '';

    if (isGeneration) {
        finalPrompt = `
          You are an expert AI artist.
          
          TASK: Generate a high-quality image based on the following description: "${userPromptText}"
          
          ${hasReference ? 'REFERENCE IMAGE: Use the provided reference image as a style/composition guide.' : ''}
          
          GUIDELINES:
          1. Achieve photorealism or the specific requested style.
          2. Pay attention to lighting, texture, and composition.
          
          ${negativePromptSection}

          Output ONLY the generated image.
        `;
    } else if (isEdit) {
        if (!config.customPrompt) throw new Error("Please describe the edit you want to make.");
        
        let referenceInstruction = "";
        if (hasReference) {
            referenceInstruction = `
            REFERENCE IMAGE INSTRUCTIONS:
            - The provided reference image (Source Image) contains visual elements (style, object, or texture) that must be used for the edit.
            - Transfer characteristics from the reference image to the target area in the main input image.
            `;
        }

        let maskInstruction = "";
        if (hasMask) {
            maskInstruction = `
            MASK INSTRUCTIONS (CRITICAL):
            - A mask image has been provided.
            - WHITE pixels in the mask indicate the area to be EDITED or REPLACED.
            - BLACK/TRANSPARENT pixels in the mask indicate areas that MUST BE PRESERVED exactly as they are.
            - Apply the edit ONLY to the masked (white) area. Blend the edges seamlessly.
            `;
        }

        finalPrompt = `
          You are an expert professional photo editor using advanced inpainting and generative techniques.
          
          INPUTS:
          1. Main Input Image (The canvas to edit).
          ${hasReference ? '2. Reference Image (Source of style/content).' : ''}
          ${hasMask ? '3. Mask Image (Defines the edit region).' : ''}

          TASK: Execute the following edit on the INPUT IMAGE: "${userPromptText}"
          
          ${referenceInstruction}
          ${maskInstruction}

          STRICT GUIDELINES:
          1. Use the provided input image as the absolute source of truth for composition, lighting, and style (unless style transfer is requested).
          2. ONLY modify the specific elements mentioned in the instruction ${hasMask ? 'AND confined within the provided mask' : ''}. 
          3. Leave the rest of the image PIXEL-PERFECTLY identical to the original.
          4. Ensure any added or modified elements blend seamlessly with the existing lighting, shadows, and noise grain.
          5. High fidelity and photorealism are paramount.
          ${negativePromptSection}

          Output ONLY the edited image.
        `;
    } else if (isVariation) {
        finalPrompt = `
          You are an expert digital artist and photographer.
          
          TASK:
          Generate a completely new image that is strongly inspired by the provided input image.
          
          GUIDELINES:
          1. Maintain the same artistic style, mood, lighting, and color palette as the original.
          2. Keep the general theme and subject matter, but create a distinct and original composition.
          3. Do not simply copy or edit the original image. Reimagine it.
          
          SPECIFIC INSTRUCTIONS:
          ${instructions}
          ${userPromptSection}
          ${negativePromptSection}

          Output ONLY the generated image.
        `;
    } else {
        finalPrompt = `
          Perform the following image editing tasks:
          ${instructions}
          ${userPromptSection}
          
          Output ONLY the processed image. Maintain the visual integrity of areas not being edited.
        `;
    }

    const modelId = config.model;

    // Construct image config
    const imageConfig: any = {};
    if (config.aspectRatio === AspectRatio.CUSTOM && config.customWidth && config.customHeight) {
        imageConfig.aspectRatio = `${config.customWidth}:${config.customHeight}`;
    } else if (config.aspectRatio !== AspectRatio.AUTO) {
        imageConfig.aspectRatio = config.aspectRatio;
    }

    // Prepare Contents Payload
    const contentParts: any[] = [];
    
    // Only add input image if it exists (Enhancement/Edit modes)
    if (cleanBase64) {
        contentParts.push({
            inlineData: {
                mimeType: 'image/jpeg', 
                data: cleanBase64
            }
        });
    }

    if (config.referenceImage) {
        const cleanRef = config.referenceImage.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
        contentParts.push({
            inlineData: {
                mimeType: 'image/jpeg',
                data: cleanRef
            }
        });
    }

    if (config.maskImage) {
        const cleanMask = config.maskImage.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
        contentParts.push({
            inlineData: {
                mimeType: 'image/png', // Masks usually PNG for transparency support
                data: cleanMask
            }
        });
    }

    contentParts.push({ text: finalPrompt });
    const contents = { parts: contentParts };

    // Handle Multiple Images
    // If generation/edit/variation, allow multiple
    const count = (isEdit || isVariation || isGeneration) ? (config.imageCount || 1) : 1;
    
    onStatusUpdate?.(count > 1 ? `Generating ${count} variations...` : "Processing...");

    // Stagger requests to avoid Rate Limiting (429)
    const results: string[] = [];
    const errors: any[] = [];

    // Parallel execution with staggered start
    const promises = Array(count).fill(0).map(async (_, index) => {
        // Increased delay to 2000ms per index to ensure we respect rate limits
        if (index > 0) await wait(index * 2000);
        
        try {
            return await processSingleRequest(ai, modelId, contents, imageConfig);
        } catch (e: any) {
            console.warn(`Variation ${index + 1} failed:`, e.message);
            // Store error to throw if ALL fail
            errors.push(e);
            return null;
        }
    });

    const outcomes = await Promise.all(promises);
    
    // Filter out failed requests
    outcomes.forEach(img => {
        if (img) results.push(img);
    });

    if (results.length === 0 && errors.length > 0) {
        const firstError = errors[0];
        // Enhance error message if it's a quota issue
        if (firstError.message?.includes('429') || firstError.message?.includes('quota')) {
            throw new Error("Rate limit exceeded. Please wait a moment before trying again.");
        }
        throw firstError;
    }

    onStatusUpdate?.("Finalizing...");
    return results;
    
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Failed to process image.");
  }
};