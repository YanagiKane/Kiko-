import { AspectRatio } from "../types";
import { SEEDREAM_SIZE_MAPPING } from "../constants";

// Safe process access
const getEnv = (key: string) => {
  if (typeof window !== 'undefined' && (window as any).process?.env) {
    return (window as any).process.env[key];
  }
  return undefined;
};

const KIE_API_KEY = getEnv('KIE_API_KEY') || 'c699af04a5883441059e031867f032f1';
const API_BASE_URL = 'https://api.kie.ai/api/v1/jobs';

interface SeedreamConfig {
  prompt: string;
  aspectRatio: AspectRatio;
  resolution: string; // '1K', '2K', '4K'
}

export const generateImageWithSeedream = async (
  config: SeedreamConfig,
  onStatusUpdate?: (status: string) => void
): Promise<string> => {
  if (!KIE_API_KEY) {
    throw new Error("Missing Kie.ai API Key");
  }

  try {
    // 1. Create Task
    onStatusUpdate?.("Sending prompt to Seedream V4...");
    
    const size = SEEDREAM_SIZE_MAPPING[config.aspectRatio] || 'square_hd';
    
    const createResponse = await fetch(`${API_BASE_URL}/createTask`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KIE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "bytedance/seedream-v4-text-to-image",
        input: {
          prompt: config.prompt,
          image_size: size,
          image_resolution: config.resolution || '1K',
          max_images: 1
        }
      })
    });

    if (!createResponse.ok) {
      const errText = await createResponse.text();
      throw new Error(`Failed to create task: ${createResponse.status} ${errText}`);
    }

    const createData = await createResponse.json();
    console.log("Create Task Response:", createData);
    
    // Validate response structure (Allow code 0 or 200)
    const isSuccessCode = createData.code === 0 || createData.code === 200;
    if (!isSuccessCode || !createData.data?.id) {
        throw new Error(createData.msg || `Invalid response (Code: ${createData.code})`);
    }

    const taskId = createData.data.id;
    onStatusUpdate?.("Generation queued (Task ID: " + taskId + ")...");

    // 2. Poll for Status
    const POLL_INTERVAL = 2000; // 2 seconds
    const MAX_ATTEMPTS = 60; // 2 minutes max
    let attempts = 0;

    while (attempts < MAX_ATTEMPTS) {
      attempts++;
      
      const pollResponse = await fetch(`${API_BASE_URL}/recordInfo?taskId=${taskId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${KIE_API_KEY}`,
        }
      });

      if (!pollResponse.ok) {
        // If network error, wait and try again
        await new Promise(r => setTimeout(r, POLL_INTERVAL));
        continue;
      }

      const pollData = await pollResponse.json();
      
      // Allow code 0 or 200
      const isPollSuccessCode = pollData.code === 0 || pollData.code === 200;
      if (!isPollSuccessCode) {
         throw new Error(pollData.msg || `Error polling status (Code: ${pollData.code})`);
      }

      const status = pollData.data?.status;

      if (status === 'success') {
         onStatusUpdate?.("Download complete. Processing...");
         // Extract Image URL
         // Assuming resultJson is a JSON string inside the data
         let result = pollData.data.resultJson;
         
         // Parse if it's a string, otherwise use directly
         if (typeof result === 'string') {
             try {
                 result = JSON.parse(result);
             } catch (e) {
                 console.error("Failed to parse resultJson", e);
             }
         }

         console.log("Seedream Result:", result);

         // The prompt implies "extract image URL from resultJson". 
         // Standard Seedream V4 structure usually puts it in `images` array containing URLs.
         // Sometimes it might be directly in result if the structure varies.
         const imageUrl = result?.images?.[0] || result?.image_url || (typeof result === 'string' && result.startsWith('http') ? result : null);
         
         if (!imageUrl) {
             throw new Error("No image URL found in success response");
         }

         // Convert to Base64 to maintain consistency with app internal flow
         // This avoids CORS issues on the <img /> tag if the provider doesn't set headers
         onStatusUpdate?.("Fetching final image...");
         return await urlToBase64(imageUrl);

      } else if (status === 'failed') {
         throw new Error(pollData.data?.failReason || "Image generation failed.");
      } else {
         // queueing or running
         onStatusUpdate?.(`Dreaming... (${status})`);
         await new Promise(r => setTimeout(r, POLL_INTERVAL));
      }
    }

    throw new Error("Generation timed out");

  } catch (error: any) {
    console.error("Seedream API Error:", error);
    throw new Error(error.message || "Failed to generate image with Seedream");
  }
};

// Helper to convert URL to Base64 to prevent Cross-Origin issues in Canvas/Img
async function urlToBase64(url: string): Promise<string> {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch image data");
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.error("Base64 conversion failed", e);
        // Fallback to returning URL if CORS blocks it, though this might cause display issues on canvas
        return url;
    }
}