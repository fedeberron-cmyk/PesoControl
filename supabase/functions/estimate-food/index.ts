const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type EstimateRequest = {
  imageBase64?: unknown
  mimeType?: unknown
  note?: unknown
}

type GeminiResponse = {
  candidates?: {
    content?: {
      parts?: {
        text?: unknown
      }[]
    }
  }[]
}

const geminiUrl =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return jsonResponse({}, 200)
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido' }, 405)
  }

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      return jsonResponse({ error: 'GEMINI_API_KEY no configurada' }, 500)
    }

    const body = (await req.json()) as EstimateRequest
    const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64 : ''
    const mimeType = typeof body.mimeType === 'string' ? body.mimeType : ''
    const note = typeof body.note === 'string' ? body.note.trim() : ''

    if (!imageBase64 || !mimeType) {
      return jsonResponse({ error: 'Falta la imagen' }, 400)
    }

    const prompt =
      "Eres un nutricionista. Estima los alimentos y las calorías de esta foto de comida. Sé realista, no optimista: si hay aceite, salsa o fritura, cuéntalo. Estima las porciones visibles. Para cada alimento da: name (corto, en español), portion (texto, ej. '150 g' o '1 taza') y kcal (entero). Devuelve total_kcal (suma entera de los items) y summary (frase corta del plato). Si la imagen NO es comida, devuelve items vacío, total_kcal 0 y summary 'No identifiqué comida'." +
      (note ? ` Nota del usuario: ${note}` : '')

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inlineData: { mimeType, data: imageBase64 } },
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              items: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    name: { type: 'STRING' },
                    portion: { type: 'STRING' },
                    kcal: { type: 'INTEGER' },
                  },
                  required: ['name', 'kcal'],
                },
              },
              total_kcal: { type: 'INTEGER' },
              summary: { type: 'STRING' },
            },
            required: ['items', 'total_kcal', 'summary'],
          },
        },
      }),
    })

    if (!geminiResponse.ok) {
      console.error('Gemini error', geminiResponse.status, await geminiResponse.text())
      return jsonResponse({ error: 'No pude estimar la foto' }, 502)
    }

    const geminiData = (await geminiResponse.json()) as GeminiResponse
    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text
    if (typeof text !== 'string') {
      console.error('Gemini response without text', geminiData)
      return jsonResponse({ error: 'No pude estimar la foto' }, 502)
    }

    const estimate = JSON.parse(text)
    return jsonResponse(estimate, 200)
  } catch (error) {
    console.error('estimate-food failed', error)
    return jsonResponse({ error: 'No pude estimar la foto' }, 502)
  }
})

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}
