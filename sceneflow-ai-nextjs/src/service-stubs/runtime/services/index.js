// Runtime stubs used in production build when real services are not bundled

exports["ai-providers/AIProviderFactory"] = {
  AIProviderFactory: {
    createAdapterWithRawCredentials: function(){ return { generate: async ()=> ({ status: 'OK', provider_job_id: 'stub' }) } }
  }
}

exports["EncryptionService"] = { EncryptionService: { decrypt: (s)=> s } }
exports["VideoGenerationGateway"] = { videoGenerationGateway: {} }

exports["DOL/DOLDatabaseService"] = { dolDatabaseService: { getDOLAnalytics: async ()=>({ models: [], templates: [] }) } }
