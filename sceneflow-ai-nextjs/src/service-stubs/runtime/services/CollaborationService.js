exports.CollaborationService = {
  createSession: async ()=> ({ id: 'stub-session' }),
  generateShareLink: (id)=> `https://example.com/share/${id}`,
  getSessionStats: async ()=> ({ messages: 0 })
}
