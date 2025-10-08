exports.AIProviderFactory = {
  createAdapterWithRawCredentials: function(){ return { generate: async ()=> ({ status: 'OK', provider_job_id: 'stub' }) } }
}
