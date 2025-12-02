import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { AnalysisResult } from '../types';
import { performLocalAnalysis } from './localAnalysis';

// Helper for exponential backoff retry
async function retryOperation<T>(operation: () => Promise<T>, retries: number = 2, delay: number = 1000): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries <= 0) throw error;
    console.warn(`Operation failed, retrying in ${delay}ms...`, error);
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryOperation(operation, retries - 1, delay * 2);
  }
}

export const analyzeConfigFile = async (
  fileName: string,
  hexPreview: string,
  textPreview: string,
  signature: string,
  artifacts: string[],
  userApiKey?: string // Now mandatory for Cloud Analysis
): Promise<AnalysisResult> => {
  
  // 1. CHECK FOR API KEY
  // If no key is provided, skip Cloud AI entirely and go straight to Local Engine.
  if (!userApiKey || userApiKey.trim() === '') {
      console.log("No API Key provided. Switching to Local Forensic Engine.");
      return await performLocalAnalysis(fileName, signature, artifacts);
  }

  // Define Prompt for AI - ELITE FORENSIC MODE
  const prompt = `
    ROLE: Elite Forensic Cryptanalyst & Reverse Engineer.
    MISSION: Deconstruct the provided binary file data to uncover hidden configurations, credentials, metadata, and obfuscated payloads. 
    You are a "Universal Forensic Tool". Your analysis must be deep, aggressive, and highly technical.
    
    TARGET FILE: ${fileName}
    DETECTED SIGNATURE: ${signature}
    
    --- DETECTED ARTIFACTS (Scanned via Regex) ---
    ${artifacts.length > 0 ? artifacts.join('\n') : "No obvious cleartext artifacts found via regex. Rely on deep text inspection."}
    
    --- RAW STRING DUMP (First 4kb) ---
    ${textPreview.substring(0, 4000)}
    
    --- INSTRUCTIONS ---
    1. **DEEP DECODING**:
       - Look for strings that appear to be Base64, Hex, or Rot13 encoded within the "RAW STRING DUMP". Decode them mentally.
       - If you find a VPN config (vmess://, trojan://, etc.), DECODE IT fully into a readable JSON format.
       - If the file is an image/video, extract EXIF data (Date, Camera, Software).
       - If the file is an executable, extract internal paths, API keys, or compiler info.
    
    2. **STRICT EXTRACTION (NO HALLUCINATIONS)**:
       - **DO NOT** use placeholders like "[Insert IP Here]". 
       - **DO NOT** invent values. If a field is missing, say "UNKNOWN".
       - **DO** populate the 'decryptedSegments' array with *actual* data found in the artifacts or decoded from the raw dump.
       - If you find a Proxy IP, Port, or Password, list it explicitly.
    
    3. **OUTPUT FORMAT**: Return ONLY valid JSON.
    
    REQUIRED JSON STRUCTURE:
    {
      "fileType": "Precise identification (e.g. 'HTTP Injector Config (Obfuscated)', 'Canon Raw Image', 'Malicious Script')",
      "encryptionMethod": "Analysis of protection (e.g. 'AES-256 with Salt', 'Base64 Obfuscation', 'None')",
      "extractedMetadata": { "Key": "Value" }, 
      "decryptedSegments": [
        "RECOVERED: 104.22.1.5:8080 (Potential Proxy)",
        "RECOVERED: user@example.com (Email)",
        "DECODED PAYLOAD: GET http://bug.com HTTP/1.1..."
      ],
      "aiInsight": "A detailed professional forensic report. Explain exactly what the file is, how it's protected, and list every single piece of usable intelligence extracted. Mention if it contains VPN credentials, location data, or author info.",
      "structure": "Technical breakdown (e.g., Header -> Encrypted Blob -> Footer)"
    }
  `;

  try {
    // Initialize Cloud AI with User Key
    const activeAi = new GoogleGenAI({ apiKey: userApiKey });

    // Wrap API call in retry logic
    const response = await retryOperation<GenerateContentResponse>(() => activeAi.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    }));

    let text = response.text;
    if (!text) throw new Error("No response from AI");

    // AGGRESSIVE SANITIZATION
    text = text.replace(/```json/g, '').replace(/```/g, '');
    
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1) {
        text = text.substring(firstBrace, lastBrace + 1);
    } else {
        throw new Error("Invalid JSON structure in AI response");
    }

    // Add a flag to indicate Cloud source
    const result = JSON.parse(text) as AnalysisResult;
    result.aiInsight = "[SOURCE: CLOUD AI - ELITE FORENSIC MODE] " + result.aiInsight;
    return result;

  } catch (error: any) {
    console.warn("Gemini Analysis Failed (or Key Invalid), Switching to Local Engine:", error);
    
    // FALLBACK TO LOCAL ANALYSIS
    // This ensures the app works even if the API quota is hit or internet is down.
    return await performLocalAnalysis(fileName, signature, artifacts);
  }
};

export const generateAiPayload = async (
    host: string,
    method: string,
    userApiKey: string
): Promise<string> => {
    const prompt = `
      Generate a working, sophisticated HTTP Injector Payload.
      Target Host (Bug Host): ${host}
      HTTP Method: ${method}
      
      Requirements:
      1. Use common injection techniques (CRLF, Split, Front Query).
      2. Ensure headers like Keep-Alive and User-Agent are present.
      3. Return ONLY the raw payload string. No explanations.
    `;

    try {
        const activeAi = new GoogleGenAI({ apiKey: userApiKey });
        const response = await activeAi.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        return response.text || "AI_GENERATION_FAILED";
    } catch (e) {
        throw new Error("AI Payload Generation Failed");
    }
};