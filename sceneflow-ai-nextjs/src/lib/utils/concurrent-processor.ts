/**
 * Concurrent Processor Utility
 * 
 * Processes an array of async tasks with controlled concurrency using a semaphore pattern.
 * Designed for batch operations like storyboard image generation where we want parallelism
 * without overwhelming API rate limits.
 */

export interface ConcurrentTask<T> {
  id: string | number
  execute: () => Promise<T>
}

export interface ConcurrentResult<T> {
  id: string | number
  status: 'fulfilled' | 'rejected'
  value?: T
  error?: Error
}

export interface ConcurrentProgressEvent<T> {
  type: 'start' | 'complete' | 'error' | 'batch-complete'
  taskId: string | number
  result?: T
  error?: Error
  completed: number
  total: number
  inProgress: number
  pending: number
}

export type ProgressCallback<T> = (event: ConcurrentProgressEvent<T>) => void

/**
 * Process an array of async tasks with controlled concurrency.
 * 
 * @param tasks - Array of tasks with id and execute function
 * @param concurrencyLimit - Maximum number of concurrent tasks (default: 3)
 * @param onProgress - Optional callback for progress updates
 * @param retryFailures - Whether to retry failed tasks once at the end (default: true)
 * @returns Array of results with status, value, and error for each task
 * 
 * @example
 * const results = await processWithConcurrency(
 *   scenes.map((scene, i) => ({
 *     id: i,
 *     execute: () => generateSceneImage(scene)
 *   })),
 *   3,
 *   (event) => console.log(`Progress: ${event.completed}/${event.total}`)
 * )
 */
export async function processWithConcurrency<T>(
  tasks: ConcurrentTask<T>[],
  concurrencyLimit: number = 3,
  onProgress?: ProgressCallback<T>,
  retryFailures: boolean = true
): Promise<ConcurrentResult<T>[]> {
  const results: Map<string | number, ConcurrentResult<T>> = new Map()
  const pendingTasks = [...tasks]
  const inProgressIds = new Set<string | number>()
  let completedCount = 0

  const emitProgress = (
    type: ConcurrentProgressEvent<T>['type'],
    taskId: string | number,
    result?: T,
    error?: Error
  ) => {
    if (onProgress) {
      onProgress({
        type,
        taskId,
        result,
        error,
        completed: completedCount,
        total: tasks.length,
        inProgress: inProgressIds.size,
        pending: pendingTasks.length
      })
    }
  }

  const executeTask = async (task: ConcurrentTask<T>): Promise<void> => {
    inProgressIds.add(task.id)
    emitProgress('start', task.id)

    try {
      const result = await task.execute()
      completedCount++
      results.set(task.id, { id: task.id, status: 'fulfilled', value: result })
      emitProgress('complete', task.id, result)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      results.set(task.id, { id: task.id, status: 'rejected', error })
      emitProgress('error', task.id, undefined, error)
    } finally {
      inProgressIds.delete(task.id)
    }
  }

  // Process tasks with controlled concurrency
  const processNextBatch = async (): Promise<void> => {
    const activeTasks: Promise<void>[] = []

    while (pendingTasks.length > 0 || activeTasks.length > 0) {
      // Start new tasks up to concurrency limit
      while (pendingTasks.length > 0 && inProgressIds.size < concurrencyLimit) {
        const task = pendingTasks.shift()!
        const taskPromise = executeTask(task).then(() => {
          // Remove from active tasks when done
          const index = activeTasks.indexOf(taskPromise)
          if (index > -1) activeTasks.splice(index, 1)
        })
        activeTasks.push(taskPromise)
      }

      // Wait for at least one task to complete before continuing
      if (activeTasks.length > 0) {
        await Promise.race(activeTasks)
      }
    }
  }

  await processNextBatch()

  // Retry failed tasks once if enabled
  if (retryFailures) {
    const failedTasks = tasks.filter(t => results.get(t.id)?.status === 'rejected')
    
    if (failedTasks.length > 0) {
      console.log(`[ConcurrentProcessor] Retrying ${failedTasks.length} failed tasks...`)
      
      // Reset for retry - don't count retries in completedCount
      pendingTasks.push(...failedTasks)
      
      // Process retries with same concurrency
      await processNextBatch()
    }
  }

  // Return results in original task order
  return tasks.map(t => results.get(t.id)!)
}

/**
 * Chunk an array into smaller arrays of specified size.
 * Useful for batch processing with size limits.
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize))
  }
  return chunks
}

/**
 * Create a delay promise for rate limiting between batches.
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Default concurrency limits based on operation type.
 * Can be extended based on subscription tier later.
 */
export const CONCURRENCY_DEFAULTS = {
  IMAGE_GENERATION: 3,
  AUDIO_GENERATION: 2,
  VIDEO_GENERATION: 2,
  API_CALLS: 5
} as const
