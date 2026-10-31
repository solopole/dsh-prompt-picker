/**
 * Host half of `dsh-prompt-picker` — multi-select prompt picker.
 *
 * State (a small JSON file under the harness home): the saved prompt list
 * (`{id, name, text, scope}`, scope = 'both' | 'main' | 'sub'), plus the
 * multi-select `selectedIds` — every selected row is injected, in list
 * order, separated by blank lines. Rows are added, edited and deleted over
 * the same RPC route (every user row at once through `deleteAll`); the
 * built-in row is generated from config, can be edited like any row — the
 * edit persists as a `builtin` override in the state file and disappears
 * again once the row is back to its generated default — but cannot be
 * deleted. One dynamic system-prompt section receives
 * the assembly context; rows whose scope excludes the assembling agent
 * (main agent vs sub-agent) are filtered out. Because the main/sub
 * discrimination rule is being calibrated, every assembly appends one JSON
 * line to ~/.dsh/full-throttle-debug.log describing the observed context.
 */
import { appendFile, mkdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { appendFileSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

/** The Cordis service key (kept for diagnostics continuity). */
const SERVICE_KEY = 'promptPicker'
const STATE_FILE = 'prompt-picker.json'
const DEBUG_FILE = 'prompt-picker-debug.log'
/** Prompt section identity and placement, after first-party guidance and before the persona suffix. */
const SECTION_NAME = 'prompt-picker:prompts'
const SECTION_ORDER = 10150
/** Same-origin RPC route the browser half calls. */
const RPC_ROUTE = '/_dsh/prompt-picker/rpc'
const DEFAULT_INSTRUCTIONS =
  '我们是一家实力雄厚的大模型公司，你的 token 用量预算无限，不要吝惜或有所保留。一切以高标准完成任务为优先。'
const BUILTIN_ID = 'full-throttle'
const SCOPES = ['both', 'main', 'sub']

function resolveDshHome(explicit) {
  if (typeof explicit === 'string' && explicit.length > 0) return explicit
  const fromEnv = process.env.DSH_HOME
  if (typeof fromEnv === 'string' && fromEnv.length > 0) return fromEnv
  return join(homedir(), '.dsh')
}

function instructionsOf(config) {
  const configured = config?.instructions
  if (typeof configured !== 'string') return DEFAULT_INSTRUCTIONS
  const text = configured.trim()
  return text.length > 0 ? text : DEFAULT_INSTRUCTIONS
}

function messageOf(error) {
  return error instanceof Error ? error.message : String(error)
}

function scopeOf(value) {
  return SCOPES.includes(value) ? value : 'both'
}

/** Saved rows: the built-in first, then validated user rows from the state file. */
function promptsOf(parsed, builtin) {
  const list = [builtin]
  if (Array.isArray(parsed?.prompts)) {
    for (const item of parsed.prompts) {
      if (
        item !== null && typeof item === 'object' &&
        typeof item.id === 'string' && item.id.length > 0 && item.id !== BUILTIN_ID &&
        typeof item.name === 'string' && item.name.trim().length > 0 &&
        typeof item.text === 'string' && item.text.trim().length > 0
      ) {
        list.push({ id: item.id, name: item.name.trim().slice(0, 60), text: item.text, scope: scopeOf(item.scope) })
      }
    }
  }
  return list
}

/** Selected ids from a v3 file, or migrated from the v1/v2 shapes. */
function selectedOf(parsed, prompts) {
  if (Array.isArray(parsed?.selectedIds)) {
    const known = new Set(prompts.map((p) => p.id))
    return parsed.selectedIds.filter((id) => typeof id === 'string' && known.has(id))
  }
  // v2 {enabled, activeId} / v1 {enabled}
  const active = typeof parsed?.activeId === 'string' ? parsed.activeId : BUILTIN_ID
  if (parsed?.enabled === true && prompts.some((p) => p.id === active)) return [active]
  return []
}

/** First defined value among the given keys of the given objects. */
function firstOf(keys, ...objects) {
  for (const object of objects) {
    for (const key of keys) {
      const value = object?.[key]
      if (value !== undefined && value !== null) return value
    }
  }
  return undefined
}

/**
 * Decide whether this assembly belongs to a sub-agent.
 *
 * The assembly context is `{agent, scope, signal}`; the authoritative
 * discriminator lives on the agent's durable session header, exactly as
 * @deepseek-ai/dsh-subagent's delegationDepthOf(agent) reads it: a
 * session-backed child is created with header
 * `{parentSession, origin: 'subagent', delegationDepth: n > 0}` and
 * `AgentOptions.subagentDepth = n` (header value is the monotone floor, so
 * a resumed child never counts from zero). A top-level session persists
 * `delegationDepth: 0` and no origin. `context.session` is the assembly
 * scope object, not the session — reading the header means going through
 * `context.agent.session.header`.
 *
 * Order: header origin 'subagent'|'spawn'|'teammate' or delegationDepth > 0
 * means sub-agent; a header that says depth 0 with no sub-agent origin means
 * the main agent; only a context with no readable header at all falls back to
 * the main agent, and `why` then says so explicitly.
 */
function classifyAgent(context) {
  const agent = context?.agent ?? context?.scope
  const header = agent?.session?.header
  const options = agent?.options
  const origin = firstOf(['origin', 'agentOrigin', 'spawnOrigin'], header, agent?.session, agent, context?.session, context)
  const depthRaw = firstOf(['delegationDepth', 'subagentDepth', 'depth'], header, options, agent?.session, agent, context?.session, context)
  const depth = depthRaw === undefined || depthRaw === null ? NaN : Number(depthRaw)
  const subSignals = []
  if (origin === 'subagent' || origin === 'spawn' || origin === 'teammate') subSignals.push('origin=' + origin)
  if (Number.isFinite(depth) && depth > 0) subSignals.push('delegationDepth=' + depth)
  if (subSignals.length > 0) return { sub: true, why: subSignals.join(',') }
  if (header !== null && typeof header === 'object') return { sub: false, why: 'header:main' }
  return { sub: false, why: 'default-main:no-header' }
}

/** Compact, cycle-safe JSON of the assembly context for the calibration log. */
function debugRepr(value, depth = 0, seen = new Set()) {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'string') return value.length > 80 ? value.slice(0, 80) + '…' : value
    if (typeof value === 'function') return '[fn]'
    return value
  }
  if (seen.has(value)) return '[circular]'
  if (depth >= 2) return Array.isArray(value) ? '[array:' + value.length + ']' : '[object]'
  seen.add(value)
  try {
    if (Array.isArray(value)) return value.slice(0, 8).map((item) => debugRepr(item, depth + 1, seen))
    const out = {}
    for (const key of Object.keys(value).slice(0, 24)) out[key] = debugRepr(value[key], depth + 1, seen)
    return out
  } finally {
    seen.delete(value)
  }
}

/** Prompt-picker state exposed over the RPC route. */
class FullThrottleService {
  constructor(ctx, config) {
    this.ctx = ctx
    this.home = resolveDshHome(config?.dshHome)
    this.file = join(this.home, STATE_FILE)
    this.debugFile = join(this.home, DEBUG_FILE)
    this.builtin = { id: BUILTIN_ID, name: '火力全开', text: instructionsOf(config), scope: 'both' }
    /** The freshly generated built-in row; a persisted override is measured against it. */
    this.builtinDefault = { name: this.builtin.name, text: this.builtin.text, scope: this.builtin.scope }
    this.selectedIds = []
    this.prompts = [this.builtin]
    /** Tail of the serialized write chain: one state-file write at a time. */
    this.writeQueue = Promise.resolve()
    this.ready = this.restore()
  }

  async restore() {
    try {
      const parsed = JSON.parse(await readFile(this.file, 'utf8'))
      this.applyBuiltinOverride(parsed?.builtin)
      this.prompts = promptsOf(parsed, this.builtin)
      this.selectedIds = selectedOf(parsed, this.prompts)
    } catch (error) {
      if (error?.code !== 'ENOENT') this.warn('restore', error)
    }
  }

  /** Apply a persisted built-in override; each field is validated independently. */
  applyBuiltinOverride(stored) {
    if (stored === null || typeof stored !== 'object') return
    if (typeof stored.name === 'string' && stored.name.trim().length > 0) this.builtin.name = stored.name.trim().slice(0, 60)
    if (typeof stored.text === 'string' && stored.text.trim().length > 0) this.builtin.text = stored.text
    if (SCOPES.includes(stored.scope)) this.builtin.scope = stored.scope
  }

  warn(scope, error) {
    try {
      if (this.ctx.logger?.warn) this.ctx.logger.warn('[prompt-picker] ' + scope + ': ' + (error?.message ?? error))
    } catch {}
  }

  snapshot() {
    return { enabled: this.selectedIds.length > 0, selectedIds: [...this.selectedIds], prompts: this.prompts }
  }

  async getState() {
    await this.ready
    return this.snapshot()
  }

  /** Check or uncheck one prompt in the multi-select. */
  async toggle(id) {
    await this.ready
    if (typeof id !== 'string') throw new Error('id must be a string')
    if (!this.prompts.some((p) => p.id === id)) throw new Error('unknown prompt id')
    const previous = [...this.selectedIds]
    this.selectedIds = this.selectedIds.includes(id)
      ? this.selectedIds.filter((x) => x !== id)
      : [...this.selectedIds, id]
    try {
      await this.persist()
    } catch (error) {
      this.selectedIds = previous
      throw error
    }
    return this.snapshot()
  }

  /** Uncheck everything: injection off. */
  async clear() {
    await this.ready
    const previous = [...this.selectedIds]
    this.selectedIds = []
    try {
      await this.persist()
    } catch (error) {
      this.selectedIds = previous
      throw error
    }
    return this.snapshot()
  }

  /** Save a new prompt row, check it, and return the refreshed state. */
  async add(name, text, scope) {
    await this.ready
    const cleanName = typeof name === 'string' ? name.trim().slice(0, 60) : ''
    const cleanText = typeof text === 'string' ? text.trim() : ''
    if (cleanName === '') throw new Error('name is empty')
    if (cleanText === '') throw new Error('text is empty')
    const previous = { prompts: this.prompts, selectedIds: [...this.selectedIds] }
    const row = { id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8), name: cleanName, text: cleanText, scope: scopeOf(scope) }
    this.prompts = [...this.prompts, row]
    this.selectedIds = [...this.selectedIds, row.id]
    try {
      await this.persist()
    } catch (error) {
      this.prompts = previous.prompts
      this.selectedIds = previous.selectedIds
      throw error
    }
    return this.snapshot()
  }

  /** Change one row's injection scope: 'both' | 'main' | 'sub'. */
  async setScope(id, scope) {
    await this.ready
    if (typeof id !== 'string') throw new Error('id must be a string')
    const next = scopeOf(scope)
    const row = this.prompts.find((p) => p.id === id)
    if (row === undefined) throw new Error('unknown prompt id')
    const previous = row.scope
    if (previous === next) return this.snapshot()
    row.scope = next
    try {
      await this.persist()
    } catch (error) {
      row.scope = previous
      throw error
    }
    return this.snapshot()
  }

  /**
   * Change one row: name, text and/or scope. Works for user rows and the
   * built-in row alike — a built-in edit persists as a `builtin` override
   * (see writeOnce) and rolls back on a failed write. Only the fields present
   * in the patch move; validation matches add (name trim <= 60 and non-empty,
   * text non-empty, scope through scopeOf). The built-in row stays undeletable.
   */
  async update(id, patch) {
    await this.ready
    if (typeof id !== 'string' || id.length === 0) throw new Error('id must be a string')
    const row = this.prompts.find((p) => p.id === id)
    if (row === undefined) throw new Error('unknown prompt id')
    const change = patch !== null && typeof patch === 'object' ? patch : {}
    const next = {
      name: change.name === undefined ? row.name : typeof change.name === 'string' ? change.name.trim().slice(0, 60) : '',
      text: change.text === undefined ? row.text : typeof change.text === 'string' ? change.text.trim() : '',
      scope: change.scope === undefined ? row.scope : scopeOf(change.scope),
    }
    if (change.name !== undefined && next.name === '') throw new Error('name is empty')
    if (change.text !== undefined && next.text === '') throw new Error('text is empty')
    if (next.name === row.name && next.text === row.text && next.scope === row.scope) return this.snapshot()
    const previous = { name: row.name, text: row.text, scope: row.scope }
    row.name = next.name
    row.text = next.text
    row.scope = next.scope
    try {
      await this.persist()
    } catch (error) {
      row.name = previous.name
      row.text = previous.text
      row.scope = previous.scope
      throw error
    }
    return this.snapshot()
  }

  /** Remove one user row; it leaves the multi-select with it. The built-in row survives every state file. */
  async delete(id) {
    await this.ready
    if (typeof id !== 'string' || id.length === 0) throw new Error('id must be a string')
    if (id === BUILTIN_ID) throw new Error('the built-in row ' + BUILTIN_ID + ' cannot be deleted')
    if (!this.prompts.some((p) => p.id === id)) throw new Error('unknown prompt id')
    const previous = { prompts: this.prompts, selectedIds: [...this.selectedIds] }
    this.prompts = this.prompts.filter((p) => p.id !== id)
    this.selectedIds = this.selectedIds.filter((x) => x !== id)
    try {
      await this.persist()
    } catch (error) {
      this.prompts = previous.prompts
      this.selectedIds = previous.selectedIds
      throw error
    }
    return this.snapshot()
  }

  /**
   * Remove every user row at once, unchecking each; the built-in row is code,
   * not data, so it (and its own checked state) survives. A no-op when nothing
   * is saved — one persist, one atomic rename.
   */
  async deleteAll() {
    await this.ready
    const userRows = this.prompts.filter((p) => p.id !== BUILTIN_ID)
    if (userRows.length === 0) return this.snapshot()
    const previous = { prompts: this.prompts, selectedIds: [...this.selectedIds] }
    const removed = new Set(userRows.map((p) => p.id))
    this.prompts = this.prompts.filter((p) => p.id === BUILTIN_ID)
    this.selectedIds = this.selectedIds.filter((id) => !removed.has(id))
    try {
      await this.persist()
    } catch (error) {
      this.prompts = previous.prompts
      this.selectedIds = previous.selectedIds
      throw error
    }
    return this.snapshot()
  }

  /**
   * Replace the state file through a same-directory rename; readers never see a
   * torn file. Writes are serialized through one chain, so overlapping
   * toggle/update/delete calls cannot interleave their rename/unlink and leave the
   * file holding an older snapshot than memory; each write also uses a unique
   * temporary name, so two writers never clobber the same temporary file. The
   * payload is serialized when the write runs, not when it is queued, so the last
   * write always reflects the current in-memory rows. The built-in row is code,
   * not data.
   */
  persist() {
    const write = () => this.writeOnce()
    this.writeQueue = this.writeQueue.then(write, write)
    return this.writeQueue
  }

  /**
   * One state-file write: unique temporary file, then an atomic rename. The
   * built-in row persists only as a `builtin` override while it differs from
   * the generated default, so an uncustomized row never shadows the config
   * `instructions` that generated it, and editing back to the default drops
   * the override key entirely.
   */
  async writeOnce() {
    await mkdir(dirname(this.file), { recursive: true })
    const temp = this.file + '.' + process.pid.toString(36) + '.' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + '.tmp'
    const payload = {
      selectedIds: this.selectedIds,
      prompts: this.prompts.filter((p) => p.id !== BUILTIN_ID),
    }
    if (
      this.builtin.name !== this.builtinDefault.name ||
      this.builtin.text !== this.builtinDefault.text ||
      this.builtin.scope !== this.builtinDefault.scope
    ) {
      payload.builtin = { name: this.builtin.name, text: this.builtin.text, scope: this.builtin.scope }
    }
    await writeFile(temp, JSON.stringify(payload), 'utf8')
    try {
      await rename(temp, this.file)
    } catch (error) {
      await unlink(temp).catch(() => {})
      throw error
    }
  }

  /** One calibration line per assembly; the file restarts past 256 KiB. */
  logAssembly(context, decision, injected) {
    try {
      try {
        if (statSync(this.debugFile).size > 256 * 1024) writeFileSync(this.debugFile, '')
      } catch {}
      const line = JSON.stringify({
        t: new Date().toISOString(),
        sub: decision.sub,
        why: decision.why,
        injected,
        keys: context !== null && typeof context === 'object' ? Object.keys(context).slice(0, 24) : [],
        ctx: debugRepr(context),
      }) + '\n'
      appendFileSync(this.debugFile, line, 'utf8')
    } catch {}
  }

  /** Prompt-section text for one assembly: selected rows, scope-filtered, in list order, joined by blank lines. */
  promptText(context) {
    const decision = classifyAgent(context)
    const selected = new Set(this.selectedIds)
    const rows = this.prompts.filter((p) => selected.has(p.id))
    const usable = rows.filter((p) => p.scope === 'both' || (p.scope === 'sub') === decision.sub || (p.scope === 'main') === !decision.sub)
    this.logAssembly(context, decision, usable.map((p) => p.name))
    if (usable.length === 0) return ''
    return usable.map((p) => p.text).join('\n\n')
  }
}

/** Read a bounded JSON request body. */
async function readBody(req, maxBytes = 256 * 1024) {
  const chunks = []
  let bytes = 0
  for await (const chunk of req) {
    const part = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    bytes += part.length
    if (bytes > maxBytes) throw new RangeError('request body too large')
    chunks.push(part)
  }
  if (chunks.length === 0) throw new TypeError('empty body')
  return Buffer.concat(chunks).toString('utf8')
}

/** Same-origin RPC the browser half calls: GET = state, POST = toggle|clear|add|setScope|update|delete|deleteAll. */
class RpcBackend {
  constructor(service) {
    this.service = service
  }

  responseJson(res, status, body) {
    const bytes = Buffer.from(JSON.stringify(body))
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Content-Length', String(bytes.length))
    res.setHeader('Cache-Control', 'no-store')
    res.writeHead(status)
    res.end(bytes)
  }

  async handle(req, res) {
    if (req.method === 'GET') {
      try {
        this.responseJson(res, 200, { ok: true, value: await this.service.getState() })
      } catch (error) {
        this.responseJson(res, 503, { ok: false, error: { code: 'unavailable', message: messageOf(error) } })
      }
      return
    }
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST')
      this.responseJson(res, 405, { ok: false, error: { code: 'method-not-allowed', message: 'Use GET or POST' } })
      return
    }
    let body
    try {
      body = JSON.parse(await readBody(req))
    } catch (error) {
      this.responseJson(res, 400, { ok: false, error: { code: 'invalid-request', message: messageOf(error) } })
      return
    }
    try {
      if (body?.action === 'toggle') {
        this.responseJson(res, 200, { ok: true, value: await this.service.toggle(body.id) })
      } else if (body?.action === 'clear') {
        this.responseJson(res, 200, { ok: true, value: await this.service.clear() })
      } else if (body?.action === 'add') {
        this.responseJson(res, 200, { ok: true, value: await this.service.add(body.name, body.text, body.scope) })
      } else if (body?.action === 'setScope') {
        this.responseJson(res, 200, { ok: true, value: await this.service.setScope(body.id, body.scope) })
      } else if (body?.action === 'update') {
        this.responseJson(res, 200, { ok: true, value: await this.service.update(body.id, { name: body.name, text: body.text, scope: body.scope }) })
      } else if (body?.action === 'delete') {
        this.responseJson(res, 200, { ok: true, value: await this.service.delete(body.id) })
      } else if (body?.action === 'deleteAll') {
        this.responseJson(res, 200, { ok: true, value: await this.service.deleteAll() })
      } else {
        this.responseJson(res, 400, { ok: false, error: { code: 'invalid-request', message: 'unsupported action' } })
      }
    } catch (error) {
      this.responseJson(res, 400, { ok: false, error: { code: 'rejected', message: messageOf(error) } })
    }
  }
}

/**
 * Register the picker service and its dynamic prompt section for this profile.
 * @param ctx - owning Cordis context.
 * @param config - this row's config (dshHome, instructions for the built-in row).
 */
export function apply(ctx, config) {
  const service = new FullThrottleService(ctx, config)
  ctx.provide(SERVICE_KEY, service)
  ctx.effect(
    () =>
      ctx.systemPrompt.section({
        name: SECTION_NAME,
        order: SECTION_ORDER,
        interpolate: false,
        text: (context) => service.promptText(context),
      }),
    'prompt-picker.prompt-section',
  )
  ctx.inject(['webServer'], (webCtx) => {
    const rpc = new RpcBackend(service)
    webCtx.effect(() => {
      const off = webCtx.webServer.register({
        kind: 'exact',
        path: RPC_ROUTE,
        handler: (req, res) => rpc.handle(req, res),
      })
      return () => off()
    }, 'prompt-picker: web route')
  })
  void service.ready
}

export const inject = ['systemPrompt']
