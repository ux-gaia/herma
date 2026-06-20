import { create } from 'zustand'
import { randomUUID } from '../lib/id'
import type { AutomationConfig } from '../../../shared/types/automation'
import type {
  CopyRule,
  DestinationPlacement,
  ExportWorkbookConfig,
  MergeSheetsRule,
  ProjectConfig,
  ProjectConstant,
  ProjectTemplate,
  SourceFile,
  SourceSelection
} from '../../../shared/types/project'

interface ProjectState {
  name?: string
  template: ProjectTemplate | null
  sourceFiles: SourceFile[]
  constants: ProjectConstant[]
  mappings: CopyRule[]
  automation: AutomationConfig
  setAutomation: (patch: Partial<AutomationConfig>) => void
  setName: (name?: string) => void
  setTemplate: (template: ProjectTemplate | null) => void
  loadProject: (config: ProjectConfig) => void
  addSourceFiles: (files: SourceFile[]) => void
  removeSourceFile: (fileId: string) => void
  addConstant: (constant: Omit<ProjectConstant, 'id'>) => void
  updateConstant: (id: string, patch: Partial<Omit<ProjectConstant, 'id'>>) => void
  removeConstant: (id: string) => void
  addMapping: (mapping: Omit<CopyRule, 'id'>) => void
  updateMapping: (id: string, patch: Partial<Omit<CopyRule, 'id'>>) => void
  removeMapping: (id: string) => void
  reorderMapping: (fromIndex: number, toIndex: number) => void
  clearWorkspace: () => void
  getProjectConfig: () => ProjectConfig
  getExportWorkbookConfig: () => ExportWorkbookConfig | null
}

function pruneMappingsForFile(state: ProjectState, fileId: string): CopyRule[] {
  return state.mappings.filter((mapping) => {
    if (mapping.ruleType === 'merge_sheets') {
      return true
    }
    return mapping.source.sourceFileId !== fileId
  })
}

function pruneMappingsForMissingTemplateSheets(
  mappings: CopyRule[],
  template: ProjectTemplate | null
): CopyRule[] {
  if (!template) {
    return mappings.filter((mapping) => mapping.ruleType === 'merge_sheets')
  }

  const sheetIds = new Set(template.sheets.map((sheet) => sheet.id))
  return mappings.filter(
    (mapping) =>
      mapping.ruleType === 'merge_sheets' ||
      sheetIds.has(mapping.destination.templateSheetId)
  )
}

function reorderMappingsByIndex(
  mappings: CopyRule[],
  fromIndex: number,
  toIndex: number
): CopyRule[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= mappings.length ||
    toIndex >= mappings.length
  ) {
    return mappings
  }

  const next = [...mappings]
  const [item] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, item)
  return next
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  name: undefined,
  template: null,
  sourceFiles: [],
  constants: [],
  mappings: [],
  automation: {},

  setAutomation: (patch) =>
    set((state) => ({
      automation: { ...state.automation, ...patch }
    })),

  setName: (name) => set({ name }),

  setTemplate: (template) =>
    set((state) => ({
      template,
      mappings: pruneMappingsForMissingTemplateSheets(state.mappings, template)
    })),

  loadProject: (config) =>
    set({
      name: config.name,
      template: config.template,
      sourceFiles: config.sourceFiles,
      constants: config.constants,
      mappings: config.mappings,
      automation: config.automation ?? {}
    }),

  addSourceFiles: (files) =>
    set((state) => {
      const existingPaths = new Set(state.sourceFiles.map((file) => file.path))
      const newFiles = files.filter((file) => !existingPaths.has(file.path))
      return { sourceFiles: [...state.sourceFiles, ...newFiles] }
    }),

  removeSourceFile: (fileId) =>
    set((state) => ({
      sourceFiles: state.sourceFiles.filter((file) => file.id !== fileId),
      mappings: pruneMappingsForFile(state, fileId)
    })),

  addConstant: (constant) =>
    set((state) => ({
      constants: [...state.constants, { ...constant, id: randomUUID() }]
    })),

  updateConstant: (id, patch) =>
    set((state) => ({
      constants: state.constants.map((constant) =>
        constant.id === id ? { ...constant, ...patch } : constant
      )
    })),

  removeConstant: (id) => set((state) => ({ constants: state.constants.filter((c) => c.id !== id) })),

  addMapping: (mapping: Omit<CopyRule, 'id'>) =>
    set((state) => ({
      mappings: [...state.mappings, { ...mapping, id: randomUUID() } as CopyRule]
    })),

  updateMapping: (id, patch) =>
    set((state) => ({
      mappings: state.mappings.map((mapping) =>
        mapping.id === id ? ({ ...mapping, ...patch } as CopyRule) : mapping
      )
    })),

  removeMapping: (id) =>
    set((state) => ({
      mappings: state.mappings.filter((mapping) => mapping.id !== id)
    })),

  reorderMapping: (fromIndex, toIndex) =>
    set((state) => ({
      mappings: reorderMappingsByIndex(state.mappings, fromIndex, toIndex)
    })),

  clearWorkspace: () =>
    set({
      name: undefined,
      template: null,
      sourceFiles: [],
      constants: [],
      mappings: [],
      automation: {}
    }),

  getProjectConfig: () => {
    const { name, template, sourceFiles, constants, mappings, automation } = get()
    return { name, template, sourceFiles, constants, mappings, automation }
  },

  getExportWorkbookConfig: () => {
    const { template, sourceFiles, constants, mappings } = get()
    if (mappings.length === 0) return null

    const needsTemplate = mappings.some((mapping) => mapping.ruleType === 'copy')
    if (needsTemplate && !template) return null

    return { template, sourceFiles, constants, mappings }
  }
}))

export function createDefaultSourceSelection(
  sourceFileId: string,
  sourceSheetId: string
): SourceSelection {
  return {
    sourceFileId,
    sourceSheetId,
    kind: 'columns',
    columns: {
      mode: 'index',
      columns: [1],
      headerRow: 1,
      filters: []
    }
  }
}

export function createDefaultMergeRule(): Omit<MergeSheetsRule, 'id'> {
  return {
    ruleType: 'merge_sheets',
    resultSheetName: 'merged',
    outputDirectory: '',
    skipHeadersAfterFirst: true,
    headerRow: 1
  }
}

export function createDefaultDestination(template: ProjectTemplate): DestinationPlacement {
  const firstSheet = template.sheets[0]
  return {
    templateSheetId: firstSheet?.id ?? '',
    anchorCol: 1,
    anchorRow: 1
  }
}
