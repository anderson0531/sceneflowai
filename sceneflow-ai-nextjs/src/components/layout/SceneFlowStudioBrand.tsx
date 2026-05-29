import Image from 'next/image'
import Link from 'next/link'
import { BRAND, getBadgeSize, type BrandVariant } from '@/config/brand'
import { cn } from '@/lib/utils'

type Props = {
  /** When set, the brand is a link (e.g. `/` on public pages, `/dashboard` in the app). */
  href?: string
  className?: string
  /** Text color classes for the SceneFlow + Studio portions */
  nameClassName?: string
  variant?: BrandVariant
  /** Hide wordmark (badge only) */
  showWordmark?: boolean
}

function LogoBadge({ variant }: { variant: BrandVariant }) {
  const { width, height } = getBadgeSize(variant)

  return (
    <Image
      src={BRAND.badge.src}
      srcSet={`${BRAND.badge.src} 1x, ${BRAND.badge.src2x} 2x`}
      alt=""
      width={width}
      height={height}
      className="shrink-0 rounded-full object-cover"
      style={{ width, height }}
      priority
      aria-hidden
    />
  )
}

function StudioWordmark({
  className,
  variant,
}: {
  className?: string
  variant: BrandVariant
}) {
  const isLanding = variant === 'landing'

  return (
    <span
      translate="no"
      className={cn(
        'app-name-text font-bold tracking-tight flex items-baseline gap-1 leading-none',
        isLanding ? 'text-xl md:text-2xl' : 'text-lg md:text-xl',
        className
      )}
      style={{ fontFamily: BRAND.wordmark.fontFamily }}
    >
      <span>SceneFlow</span>{' '}
      <span className="sf-wordmark-ai">AI</span>{' '}
      <span
        className={cn(
          'font-medium text-gray-500 dark:text-gray-400',
          isLanding ? 'text-base md:text-lg' : 'text-sm md:text-base'
        )}
      >
        Studio
      </span>
    </span>
  )
}

export function SceneFlowStudioBrand({
  href,
  className,
  nameClassName,
  variant = 'app',
  showWordmark = true,
}: Props) {
  const content = (
    <>
      <LogoBadge variant={variant} />
      {showWordmark ? (
        <StudioWordmark
          variant={variant}
          className={cn('text-gray-900 dark:text-white', nameClassName)}
        />
      ) : null}
    </>
  )

  const rootClass = cn(
    'flex items-center gap-2.5 group',
    variant === 'landing' && 'gap-3',
    className
  )

  if (href) {
    return (
      <Link href={href} className={rootClass}>
        {content}
      </Link>
    )
  }

  return <div className={rootClass}>{content}</div>
}
