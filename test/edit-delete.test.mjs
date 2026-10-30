import assert from 'node:assert/strict'
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
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

/** One POST through the registered route, answered by a recording response stub. */
async function rpc(route, payload) {
  const body = payload === undefined ? [] : [Buffer.from(JSON.stringify(payload))]
  const req = {
    method: 'POST',
    async *[Symbol.asyncIterator]() {
      for (const chunk of body) yield chunk
    },
  }
  const res = {
    status: null,
    body: null,
    setHeader() {},
    writeHead(status) {
      this.status = status
    },
    end(bytes) {
      this.body = JSON.parse(Buffer.from(bytes).toString('utf8'))
    },
  }
  await route.handler(req, res)
  return res
}

/** A main-agent session header as persisted by DSH (delegationDepth 0, no origin). */
const MAIN_HEADER = { version: 4, id: 'session-main', createdAt: 1, cwd: 'D:\\x', isSeeded: false, delegationDepth: 0, agentPreset: 'ptc' }
/** A teammate/sub-agent session header as persisted by DSH (origin subagent, depth 1, parent link). */
const CHILD_HEADER = { version: 4, id: 'ab764a13-f35d-45a3-8f11-0bdaf6369c27', createdAt: 2, cwd: 'D:\\x', parentSession: 'session-main', isSeeded: false, origin: 'subagent', delegationDepth: 1, agentPreset: 'ptc' }

const home = await mkdtemp(join(tmpdir(), 'prompt-picker-edit-'))
const stateFile = join(home, 'prompt-picker.json')
const debugFile = join(home, 'prompt-picker-debug.log')

try {
  const first = fakeContext()
  plugin.apply(first.ctx, { dshHome: home })
  const service = first.services.get('promptPicker')
  const route = first.routes[0]
  const section = first.sections[0]

  // --- add -> update -> delete, through the RPC surface the browser half uses ---
  let res = await rpc(route, { action: 'add', name: '  Main note  ', text: '  Main agent: keep going.  ', scope: 'main' })
  assert.equal(res.status, 200)
  assert.equal(res.body.ok, true)
  const added = res.body.value.prompts.find((p) => p.name === 'Main note')
  assert.ok(added, 'add returned the new row')
  assert.equal(added.text, 'Main agent: keep going.', 'add trims text')
  assert.deepEqual(res.body.value.selectedIds, [added.id], 'the added row is auto-checked')

  // update only the name; text and scope must not move
  res = await rpc(route, { action: 'update', id: added.id, name: '  Renamed  ' })
  assert.equal(res.status, 200)
  let row = res.body.value.prompts.find((p) => p.id === added.id)
  assert.equal(row.name, 'Renamed', 'update trims the new name')
  assert.equal(row.text, 'Main agent: keep going.', 'untouched text survives a name-only update')
  assert.equal(row.scope, 'main', 'untouched scope survives a name-only update')

  // update text only
  res = await rpc(route, { action: 'update', id: added.id, text: '  Rewritten text.  ' })
  row = res.body.value.prompts.find((p) => p.id === added.id)
  assert.equal(row.text, 'Rewritten text.')
  assert.equal(row.name, 'Renamed')

  // update scope only
  res = await rpc(route, { action: 'update', id: added.id, scope: 'sub' })
  row = res.body.value.prompts.find((p) => p.id === added.id)
  assert.equal(row.scope, 'sub')

  // an out-of-range scope falls back to 'both' (the documented scopeOf rule add
  // already applies) and still answers 200 — rejections are reserved for empty fields
  res = await rpc(route, { action: 'update', id: added.id, scope: 'nonsense' })
  assert.equal(res.status, 200)
  assert.equal(res.body.value.prompts.find((p) => p.id === added.id).scope, 'both')
  await rpc(route, { action: 'update', id: added.id, scope: 'sub' })

  // on-disk state carries the edit
  assert.deepEqual(JSON.parse(await readFile(stateFile, 'utf8')).prompts, [
    { id: added.id, name: 'Renamed', text: 'Rewritten text.', scope: 'sub' },
  ])

  // --- rejections: 400 rejected, and nothing changes ---
  res = await rpc(route, { action: 'update', id: 'nope', name: 'x' })
  assert.equal(res.status, 400)
  assert.equal(res.body.error.code, 'rejected')
  assert.match(res.body.error.message, /unknown prompt id/)

  res = await rpc(route, { action: 'update', id: added.id, name: '   ' })
  assert.equal(res.status, 400)
  assert.match(res.body.error.message, /name is empty/)

  res = await rpc(route, { action: 'update', id: added.id, text: '   ' })
  assert.equal(res.status, 400)
  assert.match(res.body.error.message, /text is empty/)

  res = await rpc(route, { action: 'update', id: 'full-throttle', name: 'nope' })
  assert.equal(res.status, 400)
  assert.equal(res.body.error.code, 'rejected')
  assert.match(res.body.error.message, /built-in row full-throttle is read-only/)

  res = await rpc(route, { action: 'delete', id: 'full-throttle' })
  assert.equal(res.status, 400)
  assert.match(res.body.error.message, /built-in row full-throttle cannot be deleted/)

  res = await rpc(route, { action: 'delete', id: 'nope' })
  assert.equal(res.status, 400)
  assert.match(res.body.error.message, /unknown prompt id/)

  // the built-in row is still there and still selected after every rejection
  assert.deepEqual((await service.getState()).prompts.map((p) => p.id), ['full-throttle', added.id])
  assert.deepEqual((await service.getState()).selectedIds, [added.id])

  // --- delete drops the row and its selection ---
  res = await rpc(route, { action: 'delete', id: added.id })
  assert.equal(res.status, 200)
  assert.deepEqual(res.body.value.prompts.map((p) => p.id), ['full-throttle'])
  assert.deepEqual(res.body.value.selectedIds, [], 'delete also unchecks the row')
  assert.equal(res.body.value.enabled, false)
  assert.deepEqual(JSON.parse(await readFile(stateFile, 'utf8')), { selectedIds: [], prompts: [] })

  // --- restart-style reload: same state file, fresh service ---
  const second = fakeContext()
  plugin.apply(second.ctx, { dshHome: home })
  const reloaded = second.services.get('promptPicker')
  assert.deepEqual(await reloaded.getState(), { enabled: false, selectedIds: [], prompts: [reloaded.builtin] }, 'the deletion survives a restart')

  // --- interleaved toggle + update stays consistent ---
  await reloaded.add('Keep', 'Keep this.', 'both')
  const keep = (await reloaded.getState()).prompts.find((p) => p.name === 'Keep')
  assert.deepEqual((await reloaded.getState()).selectedIds, [keep.id], 'the added row is auto-checked')
  await reloaded.toggle(keep.id)
  assert.deepEqual((await reloaded.getState()).selectedIds, [], 'toggle off removes the checked row')
  await reloaded.update(keep.id, { text: 'Keep this too.' })
  assert.deepEqual((await reloaded.getState()).selectedIds, [], 'an edit does not re-check a row')
  await reloaded.toggle(keep.id)
  assert.deepEqual((await reloaded.getState()).selectedIds, [keep.id])

  // --- scope routing reads the durable session header, not flat context fields ---
  const third = fakeContext()
  plugin.apply(third.ctx, { dshHome: home })
  const scoped = third.services.get('promptPicker')
  const scopeSection = third.sections[0]
  const addRow = async (name, text, scope) => {
    const snapshot = await scoped.add(name, text, scope)
    return snapshot.prompts.find((p) => p.name === name).id
  }
  const bothId = await addRow('Both row', 'BOTH-TEXT', 'both')
  const mainId = await addRow('Main row', 'MAIN-TEXT', 'main')
  const subId = await addRow('Sub row', 'SUB-TEXT', 'sub')
  assert.ok(bothId && mainId && subId, 'rows are addressable by id')

  const mainText = scopeSection.text({ agent: { session: { header: MAIN_HEADER }, options: {} } })
  assert.match(mainText, /BOTH-TEXT/, 'both-scoped row reaches the main agent')
  assert.match(mainText, /MAIN-TEXT/, 'main-scoped row reaches the main agent')
  assert.doesNotMatch(mainText, /SUB-TEXT/, 'sub-scoped row skips the main agent')

  const childText = scopeSection.text({ agent: { session: { header: CHILD_HEADER }, options: { subagentDepth: 1 } } })
  assert.match(childText, /BOTH-TEXT/, 'both-scoped row reaches a sub-agent')
  assert.match(childText, /SUB-TEXT/, 'sub-scoped row reaches a sub-agent')
  assert.doesNotMatch(childText, /MAIN-TEXT/, 'main-scoped row skips a sub-agent (teammates included)')

  // the calibration log distinguishes the three evidence sources
  const lines = (await readFile(debugFile, 'utf8')).trim().split('\n').map((line) => JSON.parse(line))
  const childLine = lines.find((line) => line.injected.includes('Sub row'))
  assert.ok(childLine, 'the child assembly was logged')
  assert.equal(childLine.sub, true)
  assert.match(childLine.why, /origin=subagent/)
  assert.match(childLine.why, /delegationDepth=1/)
  const mainLine = lines.filter((line) => line.injected.includes('Main row')).at(-1)
  assert.ok(mainLine)
  assert.equal(mainLine.sub, false)
  assert.equal(mainLine.why, 'header:main')

  // a context with no readable header degrades to the documented default
  const bareText = scopeSection.text({})
  assert.match(bareText, /MAIN-TEXT/, 'no header degrades to the main agent')
  assert.doesNotMatch(bareText, /SUB-TEXT/)
  const bareLine = lines.concat(JSON.parse((await readFile(debugFile, 'utf8')).trim().split('\n').at(-1))).at(-1)
  assert.equal(bareLine.why, 'default-main:no-header')

  // service-level guards mirror the RPC surface
  await assert.rejects(() => scoped.update('nope', { name: 'x' }), /unknown prompt id/)
  await assert.rejects(() => scoped.delete('full-throttle'), /cannot be deleted/)
  await assert.rejects(() => scoped.delete('nope'), /unknown prompt id/)
  const remaining = (await scoped.getState()).prompts.map((p) => p.id)
  for (const id of [bothId, mainId, subId]) assert.ok(remaining.includes(id), 'the scope rows are still listed')

// --- the browser half is wired to both new actions, and the copy is in both languages ---
const clientSource = await readFile(new URL('../client.js', import.meta.url), 'utf8')
for (const needle of ["call('update'", "call('delete'", "const BUILTIN_ID = 'full-throttle'", 'dsh-ft-act-del', 'ConfirmDialog']) {
  assert.ok(clientSource.includes(needle), 'client.js wires ' + needle)
}

const vm = await import('node:vm')
let registration
vm.runInNewContext(clientSource, { window: { __ModuleLoader__: { load: (value) => { registration = value } } }, console })
const ReactStub = {
  createElement: () => ({}),
  useCallback: (fn) => fn,
  useEffect() {},
  useState: (value) => [value, () => {}],
  useRef: () => ({ current: null }),
}
const moduleExports = registration.factory(() => ReactStub)
const dictionaries = new Map()
await moduleExports.apply({
  effect: (fn) => fn(),
  locale: {
    register(namespace, dictionary) {
      dictionaries.set(namespace, dictionary)
      return () => {}
    },
    bind: () => (name) => name,
  },
  slots: {
    inject: (owner, callback) => callback(),
    register: () => () => {},
  },
})
const { zh, en } = dictionaries.get('prompt-picker')
assert.deepEqual(Object.keys(zh).sort(), Object.keys(en).sort(), 'zh and en dictionaries declare the same keys')

const localeEn = JSON.parse(await readFile(new URL('../locale/en.json', import.meta.url), 'utf8'))
const localeZh = JSON.parse(await readFile(new URL('../locale/zh.json', import.meta.url), 'utf8'))
assert.deepEqual(Object.keys(localeEn.actions).sort(), Object.keys(localeZh.actions).sort(), 'locale files declare the same action keys')
for (const key of ['edit', 'editTip', 'editTitle', 'save', 'delete', 'deleteTip', 'deleteTitle', 'deleteBody', 'deleteConfirm']) {
  assert.ok(key in localeEn.actions && key in localeZh.actions, 'locale copy for ' + key)
}
for (const key of ['editEntry', 'editTip', 'editTitle', 'editSave', 'deleteEntry', 'deleteTip', 'deleteTitle', 'deleteBody', 'deleteConfirm']) {
  assert.ok(key in zh && key in en, 'client dictionary copy for ' + key)
}

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
assert.equal(pkg.version, '0.5.1', 'the released version carries the new capability and the write fix')

// --- a temp DSH_HOME (env, no config override) is honored end to end ---
const envHome = await mkdtemp(join(tmpdir(), 'prompt-picker-envhome-'))
const previousHome = process.env.DSH_HOME
process.env.DSH_HOME = envHome
try {
  const envCtx = fakeContext()
  plugin.apply(envCtx.ctx, {})
  const envService = envCtx.services.get('promptPicker')
  const addedRow = (await envService.add('Env row', 'Env text.', 'both')).prompts.find((p) => p.name === 'Env row')
  await envService.update(addedRow.id, { name: 'Env row 2' })
  const restarted = fakeContext()
  plugin.apply(restarted.ctx, {})
  const restoredService = restarted.services.get('promptPicker')
  assert.equal((await restoredService.getState()).prompts.find((p) => p.id === addedRow.id).name, 'Env row 2')
  await restoredService.delete(addedRow.id)
  const again = fakeContext()
  plugin.apply(again.ctx, {})
  assert.equal((await again.services.get('promptPicker').getState()).prompts.some((p) => p.id === addedRow.id), false)
  assert.deepEqual(JSON.parse(await readFile(join(envHome, 'prompt-picker.json'), 'utf8')), { selectedIds: [], prompts: [] })
} finally {
  if (previousHome === undefined) delete process.env.DSH_HOME
  else process.env.DSH_HOME = previousHome
  await rm(envHome, { recursive: true, force: true })
}

// --- 36 overlapping toggle/update calls: memory and disk must not drift ---
const concHome = await mkdtemp(join(tmpdir(), 'prompt-picker-concurrent-'))
const concCtx = fakeContext()
plugin.apply(concCtx.ctx, { dshHome: concHome })
const concService = concCtx.services.get('promptPicker')
const raceIds = []
for (let index = 0; index < 6; index += 1) {
  const snapshot = await concService.add('R' + index, 'text ' + index, index % 3 === 0 ? 'main' : 'both')
  raceIds.push(snapshot.prompts.find((p) => p.name === 'R' + index).id)
}
const ops = []
for (let index = 0; index < 18; index += 1) {
  ops.push(concService.toggle(raceIds[index % raceIds.length]))
  ops.push(concService.update(raceIds[(index * 3) % raceIds.length], { name: 'N' + index }))
}
await Promise.all(ops)
const memoryIds = (await concService.getState()).selectedIds
const diskIds = JSON.parse(await readFile(join(concHome, 'prompt-picker.json'), 'utf8')).selectedIds
assert.deepEqual(diskIds, memoryIds, 'serialized writes keep memory and disk identical under overlap')
const leftovers = (await readdir(concHome)).filter((name) => name.endsWith('.tmp'))
assert.deepEqual(leftovers, [], 'no temporary file is left behind')
const concReload = fakeContext()
plugin.apply(concReload.ctx, { dshHome: concHome })
assert.deepEqual((await concReload.services.get('promptPicker').getState()).selectedIds, memoryIds, 'a reload after the overlap agrees with memory')
await rm(concHome, { recursive: true, force: true })

  console.log('edit-delete.test.mjs: ok')
} finally {
  await rm(home, { recursive: true, force: true })
}