import type { CopyRule, ProjectConstant } from '../types/project'
import { isCopySelectionRule } from '../types/project'
import { extractPatternConstantNames } from './output-name'

export function normalizeConstantName(name: string): string {
  return name.trim().toLowerCase()
}

export function getConstantsUsedInRules(mappings: CopyRule[]): string[] {
  const names = new Set<string>()

  for (const rule of mappings) {
    if (!isCopySelectionRule(rule)) continue

    for (const filter of rule.source.columns?.filters ?? []) {
      if (filter.value.kind === 'constant' && filter.value.constantId) {
        names.add(filter.value.constantId)
      }
    }
  }

  return [...names]
}

export function getRequiredConstantNames(
  mappings: CopyRule[],
  outputNamePattern: string | undefined,
  constants: ProjectConstant[]
): string[] {
  const byId = new Map(constants.map((constant) => [constant.id, constant.name]))
  const required = new Set<string>()

  for (const constantId of getConstantsUsedInRules(mappings)) {
    const name = byId.get(constantId)
    if (name) required.add(name)
  }

  for (const placeholder of extractPatternConstantNames(outputNamePattern)) {
    const match = constants.find(
      (constant) => normalizeConstantName(constant.name) === normalizeConstantName(placeholder)
    )
    if (match) {
      required.add(match.name)
    } else {
      required.add(placeholder)
    }
  }

  return [...required].sort((left, right) => left.localeCompare(right))
}
