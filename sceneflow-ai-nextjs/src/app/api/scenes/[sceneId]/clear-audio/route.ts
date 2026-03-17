import { NextResponse } from 'next/server'

export async function POST(req: Request, { params }: { params: { sceneId: string } }) {
  const { sceneId } = params
  let body: any = {}
  try {
    body = await req.json()
  } catch (e) {
    // ignore - allow empty body
  }

  const fields: string[] = Array.isArray(body?.fields) ? body.fields : ['narration']

  const notes: string[] = []

  // Attempt to dynamically call any storage/db helpers if present. Do not fail
  // the request if they're not available — return a helpful note instead.
  try {
    // Try common helper locations (project may vary). Build-time bundlers
    // sometimes attempt to resolve static import strings even inside try/catch.
    // Use concatenation to avoid static analysis finding these paths.
    let storage: any = null
    let db: any = null
    try {
      const storagePath = '@' + '/lib/storage'
      // dynamic import; may fail if helper not present
      // eslint-disable-next-line no-eval
      storage = await (eval('import')(storagePath))
      notes.push('found @/lib/storage')
    } catch (e) {
      // noop
    }
    try {
      const dbPath = '@' + '/lib/db'
      // eslint-disable-next-line no-eval
      db = await (eval('import')(dbPath))
      notes.push('found @/lib/db')
    } catch (e) {
      // noop
    }

    // If we have a DB helper, attempt to clear narration-related fields on the
    // scene record and delete any referenced blobs via storage helper.
    if (db && db.getSceneById) {
      const scene = await db.getSceneById(sceneId)
      if (scene) {
        // If narrationUrl exists and we have a storage.delete helper, attempt delete
        const narrationUrl = scene.narrationUrl || scene.narrationAudio?.['en-US']?.url
        if (narrationUrl && storage && (storage.deleteBlob || storage.deleteFile)) {
          try {
            const deleteFn = storage.deleteBlob || storage.deleteFile
            await deleteFn(narrationUrl)
            notes.push('deleted narration blob')
          } catch (err) {
            notes.push('failed to delete blob')
          }
        }

        // Clear DB fields specified
        const updates: any = {}
        if (fields.includes('narration')) {
          updates.narration = null
          updates.narrationUrl = null
          updates.narrationDuration = null
        }
        if (Object.keys(updates).length > 0 && db.updateSceneById) {
          await db.updateSceneById(sceneId, updates)
          notes.push('updated scene record')
        }
      } else {
        notes.push('scene-not-found')
      }
    } else {
      notes.push('no-db-helper')
    }
  } catch (err) {
    // Catch-all — don't expose internals
    return NextResponse.json({ ok: false, error: 'server-error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, notes })
}
