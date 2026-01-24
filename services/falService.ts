// Safe process access helper
const getEnv = (key: string) => {
  if (typeof window !== 'undefined' && (window as any).process?.env) {
    return (window as any).process.env[key];
  }
  return undefined;
};

export const enhanceWithFal = async (imageBase64: string, onStatusUpdate?: (status: string) => void): Promise<string[]> => {
  let FAL_KEY = getEnv('FAL_KEY');
  
  // Fallback to local storage if available
  if (!FAL_KEY && typeof window !== 'undefined') {
    FAL_KEY = localStorage.getItem('FAL_KEY') || undefined;
  }
  
  if (!FAL_KEY) {
    throw new Error("MISSING_FAL_KEY");
  }

  try {
    onStatusUpdate?.("Initializing Fal.ai session...");

    // 1. Submit Request to Queue
    onStatusUpdate?.("Uploading image to Fal.ai...");
    const submitResponse = await fetch("https://queue.fal.run/fal-ai/drct-super-resolution", {
      method: "POST",
      headers: {
        "Authorization": `Key ${FAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: imageBase64,
        steps: 20 // Optimal default for DRCT
      }),
    });

    if (!submitResponse.ok) {
        const err = await submitResponse.json().catch(() => ({}));
        throw new Error(err.detail || `Fal API Error: ${submitResponse.statusText}`);
    }

    const { request_id } = await submitResponse.json();

    // 2. Poll for Results
    onStatusUpdate?.("Job queued...");
    const startTime = Date.now();
    const TIMEOUT = 180000; // 3 minutes

    while (Date.now() - startTime < TIMEOUT) {
      const statusResponse = await fetch(`https://queue.fal.run/fal-ai/drct-super-resolution/requests/${request_id}`, {
        headers: { "Authorization": `Key ${FAL_KEY}` }
      });
      
      const statusJson = await statusResponse.json();
      
      if (statusJson.status === 'IN_QUEUE') {
          const pos = statusJson.queue_position ? ` (Position: ${statusJson.queue_position})` : '';
          onStatusUpdate?.(`Waiting in queue${pos}...`);
      } else if (statusJson.status === 'IN_PROGRESS') {
          const logs = statusJson.logs?.map((l: any) => l.message).join(' ') || '';
          if (logs.includes('Generating')) onStatusUpdate?.("Generating pixels...");
          else onStatusUpdate?.("Processing...");
      }
      
      if (statusJson.status === 'COMPLETED') {
        onStatusUpdate?.("Downloading result...");
        const imageUrl = statusJson.images?.[0]?.url;
        if (!imageUrl) throw new Error("No image URL returned from Fal.ai");
        
        // 3. Convert URL back to Base64 for app consistency
        const imageRes = await fetch(imageUrl);
        const blob = await imageRes.blob();
        
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        
        return [base64];
      }
      
      if (statusJson.status === 'FAILED') {
        throw new Error(statusJson.error || "Fal generation failed");
      }
      
      // Wait 1s before next poll
      await new Promise(r => setTimeout(r, 1000));
    }
    
    throw new Error("Fal generation timed out");

  } catch (error: any) {
    console.error("Fal Service Error:", error);
    // Propagate the specific missing key error if it was thrown above
    if (error.message === "MISSING_FAL_KEY") throw error;
    throw new Error(error.message || "Failed to process with Fal.ai");
  }
};