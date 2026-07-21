import { getLandingArtStyleThumbnail } from '@/config/landing/landingVisualMedia'

export interface ArtStylePreset {
  id: string
  name: string
  description: string
  promptSuffix: string
  thumbnail: string
}

function thumb(id: string, fallback: string): string {
  return getLandingArtStyleThumbnail(id) ?? fallback
}

/**
 * Ordered to lead with the looks most common in animatic/video production.
 * The art style is locked at the Blueprint and flows into the treatment, script,
 * and frame generation, so these presets should reflect real production targets.
 */
export const artStylePresets: ArtStylePreset[] = [
  {
    id: 'photorealistic',
    name: 'Cinematic Live-Action',
    description: 'Photorealistic, filmic lighting',
    promptSuffix: 'photorealistic, cinematic film still, professional cinematography, natural lighting, shallow depth of field, 8K, sharp focus',
    thumbnail: thumb('photorealistic', '/icons/styles/photorealistic.png'),
  },
  {
    id: 'cinematic-3d',
    name: 'Cinematic 3D / CGI',
    description: 'Rendered 3D feature-film look',
    promptSuffix: 'cinematic 3D render, CGI animation, physically based rendering, volumetric lighting, subsurface scattering, feature film quality',
    thumbnail: thumb('pixar', '/icons/styles/pixar.png'),
  },
  {
    id: 'pixar',
    name: '3D Animation (Pixar-style)',
    description: 'Stylized 3D animated feature',
    promptSuffix: 'Pixar animation style, 3D rendered, colorful, expressive characters, soft global illumination',
    thumbnail: thumb('pixar', '/icons/styles/pixar.png'),
  },
  {
    id: 'anime-90s',
    name: 'Anime',
    description: 'Cel-shaded anime style',
    promptSuffix: 'anime style, cel shading, vibrant colors, expressive line work',
    thumbnail: thumb('anime-90s', '/icons/styles/anime.png'),
  },
  {
    id: 'ghibli',
    name: 'Ghibli-esque',
    description: 'Hand-drawn, painterly animation',
    promptSuffix: 'Studio Ghibli style, watercolor aesthetic, whimsical, hand-drawn animation',
    thumbnail: thumb('ghibli', '/icons/styles/ghibli.png'),
  },
  {
    id: 'comic-book',
    name: 'Comic Book',
    description: 'Bold ink, graphic-novel look',
    promptSuffix: 'comic book style, bold ink lines, halftone dots, pop art colors',
    thumbnail: thumb('comic-book', '/icons/styles/comic.png'),
  },
  {
    id: 'concept-art',
    name: 'Concept Art',
    description: 'Cinematic game/film concept art',
    promptSuffix: 'concept art style, detailed illustration, dramatic lighting, professional digital art',
    thumbnail: thumb('concept-art', '/icons/styles/concept.png'),
  },
  {
    id: 'flat-vector',
    name: 'Flat Vector / Motion Graphics',
    description: 'Clean vector look for explainers',
    promptSuffix: 'flat vector illustration, motion graphics style, clean geometric shapes, bold flat colors, minimal shading, explainer video aesthetic',
    thumbnail: thumb('digital-art', '/icons/styles/vector.png'),
  },
  {
    id: 'storyboard',
    name: 'Storyboard / Animatic',
    description: 'Rough greyscale storyboard frames',
    promptSuffix: 'storyboard sketch, rough greyscale line drawing, animatic frame, gestural pencil strokes, quick concept sketch',
    thumbnail: thumb('sketch', '/icons/styles/storyboard.png'),
  },
  {
    id: 'digital-art',
    name: 'Digital Art',
    description: 'Modern digital illustration',
    promptSuffix: 'digital art, illustration, clean lines, vibrant colors',
    thumbnail: thumb('digital-art', '/icons/styles/digital.png'),
  },
  {
    id: 'watercolor',
    name: 'Watercolor',
    description: 'Soft watercolor painting',
    promptSuffix: 'watercolor painting, soft edges, flowing colors, artistic',
    thumbnail: thumb('watercolor', '/icons/styles/watercolor.png'),
  },
  {
    id: 'sketch',
    name: 'Sketch / Line Art',
    description: 'Pencil sketch style',
    promptSuffix: 'pencil sketch, line art, hand-drawn, detailed linework',
    thumbnail: thumb('sketch', '/icons/styles/sketch.png'),
  },
  {
    id: 'oil-painting',
    name: 'Oil Painting',
    description: 'Classical oil painting',
    promptSuffix: 'oil painting style, classical art, brushstrokes visible, rich colors',
    thumbnail: thumb('oil-painting', '/icons/styles/oil.png'),
  },
]

export const shotTypes = [
  { value: 'full-body', label: 'Full body shot', promptText: 'Full body shot' },
  { value: 'portrait', label: 'Portrait (head and shoulders)', promptText: 'Portrait, head and shoulders' },
  { value: 'close-up', label: 'Close-up on face', promptText: 'Close-up on face' },
  { value: 'three-quarter', label: 'Three-quarter view', promptText: 'Three-quarter view' },
  { value: 'profile', label: 'Profile view', promptText: 'Profile view' },
  { value: 'action', label: 'Action pose', promptText: 'Dynamic action pose' },
]
