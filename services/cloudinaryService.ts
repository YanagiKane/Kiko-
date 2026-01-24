import { EnhancementConfig, EnhancementType } from "../types";

const CLOUD_NAME = 'dgq1vb4fr';
const API_KEY = '649914188144111';
const API_SECRET = 'J3Y3LTryKr7xjWA6g7fCWwXs19c';

// Helper to generate SHA-1 signature for signed uploads
async function generateSignature(params: Record<string, string>, secret: string) {
  const sortedKeys = Object.keys(params).sort();
  const stringToSign = sortedKeys.map(key => `${key}=${params[key]}`).join('&') + secret;
  
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-1', enc.encode(stringToSign));
  return Array.from(new Uint8Array(hash))
    .map(v => v.toString(16).padStart(2, '0'))
    .join('');
}

export const enhanceWithCloudinary = async (
  imageBase64: string,
  config: EnhancementConfig,
  onStatusUpdate?: (msg: string) => void
): Promise<string[]> => {
  try {
    // 1. Upload Image
    onStatusUpdate?.("Preparing upload...");
    const timestamp = Math.round(Date.now() / 1000).toString();
    const params = {
      timestamp: timestamp,
    };
    
    const signature = await generateSignature(params, API_SECRET);
    
    const formData = new FormData();
    formData.append('file', imageBase64);
    formData.append('api_key', API_KEY);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);

    onStatusUpdate?.("Uploading to Cloudinary...");
    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData
    });

    if (!uploadRes.ok) {
      throw new Error(`Cloudinary Upload Failed: ${uploadRes.statusText}`);
    }

    const uploadData = await uploadRes.json();
    const publicId = uploadData.public_id;

    // 2. Construct Transformation URL
    onStatusUpdate?.("Applying AI transformations...");
    // Map EnhancementTypes to Cloudinary transformations
    let transformations: string[] = [];
    
    // Always improve quality slightly by default unless doing heavy creative work
    if (!config.types.includes(EnhancementType.CREATIVE)) {
        transformations.push('q_auto:best'); // Highest quality auto compression
    }

    config.types.forEach(type => {
      switch (type) {
        case EnhancementType.GENERAL:
          transformations.push('e_improve'); // Auto-improve
          break;
        case EnhancementType.RESTORE:
          transformations.push('e_gen_restore'); // Generative Restore
          break;
        case EnhancementType.UPSCALE:
          transformations.push('e_upscale'); // AI Upscale
          break;
        case EnhancementType.VECTORIZE:
          transformations.push('e_cartoonify:line_strength:20:color_reduction:50'); // Vector-like effect
          break;
        case EnhancementType.REMOVE_BACKGROUND:
          transformations.push('e_background_removal'); // Remove Background
          break;
        case EnhancementType.COLORIZE:
          transformations.push('e_colorize'); // Colorize (if available in plan, otherwise fallback to art effect)
          break;
        case EnhancementType.REMOVE_SUBJECT:
           // Requires telling what to remove, simplistic assumption here or use generic object removal
           transformations.push('e_gen_remove:prompt_subject'); 
           break;
        case EnhancementType.LIGHTING:
           transformations.push('e_improve:outdoor'); 
           break;
        case EnhancementType.CREATIVE:
           transformations.push('e_art:incognito'); 
           break;
        default:
           break;
      }
    });
    
    if (transformations.length === 0) {
        transformations.push('e_improve');
    }

    // Join transformations with slash
    const transformationString = transformations.join('/');
    
    // Construct final URL
    // Format: https://res.cloudinary.com/<cloud_name>/image/upload/<transformations>/<public_id>
    const enhancedUrl = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transformationString}/${publicId}`;

    // 3. Fetch the result to return as Base64 (to maintain app consistency)
    // We fetch the blob to ensure the transformation is processed before returning
    onStatusUpdate?.("Downloading processed image...");
    const resultRes = await fetch(enhancedUrl);
    if (!resultRes.ok) throw new Error("Failed to fetch enhanced image from Cloudinary");
    
    const blob = await resultRes.blob();
    
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    return [base64];

  } catch (error: any) {
    console.error("Cloudinary Service Error:", error);
    throw new Error(error.message || "Failed to process with Cloudinary");
  }
};