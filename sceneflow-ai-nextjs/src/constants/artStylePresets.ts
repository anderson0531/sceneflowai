export interface ArtStylePreset {
  id: string
  name: string
  description: string
  promptSuffix: string
  thumbnail: string
}

export const artStylePresets: ArtStylePreset[] = [
  {
    id: 'photorealistic',
    name: 'Photorealistic',
    description: 'Professional photography style',
    promptSuffix: 'photorealistic, professional photography, 8K resolution, studio lighting, sharp focus',
    thumbnail: '/icons/styles/photorealistic.png'
  },
  {
    id: 'anime-90s',
    name: 'Anime (90s)',
    description: 'Classic 90s anime style',
    promptSuffix: 'anime style, 90s anime, cel shading, vibrant colors',
    thumbnail: '/icons/styles/anime.png'
  },
  {
    id: 'pixar',
    name: 'Pixar Animation',
    description: '3D animated Pixar style',
    promptSuffix: 'Pixar animation style, 3D rendered, colorful, expressive',
    thumbnail: '/icons/styles/pixar.png'
  },
  {
    id: 'concept-art',
    name: 'Concept Art',
    description: 'Game/film concept art',
    promptSuffix: 'concept art style, detailed illustration, professional digital art',
    thumbnail: '/icons/styles/concept.png'
  },
  {
    id: 'ghibli',
    name: 'Ghibli-esque',
    description: 'Studio Ghibli inspired',
    promptSuffix: 'Studio Ghibli style, watercolor aesthetic, whimsical, hand-drawn animation',
    thumbnail: '/icons/styles/ghibli.png'
  },
  {
    id: 'comic-book',
    name: 'Comic Book',
    description: 'Comic book ink style',
    promptSuffix: 'comic book style, bold ink lines, halftone dots, pop art colors',
    thumbnail: '/icons/styles/comic.png'
  },
  {
    id: 'oil-painting',
    name: 'Oil Painting',
    description: 'Classical oil painting',
    promptSuffix: 'oil painting style, classical art, brushstrokes visible, rich colors',
    thumbnail: '/icons/styles/oil.png'
  },
  {
    id: 'digital-art',
    name: 'Digital Art',
    description: 'Modern digital illustration',
    promptSuffix: 'digital art, illustration, clean lines, vibrant colors',
    thumbnail: '/icons/styles/digital.png'
  },
  {
    id: 'watercolor',
    name: 'Watercolor',
    description: 'Soft watercolor painting',
    promptSuffix: 'watercolor painting, soft edges, flowing colors, artistic',
    thumbnail: '/icons/styles/watercolor.png'
  },
  {
    id: 'sketch',
    name: 'Sketch/Line Art',
    description: 'Pencil sketch style',
    promptSuffix: 'pencil sketch, line art, hand-drawn, detailed linework',
    thumbnail: '/icons/styles/sketch.png'
  }
]

export const shotTypes = [
  { value: 'full-body', label: 'Full body shot', promptText: 'Full body shot' },
  { value: 'portrait', label: 'Portrait (head and shoulders)', promptText: 'Portrait, head and shoulders' },
  { value: 'close-up', label: 'Close-up on face', promptText: 'Close-up on face' },
  { value: 'three-quarter', label: 'Three-quarter view', promptText: 'Three-quarter view' },
  { value: 'profile', label: 'Profile view', promptText: 'Profile view' },
  { value: 'action', label: 'Action pose', promptText: 'Dynamic action pose' },
]

