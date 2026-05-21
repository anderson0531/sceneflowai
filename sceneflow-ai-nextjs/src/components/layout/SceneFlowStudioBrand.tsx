import Link from 'next/link'
import { cn } from '@/lib/utils'

type Props = {
  /** When set, the brand is a link (e.g. `/` on public pages, `/dashboard` in the app). */
  href?: string
  className?: string
  /** Text color classes for the wordmark (defaults to app header light/dark). */
  nameClassName?: string
}

function LogoMark() {
  return (
    <div className="w-9 h-9 bg-gray-100 dark:bg-sf-surface-light rounded-lg flex items-center justify-center shrink-0">
      <div className="w-5 h-5 bg-sf-primary rounded-md flex items-center justify-center">
        <div className="w-2.5 h-2.5 bg-white dark:bg-sf-background rounded-sm" />
      </div>
    </div>
  )
}

function StudioWordmark({ className }: { className?: string }) {
  return (
    <span
      translate="no"
      className={cn(
        'app-name-text font-bold text-lg md:text-xl tracking-tight flex items-baseline gap-1 leading-none',
        className
      )}
    >
      <span>SceneFlow</span> <span className="text-sf-primary">AI</span>{' '}
      <span className="text-gray-500 dark:text-gray-400 font-medium text-sm md:text-base">Studio</span>
    </span>
  )
}

export function SceneFlowStudioBrand({ href, className, nameClassName }: Props) {
  const content = (
    <>
      <LogoMark />
      <StudioWordmark
        className={cn('text-gray-900 dark:text-white', nameClassName)}
      />
    </>
  )

  const rootClass = cn('flex items-center gap-2.5 group', className)

  if (href) {
    return (
      <Link href={href} className={rootClass}>
        {content}
      </Link>
    )
  }

  return <div className={rootClass}>{content}</div>
}
