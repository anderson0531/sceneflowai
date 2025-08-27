import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import { TemplateSchema } from '@/types/templates'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const awaited = await context.params
    const segments = Array.isArray(awaited?.path)
      ? awaited.path
      : []

    if (segments.length === 0) {
      return NextResponse.json({ error: 'Template path is required' }, { status: 400 })
    }

    const relativePath = segments.join('/')
    const templatePath = join(process.cwd(), 'src', 'templates', relativePath)

    const fileContents = readFileSync(templatePath, 'utf-8')
    const json = JSON.parse(fileContents)
    const validated = TemplateSchema.parse(json)

    return NextResponse.json(validated)
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }
    console.error('Error loading template:', error)
    return NextResponse.json({ error: 'Failed to load template' }, { status: 500 })
  }
}


