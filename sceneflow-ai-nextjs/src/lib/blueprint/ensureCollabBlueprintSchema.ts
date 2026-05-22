import { sequelize } from '@/config/database'
import CollabBlueprintFeedback from '@/models/CollabBlueprintFeedback'

let ensurePromise: Promise<void> | null = null

/**
 * Creates `collab_blueprint_feedback` when missing (prod DBs created before this model shipped).
 */
export async function ensureCollabBlueprintFeedbackTable(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await sequelize.authenticate()
      await CollabBlueprintFeedback.sync({ alter: false })
    })().catch((err) => {
      ensurePromise = null
      throw err
    })
  }
  await ensurePromise
}
