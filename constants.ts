
import { EnhancementType, AspectRatio } from './types';

export const ENHANCEMENT_PROMPTS: Record<EnhancementType, string> = {
  [EnhancementType.GENERAL]: "Enhance overall quality: improve sharpness, resolution, details, noise reduction, and contrast.",
  [EnhancementType.RESTORE]: "Restore image: fix scratches, tears, creases, and blurriness to look like a pristine modern photo.",
  [EnhancementType.COLORIZE]: "Colorize: Apply realistic, vibrant, and historically accurate colors to this black and white image.",
  [EnhancementType.LIGHTING]: "Fix lighting: Balance shadows and highlights, correct exposure, and apply studio-quality lighting.",
  [EnhancementType.CREATIVE]: "Creative stylization: Apply a cinematic look with dramatic lighting and color grading.",
  [EnhancementType.UPSCALE]: "Upscale: Generate a high-fidelity, high-resolution version with extreme sharpness and fine details.",
  [EnhancementType.VECTORIZE]: "Vectorize: Convert this image into a high-quality vector graphic style. Eliminate all blurriness, noise, and pixelation. Use sharp, clean, defined lines and solid, flat colors. The output should look like a professional HD SVG illustration with perfect edges and high definition clarity.",
  [EnhancementType.REMOVE_SUBJECT]: "Remove the main subject: Cleanly erase the foreground person or object and inpaint the background naturally.",
  [EnhancementType.REMOVE_TEXT]: "Remove text: Erase all visible text, subtitles, and logos. Inpaint the area to match the background texture perfectly.",
  [EnhancementType.REMOVE_BACKGROUND]: "Remove background: Keep the main subject sharp and replace the background with a clean, solid color or transparent look.",
  [EnhancementType.REMOVE_WATERMARK]: "Remove watermarks: Aggressively detect and remove all semi-transparent text, copyright patterns, digital stamps, and logos overlaying the image. Inpaint the obscured pixels to match the surrounding image texture seamlessly.",
  [EnhancementType.VARIATION]: "Create a new image inspired by this one, maintaining a similar artistic style, theme, and color scheme, but producing an original and distinct alternative. Do not just copy the image; reimagine it with a fresh composition.",
  [EnhancementType.EDIT]: "Execute the user's specific editing instruction precisely on the PROVIDED INPUT IMAGE. Modify ONLY what is requested (e.g., change object, change background, add element). Preserve the rest of the image's structure, lighting, and style exactly.",
  [EnhancementType.GENERATION]: "Generate a high-quality, photorealistic image based on the user's description. Pay close attention to lighting, texture, and composition.",
  
  // New Looks
  [EnhancementType.LOOK_BW]: "Cinematic black-and-white photo, full-frame camera, 85mm lens, f/1.8, shallow depth of field, low-key dramatic lighting, strong contrast, overhead and rim lighting, soft background bokeh, ISO 1000 with subtle film grain, moody editorial look, Ilford HP5 / Kodak Tri-X style, dark modern atmosphere.",
  [EnhancementType.LOOK_DARK]: "Cinematic full-frame camera, 85mm lens, f/1.8, shallow depth of field, low-key dramatic lighting, strong contrast, overhead and rim lighting, soft background bokeh, ISO 1000 with subtle film grain, moody editorial look, dark modern atmosphere.",
  [EnhancementType.LOOK_REALISM]: "Cinematic, moody, realism with soft dramatic lighting and strong contrast. Shallow depth of field with a subtle background blur, natural color grading leaning toward cool neutrals, and a film-like texture. Balanced symmetry and leading lines create a focused, editorial feel. Realistic skin tones, soft highlights, gentle shadows, and a modern, high-end photography."
};

export const ASPECT_RATIOS: { label: string; value: AspectRatio; description?: string }[] = [
  { label: 'Auto (Original)', value: AspectRatio.AUTO },
  { label: 'Square (1:1)', value: AspectRatio.SQUARE, description: 'Instagram Feed' },
  { label: 'Portrait (3:4)', value: AspectRatio.PORTRAIT, description: 'IG/FB Feed' },
  { label: 'Story/Reel (9:16)', value: AspectRatio.TALL, description: 'TikTok, Stories' },
  { label: 'YouTube (16:9)', value: AspectRatio.WIDE, description: 'Video, Thumbnail' },
  { label: 'Standard (4:3)', value: AspectRatio.LANDSCAPE, description: 'Classic' },
  { label: 'Custom', value: AspectRatio.CUSTOM, description: 'Set Dimensions' },
];

export const SEEDREAM_SIZE_MAPPING: Record<string, string> = {
  [AspectRatio.AUTO]: 'square_hd',
  [AspectRatio.SQUARE]: 'square_hd',
  [AspectRatio.PORTRAIT]: 'portrait_hd',
  [AspectRatio.LANDSCAPE]: 'landscape_hd',
  [AspectRatio.WIDE]: 'landscape_16_9_hd',
  [AspectRatio.TALL]: 'portrait_16_9_hd',
  [AspectRatio.CUSTOM]: 'square_hd'
};
