type Handler = (payload: any) => Promise<any>

const functions: Record<string, Handler> = {}

export const inngest = {
  createFunction(def: { id: string }, _trigger: any, handler: Handler) {
    functions[def.id] = handler
    return def.id
  },
  async trigger(id: string, payload: any) {
    const fn = functions[id]
    if (!fn) throw new Error(`Function not found: ${id}`)
    return await fn(payload)
  }
}
