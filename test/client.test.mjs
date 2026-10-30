import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

const source = await readFile(new URL('../client.js', import.meta.url), 'utf8')
assert.ok(source.includes('/_dsh/prompt-picker/rpc'), 'talks to the same-origin rpc route')

let registration
const window = {
  __ModuleLoader__: {
    load(value) {
      registration = value
    },
  },
}
vm.runInNewContext(source, { window, console })

assert.ok(registration, 'the bundle registers with window.__ModuleLoader__')
assert.equal(registration.id, 'dsh-prompt-picker')

const React = {
  createElement() {
    return {}
  },
  useCallback(fn) {
    return fn
  },
  useEffect() {},
  useState(value) {
    return [value, () => {}]
  },
  useRef() {
    return { current: null }
  },
}
const moduleExports = registration.factory((specifier) => {
  assert.equal(specifier, 'react')
  return React
})
assert.equal(JSON.stringify(moduleExports.inject), JSON.stringify(['slots', 'locale']))
assert.equal(typeof moduleExports.apply, 'function')

let registered
const locales = new Map()
const ctx = {
  effect(fn) {
    return fn()
  },
  locale: {
    register(namespace, dictionary, key) {
      locales.set(namespace, { dictionary, key })
      return () => {}
    },
    bind(namespace) {
      const entry = locales.get(namespace)
      return (name) => (entry && entry.dictionary.zh[name]) || name
    },
  },
  slots: {
    inject(owner, callback) {
      assert.equal(owner, 'conversation.input.left')
      return callback()
    },
    register(options, component) {
      registered = { options, component }
      return () => {}
    },
  },
}

await moduleExports.apply(ctx)

assert.equal(registered.options.name, 'conversation.input.left')
assert.equal(registered.options.id, 'prompt-picker-toggle')
assert.equal(registered.options.locale, 'prompt-picker')
assert.equal(registered.options.order, 0)
assert.equal(registered.options.registrant, 'dsh-prompt-picker')
assert.equal(typeof registered.component, 'function')
const injection = registered.options.inject()
assert.equal(typeof injection.t, 'function')
assert.equal(injection.t('tipOff'), '点击选择要注入的系统提示词（可多选）')
assert.equal(locales.get('prompt-picker').key, 'prompt-picker:dictionary')
console.log('client.test.mjs: ok')
