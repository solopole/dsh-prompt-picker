import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const plugin = await import(new URL('../index.js', import.meta.url).href)

/** Minimal Cordis context: provide, effect, inject, logger and the systemPrompt section registry. */
function fakeContext() {
  const services = new Map()
  const sections = []
  const routes = []
  const ctx = {
    logger: { warn() {} },
    provide(name, value) {
      services.set(name, value)
    },
    effect(fn) {
      return fn()
    },
    inject(names, callback) {
      assert.deepEqual(names, ['webServer'])
      callback({
        effect(fn) {
          return fn()
        },
        webServer: {
          register(spec) {
            routes.push(spec)
            return () => {}
          },
        },
      })
    },
    systemPrompt: {
      section(section) {
        sections.push(section)
        return () => {}
      },
    },
  }
  return { ctx, services, sections, routes }
}

const home = await mkdtemp(join(tmpdir(), 'full-throttle-test-'))
const stateFile = join(home, 'prompt-picker.json')
const mainCtx = { agent: { delegationDepth: 0 } }
const subCtx = { agent: { delegationDepth: 1 } }

try {
  const first = fakeContext()
  plugin.apply(first.ctx, { dshHome: home })
  assert.deepEqual(plugin.inject, ['systemPrompt'])
  const service = first.services.get('promptPicker')
  assert.ok(service, 'host service is provided')
  assert.equal(first.sections.length, 1)
  assert.equal(first.sections[0].name, 'prompt-picker:prompts')
  assert.equal(first.sections[0].order, 10150)
  assert.equal(first.sections[0].interpolate, false)
  assert.equal(first.routes.length, 1, 'rpc route registered')
  assert.equal(first.routes[0].kind, 'exact')
  assert.equal(first.routes[0].path, '/_dsh/prompt-picker/rpc')

  let state = await service.getState()
  assert.equal(state.enabled, false)
  assert.deepEqual(state.selectedIds, [])
  assert.equal(state.prompts.length, 1, 'built-in row only')
  assert.equal(state.prompts[0].id, 'full-throttle')
  assert.equal(state.prompts[0].name, '火力全开')
  assert.match(state.prompts[0].text, /token 用量预算无限/)
  assert.equal(first.sections[0].text(mainCtx), '', 'nothing selected injects nothing')

  state = await service.toggle('full-throttle')
  assert.equal(state.enabled, true)
  assert.deepEqual(state.selectedIds, ['full-throttle'])
  assert.match(first.sections[0].text(mainCtx), /token 用量预算无限/)
  assert.match(first.sections[0].text(subCtx), /token 用量预算无限/, 'scope both reaches sub agents')
  assert.deepEqual(JSON.parse(await readFile(stateFile, 'utf8')), { selectedIds: ['full-throttle'], prompts: [] })

  const second = fakeContext()
  plugin.apply(second.ctx, { dshHome: home })
  const restored = second.services.get('promptPicker')
  assert.deepEqual((await restored.getState()).selectedIds, ['full-throttle'], 'state survives reload')

  state = await restored.add('Sub note', 'Sub-agents: be terse.', 'sub')
  assert.equal(state.prompts.length, 2)
  const added = state.prompts.find((p) => p.name === 'Sub note')
  assert.ok(added)
  assert.equal(added.scope, 'sub')
  assert.deepEqual(state.selectedIds, ['full-throttle', added.id], 'added row is auto-checked')
  assert.match(second.sections[0].text(subCtx), /be terse/)
  assert.doesNotMatch(second.sections[0].text(mainCtx), /be terse/, 'sub-scoped row skips the main agent')

  state = await restored.setScope(added.id, 'main')
  assert.equal(state.prompts.find((p) => p.id === added.id).scope, 'main')
  assert.match(second.sections[0].text(mainCtx), /be terse/)
  assert.doesNotMatch(second.sections[0].text(subCtx), /be terse/)

  state = await restored.clear()
  assert.equal(state.enabled, false)
  assert.equal(second.sections[0].text(subCtx), '')

  await assert.rejects(() => restored.toggle('nope'), /unknown prompt id/)

  await writeFile(stateFile, JSON.stringify({ enabled: true }), 'utf8')
  const third = fakeContext()
  plugin.apply(third.ctx, { dshHome: home })
  const migrated = third.services.get('promptPicker')
  assert.deepEqual((await migrated.getState()).selectedIds, ['full-throttle'], 'v1 {enabled:true} migrates to the built-in row')
  assert.match(third.sections[0].text({}), /token 用量预算无限/)

  const fourth = fakeContext()
  plugin.apply(fourth.ctx, { dshHome: join(home, 'nested'), instructions: '  Custom budget note.  ' })
  const custom = fourth.services.get('promptPicker')
  assert.equal((await custom.getState()).prompts[0].text, 'Custom budget note.')
  await custom.toggle('full-throttle')
  assert.equal(fourth.sections[0].text({}), 'Custom budget note.')

  console.log('service.test.mjs: ok')
} finally {
  await rm(home, { recursive: true, force: true })
}
