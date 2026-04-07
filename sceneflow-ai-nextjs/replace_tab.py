import re

with open('src/components/vision/ScriptReviewModal.tsx', 'r') as f:
    content = f.read()

start_marker = "{activeTab === 'recommendations' && ("
end_marker = "{/* Cinematic Elements Tab */}"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Could not find markers")
    exit(1)

new_tab_content = """{activeTab === 'recommendations' && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <ListChecks className="w-5 h-5 text-purple-600" />
                          Scene Breakdown
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {sceneAnalysis.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            No scene analysis available.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {sceneAnalysis.map((scene, index) => (
                              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
                                <div className="flex items-start justify-between mb-3">
                                  <div>
                                    <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                      <span className="bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded text-sm">
                                        Scene {scene.sceneNumber}
                                      </span>
                                      {scene.sceneHeading}
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 italic">
                                      {scene.notes}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="flex flex-col items-end">
                                      <span className={`text-lg font-bold ${scene.score >= 80 ? 'text-green-600' : 'text-amber-600'}`}>
                                        {scene.score}
                                      </span>
                                      <span className="text-[10px] text-gray-500 uppercase">Score</span>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Metrics */}
                                <div className="flex flex-wrap gap-2 mb-3">
                                  <Badge variant="outline" className="text-xs bg-white dark:bg-gray-900">
                                    Pacing: <span className="ml-1 capitalize">{scene.pacing}</span>
                                  </Badge>
                                  <Badge variant="outline" className="text-xs bg-white dark:bg-gray-900">
                                    Tension: <span className="ml-1 capitalize">{scene.tension}</span>
                                  </Badge>
                                  <Badge variant="outline" className="text-xs bg-white dark:bg-gray-900">
                                    Visual: <span className="ml-1 capitalize">{scene.visualPotential}</span>
                                  </Badge>
                                </div>
                                
                                {/* Specific Recommendations */}
                                {scene.recommendations && scene.recommendations.length > 0 && (
                                  <div className="bg-white dark:bg-gray-900 rounded-md p-3 border border-purple-100 dark:border-purple-900/30">
                                    <h4 className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-2 uppercase tracking-wider">Recommendations</h4>
                                    <ul className="space-y-1">
                                      {scene.recommendations.map((rec, rIdx) => (
                                        <li key={rIdx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                                          <span className="text-purple-500 mt-0.5">•</span>
                                          <span>{rec}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                """

content = content[:start_idx] + new_tab_content + content[end_idx:]

with open('src/components/vision/ScriptReviewModal.tsx', 'w') as f:
    f.write(content)

print("Replaced tab successfully")
