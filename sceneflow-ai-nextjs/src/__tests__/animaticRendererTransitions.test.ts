import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

/**
 * `docker/ffmpeg-renderer/` has no test suite of its own and cannot be run
 * here, so these guard the contract the Next.js side depends on: the field
 * names, the fallback to plain concat, and the flag that keeps the two
 * deployments from getting ahead of each other.
 */
const renderer = readFileSync(
  path.join(process.cwd(), 'docker/ffmpeg-renderer/ffmpeg_utils.py'),
  'utf8'
)
const route = readFileSync(
  path.join(process.cwd(), 'src/app/api/export/project-animatic/route.ts'),
  'utf8'
)

describe('ffmpeg renderer transitions', () => {
  it('reads the same field names the timeline writes', () => {
    expect(renderer).toContain("segments[i].get('transitionIn')")
    expect(renderer).toContain("segments[i].get('transitionInSec')")
  })

  it('renders a dissolve as a crossfade and a fade as a fade through black', () => {
    expect(renderer).toMatch(/XFADE_BY_EFFECT\s*=\s*\{\s*'dissolve':\s*'fade',\s*'fade':\s*'fadeblack',?\s*\}/)
  })

  it('still hard-concatenates a spec that asks for no transitions', () => {
    expect(renderer).toContain('if any(join is not None for join in joins) and len(segments) > 1:')
    expect(renderer).toContain('concat=n={len(segments)}:v=1:a=0[outv]')
  })

  it('gives xfade streams it can actually join and that end', () => {
    expect(renderer).toContain('settb=AVTB,fps={fps},format=yuv420p,')
    expect(renderer).toContain('trim=duration={duration:.4f},setpts=PTS-STARTPTS[n{i}]')
  })

  it('sets the output length from the chain rather than the raw segment sum', () => {
    expect(renderer).toContain('chain_parts, video_output, total_duration = build_xfade_video_chain(')
    expect(renderer).toContain("cmd.extend(['-t', str(total_duration)])")
  })
})

describe('project animatic route', () => {
  it('keeps transitions off until the container is known to understand them', () => {
    expect(route).toContain("process.env.ANIMATIC_RENDER_TRANSITIONS === 'true'")
    expect(route).toContain('transitions: animaticTransitionsEnabled()')
  })

  it('forwards the resolved transition onto the render segment', () => {
    expect(route).toContain('transitionIn: seg.transitionIn')
    expect(route).toContain('transitionInSec: seg.transitionInSec')
  })
})
