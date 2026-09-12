import { readFileSync, readdirSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

const ROOT = path.resolve(__dirname, '../..')
const VISION_DIR = path.join(ROOT, 'src/components/vision')

function listTsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return listTsxFiles(full)
    return entry.isFile() && entry.name.endsWith('.tsx') ? [full] : []
  })
}

const visionSources = listTsxFiles(VISION_DIR).map((file) => ({
  file,
  relative: path.relative(ROOT, file),
  source: readFileSync(file, 'utf8'),
}))

const expressDialogs = readdirSync(VISION_DIR)
  .filter((name) => /^Express.*ConfirmDialog\.tsx$/.test(name))
  .map((name) => name.replace(/\.tsx$/, ''))

describe('Express confirm dialog reachability', () => {
  it('finds the Express confirm dialogs', () => {
    expect(expressDialogs.length).toBeGreaterThan(0)
  })

  /**
   * Two fully built dialogs (Express Veo SFX and "Generate Assets") once sat in
   * the tree with no code path that could open them, so they drifted out of
   * sync with the flows that replaced them. A dialog nobody can open is dead
   * weight, not a feature — so every Express dialog has to be mounted, and its
   * `open` state has to be set true somewhere in the mounting component.
   */
  it.each(expressDialogs)('%s is mounted and something opens it', (component) => {
    const mounts = visionSources.filter((entry) =>
      new RegExp(`<${component}[\\s/>]`).test(entry.source)
    )
    expect(
      mounts.map((entry) => entry.relative),
      `${component} is never mounted`
    ).not.toEqual([])

    for (const mount of mounts) {
      const block = mount.source.slice(mount.source.indexOf(`<${component}`))
      const openState = block.match(/open=\{(\w+)\}/)?.[1]
      expect(openState, `${component} in ${mount.relative} has no open={state} prop`).toBeTruthy()

      const setter = `set${openState!.charAt(0).toUpperCase()}${openState!.slice(1)}`
      expect(
        mount.source.includes(`${setter}(true)`),
        `${mount.relative} never calls ${setter}(true), so ${component} cannot open`
      ).toBe(true)
    }
  })
})
