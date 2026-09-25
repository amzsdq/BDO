import { describe, expect, it } from 'vitest'
import { normalizeCodexRandomOutputAliases } from './normalize-codex-random-output-aliases.mjs'

const variant = (id, itemId, count=1) => ({ id, inputs:[{itemId,count}] })
const source = (recipeId, status, ingredientId, baseOutputs=[], randomOutputs=[]) => ({
  recipeId, skill:'cooking', status, ingredients:[{itemId:ingredientId,count:1}], baseOutputs, randomOutputs,
})

describe('Codex random-output alias normalization', () => {
  it('refuses catalog-only details because missing supplemental routes can make alias removal unsafe', () => {
    const dataset={metadata:{},recipes:{},recipesByOutput:{},byproducts:{}}
    const details={schemaVersion:2,complete:true,unresolvedCount:0,recipes:[]}
    expect(()=>normalizeCodexRandomOutputAliases(dataset,details)).toThrow(/supplemental discovery/)
  })
  it('removes markerless parallel random aliases and records the base output as producer', () => {
    const dataset={metadata:{fingerprint:'stale'},recipes:{
      'cooking:9601':{id:'cooking:9601',skill:'cooking',outputItemId:9601,variants:[variant('base169',9203),variant('base637',9282)]},
      'cooking:9602':{id:'cooking:9602',skill:'cooking',outputItemId:9602,variants:[variant('alias169',9203),variant('alias637',9282)]},
    },recipesByOutput:{'9601':['cooking:9601'],'9602':['cooking:9602']},byproducts:{}}
    const details={schemaVersion:2,complete:true,unresolvedCount:0,supplementalDiscovery:{method:'catalog-gap-probe',complete:true},recipes:[
      source(169,'single-base',9203,[{itemId:9601,min:1,max:4}],[{itemId:9602,min:1,max:2}]),
      source(637,'single-base',9282,[{itemId:9601,min:1,max:1}],[{itemId:9602,min:1,max:1}]),
    ]}
    const out=normalizeCodexRandomOutputAliases(dataset,details)
    expect(out.recipes['cooking:9602']).toBeUndefined()
    expect(out.recipesByOutput['9602']).toBeUndefined()
    expect(out.byproducts['9602']).toEqual({outputItemId:9602,producedWhileCraftingItemIds:[9601]})
    expect(out.metadata.codexRandomAliasNormalization.removedVariants).toBe(2)
    expect(out.metadata.fingerprint).toBeUndefined()
    expect(out.metadata.counts).toEqual({cooking:1,alchemy:0})
    expect(out.metadata.sources).toContain('BDO Codex KR random-output role evidence')
  })

  it('preserves a distinct true direct signature and is idempotent', () => {
    const dataset={metadata:{},recipes:{
      'cooking:9601':{id:'cooking:9601',skill:'cooking',outputItemId:9601,variants:[variant('base',9203)]},
      'cooking:9602':{id:'cooking:9602',skill:'cooking',outputItemId:9602,variants:[variant('alias',9203),variant('direct',9999)]},
    },recipesByOutput:{'9601':['cooking:9601'],'9602':['cooking:9602']},byproducts:{}}
    const details={schemaVersion:2,complete:true,unresolvedCount:0,supplementalDiscovery:{method:'catalog-gap-probe',complete:true},recipes:[source(169,'single-base',9203,[{itemId:9601,min:1,max:4}],[{itemId:9602,min:1,max:2}])]}
    const once=normalizeCodexRandomOutputAliases(dataset,details)
    expect(once.recipes['cooking:9602'].variants.map(v=>v.id)).toEqual(['direct'])
    const twice=normalizeCodexRandomOutputAliases(once,details)
    expect(twice.recipes['cooking:9602'].variants.map(v=>v.id)).toEqual(['direct'])
    expect(twice.byproducts['9602'].producedWhileCraftingItemIds).toEqual([9601])
    expect(twice.metadata.codexRandomAliasNormalization.removedVariants).toBe(0)
  })

  it('never removes a source-backed random-only route', () => {
    const dataset={metadata:{},recipes:{
      'cooking:9601':{id:'cooking:9601',skill:'cooking',outputItemId:9601,variants:[variant('base',9203)]},
      'cooking:9602':{id:'cooking:9602',skill:'cooking',outputItemId:9602,variants:[variant('randomOnly',9203)]},
    },recipesByOutput:{'9601':['cooking:9601'],'9602':['cooking:9602']},byproducts:{}}
    const details={schemaVersion:2,complete:true,unresolvedCount:0,supplementalDiscovery:{method:'catalog-gap-probe',complete:true},recipes:[
      source(169,'single-base',9203,[{itemId:9601,min:1,max:4}],[{itemId:9602,min:1,max:2}]),
      source(345,'random-only',9203,[],[{itemId:9602,min:1,max:1}]),
    ]}
    expect(()=>normalizeCodexRandomOutputAliases(dataset,details)).toThrow(/ambiguous random-output alias/)
  })
})
