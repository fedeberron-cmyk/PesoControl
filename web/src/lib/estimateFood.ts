import { supabase } from './supabase'

export type FoodEstimate = {
  items: { name: string; portion?: string; grams?: number; kcal: number }[]
  total_kcal: number
  summary: string
}

export async function resizeImageToBase64(
  file: File,
  maxSide = 768
): Promise<{ base64: string; mimeType: string }> {
  const imageUrl = URL.createObjectURL(file)

  try {
    const image = await loadImage(imageUrl)
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight))
    const width = Math.max(1, Math.round(image.naturalWidth * scale))
    const height = Math.max(1, Math.round(image.naturalHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('No se pudo preparar la imagen')
    }

    context.drawImage(image, 0, 0, width, height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
    const [, base64 = ''] = dataUrl.split(',')

    return { base64, mimeType: 'image/jpeg' }
  } finally {
    URL.revokeObjectURL(imageUrl)
  }
}

export async function estimateFood(
  base64: string,
  mimeType: string,
  note?: string
): Promise<FoodEstimate> {
  const { data, error } = await supabase.functions.invoke<FoodEstimate>('estimate-food', {
    body: { imageBase64: base64, mimeType, note },
  })

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('Sin estimación')
  }

  return data
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('No se pudo cargar la imagen'))
    image.src = src
  })
}
