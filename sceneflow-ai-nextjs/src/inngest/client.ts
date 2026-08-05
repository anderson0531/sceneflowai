import { Inngest } from 'inngest'

// Initialize Inngest client
export const inngest = new Inngest({
  id: 'sceneflow-ai',
  name: 'SceneFlow AI Production',
  ...(process.env.INNGEST_EVENT_KEY
    ? { eventKey: process.env.INNGEST_EVENT_KEY }
    : {}),
})

