'use client'

import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Info, 
  X,
  Loader2,
  type LucideIcon
} from 'lucide-react'
import { 
  createContext, 
  useContext, 
  useState, 
  useCallback, 
  type ReactNode 
} from 'react'

// Toast types
export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading'

export interface Toast {
  id: string
  type: ToastType
  title: string
  description?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

// Toast icons
const toastIcons: Record<ToastType, LucideIcon> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
  loading: Loader2
}

// Toast colors
const toastColors: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    icon: 'text-emerald-400'
  },
  error: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    icon: 'text-red-400'
  },
  warning: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    icon: 'text-amber-400'
  },
  info: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    icon: 'text-blue-400'
  },
  loading: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    icon: 'text-purple-400'
  }
}

// Toast Context
interface ToastContextValue {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
  updateToast: (id: string, updates: Partial<Toast>) => void
  // Convenience methods
  success: (title: string, description?: string) => string
  error: (title: string, description?: string) => string
  warning: (title: string, description?: string) => string
  info: (title: string, description?: string) => string
  loading: (title: string, description?: string) => string
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string
      error: string
    }
  ) => Promise<T>
}

const ToastContext = createContext<ToastContextValue | null>(null)

// Toast Provider
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? (toast.type === 'loading' ? Infinity : 4000)
    }
    
    setToasts(prev => [...prev, newToast])

    // Auto-remove after duration (unless Infinity)
    if (newToast.duration !== Infinity) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, newToast.duration)
    }

    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const updateToast = useCallback((id: string, updates: Partial<Toast>) => {
    setToasts(prev =>
      prev.map(t => (t.id === id ? { ...t, ...updates } : t))
    )
  }, [])

  // Convenience methods
  const success = useCallback(
    (title: string, description?: string) =>
      addToast({ type: 'success', title, description }),
    [addToast]
  )

  const error = useCallback(
    (title: string, description?: string) =>
      addToast({ type: 'error', title, description }),
    [addToast]
  )

  const warning = useCallback(
    (title: string, description?: string) =>
      addToast({ type: 'warning', title, description }),
    [addToast]
  )

  const info = useCallback(
    (title: string, description?: string) =>
      addToast({ type: 'info', title, description }),
    [addToast]
  )

  const loading = useCallback(
    (title: string, description?: string) =>
      addToast({ type: 'loading', title, description }),
    [addToast]
  )

  const promise = useCallback(
    async <T,>(
      promiseToResolve: Promise<T>,
      messages: { loading: string; success: string; error: string }
    ): Promise<T> => {
      const id = addToast({ type: 'loading', title: messages.loading })
      
      try {
        const result = await promiseToResolve
        updateToast(id, { type: 'success', title: messages.success, duration: 4000 })
        setTimeout(() => removeToast(id), 4000)
        return result
      } catch (err) {
        updateToast(id, { type: 'error', title: messages.error, duration: 5000 })
        setTimeout(() => removeToast(id), 5000)
        throw err
      }
    },
    [addToast, updateToast, removeToast]
  )

  return (
    <ToastContext.Provider
      value={{
        toasts,
        addToast,
        removeToast,
        updateToast,
        success,
        error,
        warning,
        info,
        loading,
        promise
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

// Hook to use toast
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

// Toast Container
function ToastContainer({
  toasts,
  onRemove
}: {
  toasts: Toast[]
  onRemove: (id: string) => void
}) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
        ))}
      </AnimatePresence>
    </div>
  )
}

// Individual Toast
function ToastItem({
  toast,
  onRemove
}: {
  toast: Toast
  onRemove: (id: string) => void
}) {
  const colors = toastColors[toast.type]
  const Icon = toastIcons[toast.type]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'pointer-events-auto w-full rounded-xl border p-4 shadow-lg backdrop-blur-sm',
        colors.bg,
        colors.border
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn('flex-shrink-0 mt-0.5', colors.icon)}>
          <Icon
            className={cn(
              'w-5 h-5',
              toast.type === 'loading' && 'animate-spin'
            )}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sf-text-primary text-sm">
            {toast.title}
          </p>
          {toast.description && (
            <p className="text-sm text-sf-text-secondary mt-0.5">
              {toast.description}
            </p>
          )}
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="mt-2 text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors"
            >
              {toast.action.label}
            </button>
          )}
        </div>

        {/* Close button */}
        {toast.type !== 'loading' && (
          <button
            onClick={() => onRemove(toast.id)}
            className="flex-shrink-0 text-sf-text-secondary hover:text-sf-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  )
}

// Standalone toast function (for use outside React components)
let toastFn: ToastContextValue | null = null

export function setToastFunction(fn: ToastContextValue) {
  toastFn = fn
}

export const toast = {
  success: (title: string, description?: string) => toastFn?.success(title, description),
  error: (title: string, description?: string) => toastFn?.error(title, description),
  warning: (title: string, description?: string) => toastFn?.warning(title, description),
  info: (title: string, description?: string) => toastFn?.info(title, description),
  loading: (title: string, description?: string) => toastFn?.loading(title, description),
  promise: <T,>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string }
  ) => toastFn?.promise(promise, messages)
}

export default ToastProvider
