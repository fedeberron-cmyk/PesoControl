export interface FoodAnalysisItem {
  name: string;
  estimatedCalories: number;
  estimatedProteinG: number;
  estimatedCarbsG: number;
  estimatedFatG: number;
  estimatedFiberG: number;
  servingDescription: string;
}

export interface FoodAnalysisResult {
  items: FoodAnalysisItem[];
  confidence: 'high' | 'medium' | 'low';
}

export interface FoodVisionProvider {
  analyzeFoodPhoto(
    base64Image: string,
    mimeType: string,
    userNotes?: string
  ): Promise<FoodAnalysisResult>;
}

class GeminiFoodVision implements FoodVisionProvider {
  private apiKey: string;
  private model = 'gemini-2.0-flash';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async analyzeFoodPhoto(
    base64Image: string,
    mimeType: string,
    userNotes?: string
  ): Promise<FoodAnalysisResult> {
    const prompt = `Analiza esta foto de comida. Identifica cada alimento visible y estima las calorias y macronutrientes por porcion visible.

${userNotes ? `Notas del usuario: "${userNotes}"` : ''}

Responde EXCLUSIVAMENTE en formato JSON con esta estructura:
{
  "items": [
    {
      "name": "nombre del alimento",
      "estimatedCalories": numero,
      "estimatedProteinG": numero,
      "estimatedCarbsG": numero,
      "estimatedFatG": numero,
      "estimatedFiberG": numero,
      "servingDescription": "descripcion de la porcion visible"
    }
  ],
  "confidence": "high" | "medium" | "low"
}

Se preciso con las porciones visibles. Si no puedes identificar algo, indica confianza baja.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: base64Image } },
          ],
        }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('No response from Gemini');

    return JSON.parse(text) as FoodAnalysisResult;
  }
}

export function createFoodVisionProvider(): FoodVisionProvider {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
  if (!apiKey) throw new Error('EXPO_PUBLIC_GEMINI_API_KEY not set');
  return new GeminiFoodVision(apiKey);
}
