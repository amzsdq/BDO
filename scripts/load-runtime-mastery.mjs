import fs from 'node:fs'
import ts from 'typescript'

async function loadStandaloneTypeScriptModule(file) {
  const source = fs.readFileSync(file, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
    fileName: file,
    reportDiagnostics: true,
  })
  const errors = (output.diagnostics || []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)
  if (errors.length) throw new Error(`Cannot transpile ${file}: ${errors.map((diagnostic) => diagnostic.messageText).join('; ')}`)
  // The two mastery modules contain only runtime constants/functions; Alchemy's only import is `import type`,
  // which TypeScript removes. Refuse a remaining runtime import rather than resolving an unexpected dependency.
  if (/^\s*import\s/m.test(output.outputText)) throw new Error(`${file} is no longer standalone after type erasure`)
  return import(`data:text/javascript;base64,${Buffer.from(output.outputText).toString('base64')}`)
}

export async function loadRuntimeMasteryRows() {
  const cooking = await loadStandaloneTypeScriptModule('src/domain/mastery.ts')
  const alchemy = await loadStandaloneTypeScriptModule('src/domain/alchemyMastery.ts')
  if (!Array.isArray(cooking.COOKING_MASTERY_ROWS) || !Array.isArray(alchemy.VERIFIED_ALCHEMY_MASTERY_ROWS)) {
    throw new Error('Runtime mastery exports are missing')
  }
  return {
    cookingRuntimeRows: cooking.COOKING_MASTERY_ROWS,
    alchemyRuntimeRows: alchemy.VERIFIED_ALCHEMY_MASTERY_ROWS,
  }
}
