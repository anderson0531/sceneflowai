exports.VideoGenerationService = {
  getUserGenerationJobs: ()=> [],
  startStatusPolling: (_id, cb)=> { return ()=>{} },
  startGeneration: async (_u,_p,_dirs,_ctx,_settings)=> ({ generationId: 'g1', projectId: 'p1', overallStatus: 'queued', clips: [] }),
  startStitching: async ()=> ({ stitchId: 's1', status: 'processing', progress: 0, metadata: { totalClips: 0 } }),
  checkStitchingStatus: async ()=> ({ stitchId: 's1', status: 'completed', progress: 100, metadata: { totalClips: 0 }, final_video_url: '' })
}
