import { describe, expect, it } from 'vitest'
import {
  buildRelatedLocationContinuityClause,
  parseLocationHierarchy,
  resolveParentLocationAnchor,
  sortLocationsParentsFirst,
} from '@/lib/vision/locationFamily'
import { buildLocationBasePrompt } from '@/lib/vision/locationReferencePrompts'

describe('locationFamily', () => {
  const freightTunnelLocations = [
    {
      id: 'loc-workshop',
      location: 'FREIGHT TUNNEL VAULT - WORKSHOP',
      description:
        'Subterranean freight tunnel vault with damp flagstone floors and stacks of discarded nickel-iron Edison storage cells.',
      sourceSceneIndex: 1,
    },
    {
      id: 'loc-main-vault',
      location: 'FREIGHT TUNNEL VAULT',
      description:
        'Cavernous 1906 freight tunnel vault with damp limestone walls, narrow-gauge rail tracks, and massive chalkboards.',
      imageUrl: 'https://blob.example/freight-tunnel-vault.png',
      sourceSceneIndex: 0,
    },
    {
      id: 'loc-clara',
      location: "FREIGHT TUNNEL VAULT - CLARA'S WORKSTATION",
      description: 'Workstation alcove lined with brass instruments and slate boards.',
      sourceSceneIndex: 2,
    },
    {
      id: 'loc-archive',
      location: 'FREIGHT TUNNEL ARCHIVE VAULT',
      description: 'Iron archival shelving rows along the subterranean tunnel walls.',
      sourceSceneIndex: 3,
    },
    {
      id: 'loc-street',
      location: 'CHICAGO STREET',
      description: 'Cobblestone street at night.',
      sourceSceneIndex: 4,
    },
  ]

  it('parses explicit sub-zone delimiters', () => {
    const workshop = parseLocationHierarchy('FREIGHT TUNNEL VAULT - WORKSHOP')
    expect(workshop.explicitParentPrefix).toBe('FREIGHT TUNNEL VAULT')
    expect(workshop.subZoneLabel).toBe('WORKSHOP')

    const clara = parseLocationHierarchy("FREIGHT TUNNEL VAULT - CLARA'S WORKSTATION")
    expect(clara.explicitParentPrefix).toBe('FREIGHT TUNNEL VAULT')
    expect(clara.subZoneLabel).toBe("CLARA'S WORKSTATION")
  })

  it('connects FREIGHT TUNNEL VAULT, - WORKSHOP, - CLARA\'S WORKSTATION, and FREIGHT TUNNEL ARCHIVE VAULT to the parent vault', () => {
    const mainVault = freightTunnelLocations.find((l) => l.id === 'loc-main-vault')!
    const workshop = freightTunnelLocations.find((l) => l.id === 'loc-workshop')!
    const clara = freightTunnelLocations.find((l) => l.id === 'loc-clara')!
    const archive = freightTunnelLocations.find((l) => l.id === 'loc-archive')!
    const street = freightTunnelLocations.find((l) => l.id === 'loc-street')!

    // Primary parent complex has no parent anchor of its own
    expect(resolveParentLocationAnchor(mainVault, freightTunnelLocations)).toBeNull()
    expect(resolveParentLocationAnchor(street, freightTunnelLocations)).toBeNull()

    // Direct hyphenated sub-zones link to FREIGHT TUNNEL VAULT
    const workshopAnchor = resolveParentLocationAnchor(workshop, freightTunnelLocations)
    expect(workshopAnchor?.parentLocation.id).toBe('loc-main-vault')
    expect(workshopAnchor?.relationship).toBe('subzone')
    expect(workshopAnchor?.subZoneLabel).toBe('WORKSHOP')

    const claraAnchor = resolveParentLocationAnchor(clara, freightTunnelLocations)
    expect(claraAnchor?.parentLocation.id).toBe('loc-main-vault')
    expect(claraAnchor?.relationship).toBe('subzone')
    expect(claraAnchor?.subZoneLabel).toBe("CLARA'S WORKSTATION")

    // Shared-prefix sibling ("FREIGHT TUNNEL ARCHIVE VAULT") also links to FREIGHT TUNNEL VAULT
    const archiveAnchor = resolveParentLocationAnchor(archive, freightTunnelLocations)
    expect(archiveAnchor?.parentLocation.id).toBe('loc-main-vault')
    expect(archiveAnchor?.relationship).toBe('adjacent_area')
    expect(archiveAnchor?.sharedComplexPrefix).toBe('FREIGHT TUNNEL')
  })

  it('orders parent locations before sub-locations for batch generation', () => {
    const sorted = sortLocationsParentsFirst(freightTunnelLocations)
    const mainIdx = sorted.findIndex((l) => l.id === 'loc-main-vault')
    const workshopIdx = sorted.findIndex((l) => l.id === 'loc-workshop')
    const claraIdx = sorted.findIndex((l) => l.id === 'loc-clara')
    const archiveIdx = sorted.findIndex((l) => l.id === 'loc-archive')

    expect(mainIdx).toBeLessThan(workshopIdx)
    expect(mainIdx).toBeLessThan(claraIdx)
    expect(mainIdx).toBeLessThan(archiveIdx)
  })

  it('injects shared architectural continuity and reference image guidance into sub-location prompts', () => {
    const clause = buildRelatedLocationContinuityClause({
      locationName: 'FREIGHT TUNNEL VAULT - WORKSHOP',
      parentLocationName: 'FREIGHT TUNNEL VAULT',
      parentLocationDescription:
        'Cavernous 1906 freight tunnel vault with damp limestone walls, narrow-gauge rail tracks, and massive chalkboards.',
      subZoneLabel: 'WORKSHOP',
      hasParentReferenceImage: true,
    })

    expect(clause).toContain('FREIGHT TUNNEL VAULT')
    expect(clause).toContain('WORKSHOP')
    expect(clause.toLowerCase()).toContain('damp limestone walls')
    expect(clause.toLowerCase()).toContain('narrow-gauge rail tracks')
    expect(clause.toLowerCase()).toContain('attached reference image')

    const fullPrompt = buildLocationBasePrompt(
      'FREIGHT TUNNEL VAULT - WORKSHOP',
      'INT',
      'NIGHT',
      'Subterranean freight tunnel vault with damp flagstone floors and stacks of discarded nickel-iron Edison storage cells.',
      {
        parentLocationName: 'FREIGHT TUNNEL VAULT',
        parentLocationDescription:
          'Cavernous 1906 freight tunnel vault with damp limestone walls, narrow-gauge rail tracks, and massive chalkboards.',
        subZoneLabel: 'WORKSHOP',
        hasParentReferenceImage: true,
      }
    )

    expect(fullPrompt).toContain('Related location continuity')
    expect(fullPrompt.toLowerCase()).toContain('narrow-gauge rail tracks')
  })
})
