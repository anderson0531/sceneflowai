import { NextRequest, NextResponse } from 'next/server'
import { saveCharacterAttributes, syncCharactersFromTreatment } from '../../../../lib/character/persistence'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { projectId, characterName, attributes, syncFromTreatment } = await request.json()

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }

    // If sync requested, sync all characters from treatment
    if (syncFromTreatment) {
      await syncCharactersFromTreatment(projectId)
      return NextResponse.json({ success: true, message: 'Characters synced from treatment' })
    }

    // Otherwise save specific character
    if (!characterName) {
      return NextResponse.json({ error: 'Character name required' }, { status: 400 })
    }

    if (!attributes || typeof attributes !== 'object') {
      return NextResponse.json({ error: 'Character attributes required' }, { status: 400 })
    }

    await saveCharacterAttributes(projectId, characterName, attributes)

    return NextResponse.json({ 
      success: true, 
      message: `Character ${characterName} saved successfully` 
    })
  } catch (error: any) {
    console.error('[Character Save] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to save character', 
      details: error?.message || String(error)
    }, { status: 500 })
  }
}

