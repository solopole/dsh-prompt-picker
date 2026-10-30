/**
 * Browser half of dsh-prompt-picker — multi-select prompt picker.
 *
 * One icon-only composer button opens the prompt menu: every checked row is
 * injected in list order; each row's chip cycles its injection scope
 * (both / main agent only / sub-agents only); a dialog saves new prompts;
 * a saved row can be edited in place (pencil → inline form) or deleted
 * (trash → second confirmation). The built-in row is generated host-side,
 * so it carries no edit/delete entry. All actions go to the same-origin
 * RPC route the Host half registers.
 *
 * Theme compatibility contract kept from the switch era: themes (PRTS in
 * particular) restyle every composer-card button with !important declarations,
 * so the ON state is carried by an id-scoped !important rule; the icon itself
 * is a child element no theme targets.
 */
window.__ModuleLoader__.load({
  id: 'dsh-prompt-picker',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')
    const h = React.createElement

    const PACKAGE = 'dsh-prompt-picker'
    const NS = 'prompt-picker'
    const SLOT = 'conversation.input.left'
    const ENTRY_ID = 'prompt-picker-toggle'
    const BUTTON_ID = 'dsh-prompt-picker-toggle'
    const RPC_ROUTE = '/_dsh/prompt-picker/rpc'
    /** The built-in row is generated host-side from config: read-only in the menu. */
    const BUILTIN_ID = 'full-throttle'

    /** Composer icon: pick one of ICONS here after checking icon-preview.html. */
    const ICON_NAME = 'bolt'

    const DICTIONARY = {
      zh: {
        loading: '读取中…',
        tipOff: '点击选择要注入的系统提示词（可多选）',
        tipOnPrefix: '正在注入：',
        tipError: '提示词状态读取失败，点击重试',
        ariaLabel: '提示词选择',
        menuClear: '全不选（关闭注入）',
        addNew: '新增提示词…',
        addTitle: '新增提示词',
        nameLabel: '名称',
        textLabel: '内容（注入到系统提示词）',
        scopeLabel: '注入对象',
        scopeBoth: '全部',
        scopeMain: '主',
        scopeSub: '子',
        addScopeBoth: '主与子都注入',
        addScopeMain: '仅主 agent',
        addScopeSub: '仅子 agent',
        chipTip: '点击切换注入对象：全部 → 仅主 → 仅子',
        namePlaceholder: '如：简洁模式',
        textPlaceholder: '要注入系统提示词的文字…',
        cancel: '取消',
        save: '保存并勾选',
        errName: '名称不能为空',
        errText: '内容不能为空',
        editEntry: '修改',
        editTip: '修改这条提示词',
        editTitle: '修改提示词',
        editSave: '保存修改',
        deleteEntry: '删除',
        deleteTip: '删除这条提示词',
        deleteTitle: '删除提示词',
        deleteBody: '删除后不可恢复，并会同时从已勾选中移除。',
        deleteConfirm: '删除',
      },
      en: {
        loading: 'Loading…',
        tipOff: 'Click to pick system prompts to inject (multi-select)',
        tipOnPrefix: 'Injecting: ',
        tipError: 'Prompt state unavailable; click to retry',
        ariaLabel: 'Prompt picker',
        menuClear: 'Uncheck all (off)',
        addNew: 'New prompt…',
        addTitle: 'New prompt',
        nameLabel: 'Name',
        textLabel: 'Text (injected into the system prompt)',
        scopeLabel: 'Applies to',
        scopeBoth: 'All',
        scopeMain: 'Main',
        scopeSub: 'Sub',
        addScopeBoth: 'Main + sub agents',
        addScopeMain: 'Main agent only',
        addScopeSub: 'Sub agents only',
        chipTip: 'Click to cycle scope: all → main → sub',
        namePlaceholder: 'e.g. Concise mode',
        textPlaceholder: 'Prompt text to inject…',
        cancel: 'Cancel',
        save: 'Save & check',
        errName: 'Name is required',
        errText: 'Text is required',
        editEntry: 'Edit',
        editTip: 'Edit this prompt',
        editTitle: 'Edit prompt',
        editSave: 'Save changes',
        deleteEntry: 'Delete',
        deleteTip: 'Delete this prompt',
        deleteTitle: 'Delete prompt',
        deleteBody: 'This cannot be undone, and the row is unchecked too.',
        deleteConfirm: 'Delete',
      },
    }

    const CSS = ".dsh-ft-toggle{display:inline-flex;box-sizing:border-box;align-items:center;gap:6px;height:28px;padding:0 8px;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);font-family:inherit;font-size:13px;font-weight:500;line-height:20px;white-space:nowrap;flex:none;cursor:pointer;transition:color .12s,background-color .12s,box-shadow .12s}.dsh-ft-toggle:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.dsh-ft-toggle:focus-visible{outline:none;box-shadow:0 0 0 2px var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary))}.dsh-ft-toggle:disabled{opacity:.55;cursor:default}.dsh-ft-icon{display:inline-flex;flex:none}.dsh-ft-icon svg{display:block;width:14px;height:14px}.dsh-ft-label{pointer-events:none}.dsh-ft-dot{box-sizing:border-box;flex:none;width:6px;height:6px;border-radius:50%;border:1px solid currentColor;opacity:.55;transition:background-color .12s,box-shadow .12s,opacity .12s}#dsh-prompt-picker-toggle[data-state=on]{color:var(--prts-yellow,var(--dsw-alias-state-business-primary)) !important;background:color-mix(in srgb,var(--prts-yellow,var(--dsw-alias-state-business-primary)) 16%,transparent) !important;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--prts-yellow,var(--dsw-alias-state-business-primary)) 55%,transparent) !important;--prts-control-outline:var(--prts-yellow,var(--dsw-alias-state-business-primary)) !important;--prts-control-surface:color-mix(in srgb,var(--prts-yellow,var(--dsw-alias-state-business-primary)) 20%,var(--prts-panel-raised,transparent)) !important}#dsh-prompt-picker-toggle[data-state=on] .dsh-ft-dot{background:currentColor !important;opacity:1;box-shadow:0 0 5px color-mix(in srgb,currentColor 75%,transparent)}#dsh-prompt-picker-toggle[data-state=error]{color:var(--dsw-alias-state-error-primary,#e5484d) !important}#dsh-prompt-picker-toggle[data-state=error] .dsh-ft-dot{background:currentColor !important;opacity:1}@container (width<=520px){.dsh-ft-label{display:none}}" + '.dsh-ft-wrap{position:relative;display:inline-flex}.dsh-ft-menu{position:absolute;bottom:calc(100% + 6px);left:0;min-width:230px;max-width:340px;max-height:340px;overflow-y:auto;z-index:900;display:flex;flex-direction:column;padding:4px;border-radius:var(--dsw-radius-md,10px);background:var(--dsw-alias-bg-floating,var(--dsw-alias-bg-raised,#fff));border:1px solid var(--dsw-alias-border-primary,rgba(127,127,127,.25));box-shadow:0 8px 28px rgba(0,0,0,.22);color:var(--dsw-alias-label-primary,inherit);font-size:13px}.dsh-ft-item{display:flex;align-items:center;gap:8px;min-width:0;flex:1;padding:6px 8px;border:0;border-radius:var(--dsw-radius-sm,6px);background:transparent;color:inherit;font-family:inherit;font-size:13px;line-height:20px;text-align:left;white-space:nowrap;overflow:hidden;cursor:pointer}.dsh-ft-item:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.15))}.dsh-ft-item:disabled{opacity:.5;cursor:default}.dsh-ft-row{display:flex;align-items:center;gap:2px;width:100%}.dsh-ft-row .dsh-ft-item{flex:1;min-width:0}.dsh-ft-box{flex:none;box-sizing:border-box;width:14px;height:14px;border:1px solid currentColor;border-radius:3px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;line-height:1;opacity:.85}.dsh-ft-row[data-checked=true] .dsh-ft-box{background:var(--dsw-alias-state-business-primary,currentColor);border-color:transparent;color:var(--dsw-alias-state-business-primary-contrast,#fff)}.dsh-ft-chip{flex:none;padding:1px 7px;border:1px solid var(--dsw-alias-border-primary,rgba(127,127,127,.35));border-radius:999px;background:transparent;color:var(--dsw-alias-label-secondary,inherit);font-family:inherit;font-size:11px;line-height:16px;cursor:pointer}.dsh-ft-chip:hover:not(:disabled){background:var(--dsh-alias-interactive-bg-hover,rgba(127,127,127,.15))}.dsh-ft-chip[data-scope=main]{color:var(--dsw-alias-state-business-primary,inherit);border-color:color-mix(in srgb,var(--dsw-alias-state-business-primary,currentColor) 45%,transparent)}.dsh-ft-chip[data-scope=sub]{color:#2e9e5b;border-color:color-mix(in srgb,#2e9e5b 45%,transparent)}.dsh-ft-chip:disabled{opacity:.5;cursor:default}.dsh-ft-name{overflow:hidden;text-overflow:ellipsis}.dsh-ft-item-add{color:var(--dsw-alias-state-business-primary,inherit)}.dsh-ft-sep{border-top:1px solid var(--dsw-alias-border-primary,rgba(127,127,127,.25));margin:4px 2px}.dsh-ft-overlay{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.38)}.dsh-ft-dialog{width:min(520px,92vw);max-height:86vh;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding:16px;border-radius:var(--dsw-radius-md,12px);background:var(--dsw-alias-bg-floating,var(--dsw-alias-bg-raised,#fff));border:1px solid var(--dsw-alias-border-primary,rgba(127,127,127,.25));box-shadow:0 12px 40px rgba(0,0,0,.3);color:var(--dsw-alias-label-primary,inherit);font-size:13px}.dsh-ft-dialog-title{font-size:14px;font-weight:600}.dsh-ft-field-label{color:var(--dsw-alias-label-secondary,inherit)}.dsh-ft-input{box-sizing:border-box;width:100%;padding:6px 10px;border:1px solid var(--dsw-alias-border-primary,rgba(127,127,127,.35));border-radius:var(--dsw-radius-sm,6px);background:var(--dsw-alias-interactive-bg,transparent);color:inherit;font-family:inherit;font-size:13px;line-height:20px}.dsh-ft-input:focus-visible{outline:none;border-color:var(--dsw-alias-state-business-primary,currentcolor);box-shadow:0 0 0 2px var(--dsw-focus-ring-color,transparent)}.dsh-ft-textarea{resize:vertical;min-height:120px}.dsh-ft-seg{display:flex;gap:6px;flex-wrap:wrap}.dsh-ft-seg label{display:inline-flex;align-items:center;gap:5px;padding:4px 11px;border:1px solid var(--dsw-alias-border-primary,rgba(127,127,127,.35));border-radius:999px;font-size:12px;cursor:pointer}.dsh-ft-seg label:has(input:checked){border-color:var(--dsw-alias-state-business-primary,currentColor);color:var(--dsw-alias-state-business-primary,inherit);background:color-mix(in srgb,var(--dsh-alias-state-business-primary,currentColor) 12%,transparent)}.dsh-ft-seg input{margin:0}.dsh-ft-dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:4px}.dsh-ft-secondary,.dsh-ft-primary{border:0;border-radius:var(--dsw-radius-sm,6px);padding:5px 14px;font-family:inherit;font-size:13px;font-weight:500;line-height:20px;cursor:pointer}.dsh-ft-secondary{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.18));color:var(--dsw-alias-label-primary,inherit)}.dsh-ft-primary{background:var(--dsw-alias-state-business-primary,#4c6ef5);color:var(--dsw-alias-state-business-primary-contrast,#fff)}.dsh-ft-primary:disabled,.dsh-ft-secondary:disabled{opacity:.55;cursor:default}.dsh-ft-error{color:var(--dsw-alias-state-error-primary,#e5484d);font-size:12px}.dsh-ft-toggle.dsh-ft-icononly{width:28px;padding:0;justify-content:center}#dsh-prompt-picker-toggle[data-state=on]{color:inherit !important;background:transparent !important;box-shadow:none !important;--prts-control-outline:initial !important;--prts-control-surface:initial !important}' + '.dsh-ft-act{flex:none;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;width:22px;height:22px;padding:0;border:0;border-radius:var(--dsw-radius-sm,6px);background:transparent;color:var(--dsw-alias-label-secondary,inherit);opacity:.7;cursor:pointer}.dsh-ft-act:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.15));color:var(--dsw-alias-label-primary,inherit);opacity:1}.dsh-ft-act:focus-visible{outline:none;box-shadow:0 0 0 2px var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary))}.dsh-ft-act:disabled{opacity:.4;cursor:default}.dsh-ft-act svg{display:block;width:13px;height:13px}.dsh-ft-act-del:hover:not(:disabled){color:var(--dsw-alias-state-error-primary,#e5484d)}.dsh-ft-edit{display:flex;flex-direction:column;gap:6px;width:100%;box-sizing:border-box;padding:8px;border-radius:var(--dsw-radius-sm,6px);background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.1))}.dsh-ft-edit-title{font-weight:600}.dsh-ft-textarea-sm{min-height:72px}.dsh-ft-edit-actions{display:flex;justify-content:flex-end;gap:6px}.dsh-ft-edit-actions .dsh-ft-secondary,.dsh-ft-edit-actions .dsh-ft-primary{padding:3px 12px}.dsh-ft-confirm-body{color:var(--dsw-alias-label-secondary,inherit);line-height:20px}.dsh-ft-confirm-name{font-weight:600;word-break:break-word}.dsh-ft-danger{background:var(--dsw-alias-state-error-primary,#e5484d);color:var(--dsw-alias-state-business-primary-contrast,#fff)}'

    /** 16x16 line icons, currentColor; swap value of ICON_NAME to change the button. */
    const ICONS = {
      bolt: h('svg', { viewBox: '0 0 16 16', 'aria-hidden': 'true', focusable: 'false' },
        h('path', { d: 'M8.9 1 3 9.1h3.3L5.6 15l6.3-8.4H8.4L8.9 1Z', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.3', 'stroke-linejoin': 'round' })),
      layers: h('svg', { viewBox: '0 0 16 16', 'aria-hidden': 'true', focusable: 'false' },
        h('path', { d: 'M8 1.8 14.2 5 8 8.2 1.8 5 8 1.8Z', fill: 'currentColor', opacity: '.9' }),
        h('path', { d: 'M2.9 7.6 8 10.4l5.1-2.8 1.1 1L8 11.9 1.8 8.6l1.1-1Z', fill: 'currentColor', opacity: '.65' }),
        h('path', { d: 'M2.9 10.8 8 13.6l5.1-2.8 1.1 1L8 15.1 1.8 11.8l1.1-1Z', fill: 'currentColor', opacity: '.4' })),
      list: h('svg', { viewBox: '0 0 16 16', 'aria-hidden': 'true', focusable: 'false' },
        h('path', { d: 'M2 3.2h1.6v1.6H2V3.2Zm0 4h1.6v1.6H2V7.2Zm0 4h1.6v1.6H2v-1.6Z', fill: 'currentColor' }),
        h('path', { d: 'M5.2 3.4H14v1.2H5.2V3.4Zm0 4H14v1.2H5.2V7.4Zm0 4H14v1.2H5.2v-1.2Z', fill: 'currentColor', opacity: '.85' })),
      doc: h('svg', { viewBox: '0 0 16 16', 'aria-hidden': 'true', focusable: 'false' },
        h('path', { d: 'M3.5 1.5h6L12.5 4.5v10h-9v-13Z', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.3', 'stroke-linejoin': 'round' }),
        h('path', { d: 'M5.5 7h5M5.5 9.5h5M5.5 12h3.5', stroke: 'currentColor', 'stroke-width': '1.2', 'stroke-linecap': 'round' })),
      quote: h('svg', { viewBox: '0 0 16 16', 'aria-hidden': 'true', focusable: 'false' },
        h('path', { d: 'M2.5 4.5C2.5 3.1 3.6 2 5 2v1.6c-.6 0-1 .5-1 1.1V5h1.5v3H2.5V4.5Z', fill: 'currentColor' }),
        h('path', { d: 'M8.5 4.5C8.5 3.1 9.6 2 11 2v1.6c-.6 0-1 .5-1 1.1V5h1.5v3H8.5V4.5Z', fill: 'currentColor' }),
        h('path', { d: 'M2.5 9.5h11v1.2h-11V9.5Zm0 3h8v1.2h-8v-1.2Z', fill: 'currentColor', opacity: '.55' })),
      sliders: h('svg', { viewBox: '0 0 16 16', 'aria-hidden': 'true', focusable: 'false' },
        h('path', { d: 'M1.5 4h13M1.5 8h13M1.5 12h13', stroke: 'currentColor', 'stroke-width': '1.2', 'stroke-linecap': 'round' }),
        h('path', { d: 'M4 2.6h1.8v2.8H4V2.6Zm5.4 4h1.8v2.8H9.4V6.6ZM6.2 10.6H8v2.8H6.2v-2.8Z', fill: 'currentColor' })),
      pencil: h('svg', { viewBox: '0 0 16 16', 'aria-hidden': 'true', focusable: 'false' },
        h('path', { d: 'M2.6 13.4 3.4 9.9l7.1-7.1 2.7 2.7-7.1 7.1-3.5.8Z', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.2', 'stroke-linejoin': 'round' }),
        h('path', { d: 'M9.5 3.6l2.7 2.7', stroke: 'currentColor', 'stroke-width': '1.1' })),
      trash: h('svg', { viewBox: '0 0 16 16', 'aria-hidden': 'true', focusable: 'false' },
        h('path', { d: 'M2.8 4.3h10.4M6.3 4.3V2.6h3.4v1.7M4.6 4.3l.6 9.1h5.6l.6-9.1', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.2', 'stroke-linejoin': 'round' }),
        h('path', { d: 'M6.7 6.7v4.6M9.3 6.7v4.6', stroke: 'currentColor', 'stroke-width': '1.1', 'stroke-linecap': 'round' })),
    }
    /** The bolt fills while injection is on and stays a hollow outline while off; other icons ignore the state. */
    function renderIcon(on) {
      if (ICON_NAME === 'bolt') {
        return h(
          'svg',
          { viewBox: '0 0 16 16', 'aria-hidden': 'true', focusable: 'false' },
          h('path', Object.assign(
            { d: 'M8.9 1 3 9.1h3.3L5.6 15l6.3-8.4H8.4L8.9 1Z' },
            on
              ? { fill: 'currentColor' }
              : { fill: 'none', stroke: 'currentColor', 'stroke-width': '1.3', 'stroke-linejoin': 'round' },
          )),
        )
      }
      return ICONS[ICON_NAME] !== undefined ? ICONS[ICON_NAME] : ICONS.bolt
    }
    const SCOPE_KEYS = { both: 'scopeBoth', main: 'scopeMain', sub: 'scopeSub' }

    function installStyles() {
      if (typeof document === 'undefined') return
      const tagId = PACKAGE + '/prompt-picker.css'
      if (document.querySelector('style[data-plugin-css=' + JSON.stringify(tagId) + ']') !== null) return
      const tag = document.createElement('style')
      tag.dataset.plugin = PACKAGE
      tag.dataset.pluginCss = tagId
      tag.textContent = CSS
      document.head.appendChild(tag)
    }

    function keepFocus(event) {
      event.preventDefault()
    }

    async function rpc(action, payload) {
      const init = action === undefined
        ? { credentials: 'same-origin' }
        : {
            credentials: 'same-origin',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(Object.assign({ action: action }, payload)),
          }
      const res = await fetch(RPC_ROUTE, init)
      const body = await res.json().catch(() => null)
      if (!res.ok || body === null || body.ok !== true) {
        throw new Error((body && body.error && body.error.message) || ('rpc failed: HTTP ' + res.status))
      }
      return body.value
    }

    /** Small modal to save a new prompt (name + text + scope). */
    function AddDialog(props) {
      const { t, busy, onCancel, onSave } = props
      const [name, setName] = React.useState('')
      const [text, setText] = React.useState('')
      const [scope, setScope] = React.useState('both')
      const [error, setError] = React.useState('')

      const submit = () => {
        if (name.trim() === '') { setError(t('errName')); return }
        if (text.trim() === '') { setError(t('errText')); return }
        setError('')
        onSave(name.trim(), text.trim(), scope)
      }

      const seg = (value, labelKey) => h(
        'label', null,
        h('input', { type: 'radio', name: 'dsh-ft-scope', checked: scope === value, onChange: () => setScope(value) }),
        t(labelKey),
      )

      return h(
        'div',
        {
          className: 'dsh-ft-overlay',
          onMouseDown: (event) => { if (event.target === event.currentTarget && !busy) onCancel() },
        },
        h(
          'div',
          { className: 'dsh-ft-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('addTitle') },
          h('div', { className: 'dsh-ft-dialog-title' }, t('addTitle')),
          h('label', { className: 'dsh-ft-field-label' }, t('nameLabel')),
          h('input', {
            className: 'dsh-ft-input', type: 'text', value: name, autoFocus: true,
            placeholder: t('namePlaceholder'),
            onInput: (event) => setName(event.target.value),
            onKeyDown: (event) => { if (event.key === 'Escape' && !busy) onCancel() },
          }),
          h('label', { className: 'dsh-ft-field-label' }, t('textLabel')),
          h('textarea', {
            className: 'dsh-ft-input dsh-ft-textarea', rows: 7, value: text,
            placeholder: t('textPlaceholder'),
            onInput: (event) => setText(event.target.value),
            onKeyDown: (event) => { if (event.key === 'Escape' && !busy) onCancel() },
          }),
          h('label', { className: 'dsh-ft-field-label' }, t('scopeLabel')),
          h('div', { className: 'dsh-ft-seg' }, seg('both', 'addScopeBoth'), seg('main', 'addScopeMain'), seg('sub', 'addScopeSub')),
          error !== '' && h('div', { className: 'dsh-ft-error' }, error),
          h(
            'div',
            { className: 'dsh-ft-dialog-actions' },
            h('button', { type: 'button', className: 'dsh-ft-secondary', disabled: busy, onClick: onCancel }, t('cancel')),
            h('button', { type: 'button', className: 'dsh-ft-primary', disabled: busy, onClick: submit }, t('save')),
          ),
        ),
      )
    }

    /** Inline editor for one saved row: name + text + scope, saved through the `update` action. */
    function EditForm(props) {
      const { t, busy, draft, onChange, onCancel, onSave } = props

      const submit = () => {
        if (draft.name.trim() === '') { onChange({ error: t('errName') }); return }
        if (draft.text.trim() === '') { onChange({ error: t('errText') }); return }
        onChange({ error: '' })
        onSave(draft.name.trim(), draft.text.trim(), draft.scope)
      }

      const seg = (value, labelKey) => h(
        'label', null,
        h('input', {
          type: 'radio', name: 'dsh-ft-scope-edit',
          checked: draft.scope === value,
          onChange: () => onChange({ scope: value }),
        }),
        t(labelKey),
      )

      return h(
        'div',
        { className: 'dsh-ft-edit', role: 'group', 'aria-label': t('editTitle') },
        h('div', { className: 'dsh-ft-edit-title' }, t('editTitle')),
        h('label', { className: 'dsh-ft-field-label' }, t('nameLabel')),
        h('input', {
          className: 'dsh-ft-input', type: 'text', value: draft.name, autoFocus: true,
          placeholder: t('namePlaceholder'),
          onInput: (event) => onChange({ name: event.target.value }),
          onKeyDown: (event) => { if (event.key === 'Escape' && !busy) onCancel() },
        }),
        h('label', { className: 'dsh-ft-field-label' }, t('textLabel')),
        h('textarea', {
          className: 'dsh-ft-input dsh-ft-textarea dsh-ft-textarea-sm', rows: 4, value: draft.text,
          placeholder: t('textPlaceholder'),
          onInput: (event) => onChange({ text: event.target.value }),
          onKeyDown: (event) => { if (event.key === 'Escape' && !busy) onCancel() },
        }),
        h('label', { className: 'dsh-ft-field-label' }, t('scopeLabel')),
        h('div', { className: 'dsh-ft-seg' }, seg('both', 'addScopeBoth'), seg('main', 'addScopeMain'), seg('sub', 'addScopeSub')),
        draft.error !== undefined && draft.error !== '' ? h('div', { className: 'dsh-ft-error' }, draft.error) : null,
        h(
          'div',
          { className: 'dsh-ft-edit-actions' },
          h('button', { type: 'button', className: 'dsh-ft-secondary', disabled: busy, onMouseDown: keepFocus, onClick: onCancel }, t('cancel')),
          h('button', { type: 'button', className: 'dsh-ft-primary', disabled: busy, onMouseDown: keepFocus, onClick: submit }, t('editSave')),
        ),
      )
    }

    /** Second confirmation before a saved row is deleted for good. */
    function ConfirmDialog(props) {
      const { t, busy, name, onCancel, onConfirm } = props
      return h(
        'div',
        { className: 'dsh-ft-overlay', onMouseDown: (event) => { if (event.target === event.currentTarget && !busy) onCancel() } },
        h(
          'div',
          { className: 'dsh-ft-dialog dsh-ft-confirm', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('deleteTitle') },
          h('div', { className: 'dsh-ft-dialog-title' }, t('deleteTitle')),
          h('div', { className: 'dsh-ft-confirm-body' }, t('deleteBody')),
          h('div', { className: 'dsh-ft-confirm-name' }, name),
          h(
            'div',
            { className: 'dsh-ft-dialog-actions' },
            h('button', { type: 'button', className: 'dsh-ft-secondary', disabled: busy, onClick: onCancel }, t('cancel')),
            h('button', { type: 'button', className: 'dsh-ft-primary dsh-ft-danger', disabled: busy, onClick: onConfirm }, t('deleteConfirm')),
          ),
        ),
      )
    }

    /** The picker: one icon-only composer button that opens the multi-select menu. */
    function PromptPicker(props) {
      const { t } = props
      const [phase, setPhase] = React.useState('loading')
      const [data, setData] = React.useState(null)
      const [open, setOpen] = React.useState(false)
      const [adding, setAdding] = React.useState(false)
      const [busy, setBusy] = React.useState(false)
      /** Inline editor draft for one saved row; null when no row is being edited. */
      const [editing, setEditing] = React.useState(null)
      /** Row awaiting delete confirmation; null when no confirmation is open. */
      const [confirming, setConfirming] = React.useState(null)
      const wrapRef = React.useRef(null)

      const refresh = React.useCallback(() => {
        let alive = true
        setPhase('loading')
        rpc()
          .then((value) => { if (alive) { setData(value); setPhase('ready') } })
          .catch(() => { if (alive) setPhase('error') })
        return () => { alive = false }
      }, [])

      React.useEffect(() => refresh(), [refresh])

      React.useEffect(() => {
        if (!open) return
        const close = () => {
          setOpen(false)
          setEditing(null)
          setConfirming(null)
        }
        const onDown = (event) => {
          if (wrapRef.current !== null && !wrapRef.current.contains(event.target)) close()
        }
        const onKey = (event) => { if (event.key === 'Escape') close() }
        document.addEventListener('mousedown', onDown)
        document.addEventListener('keydown', onKey)
        return () => {
          document.removeEventListener('mousedown', onDown)
          document.removeEventListener('keydown', onKey)
        }
      }, [open])

      const call = async (action, payload) => {
        setBusy(true)
        try {
          const value = await rpc(action, payload)
          setData(value)
          setPhase('ready')
          return value
        } finally {
          setBusy(false)
        }
      }

      const toggle = (id) => {
        call('toggle', { id: id }).catch(() => setPhase('error'))
      }
      const cycleScope = (id, current) => {
        const next = current === 'both' ? 'main' : current === 'main' ? 'sub' : 'both'
        call('setScope', { id: id, scope: next }).catch(() => setPhase('error'))
      }
      const clearAll = () => {
        call('clear', {}).catch(() => setPhase('error'))
      }
      const startEdit = (row) => {
        setConfirming(null)
        setEditing({ id: row.id, name: row.name, text: row.text, scope: row.scope, error: '' })
      }
      const saveEdit = (name, text, scope) => {
        const id = editing.id
        call('update', { id: id, name: name, text: text, scope: scope })
          .then(() => setEditing(null))
          .catch((error) => {
            const message = error instanceof Error ? error.message : String(error)
            setEditing((current) => current !== null && current.id === id ? Object.assign({}, current, { error: message }) : current)
          })
      }
      const deleteRow = () => {
        const id = confirming.id
        call('delete', { id: id })
          .then(() => setConfirming(null))
          .catch(() => { setConfirming(null); setPhase('error') })
      }

      const selectedNames = phase === 'ready' && data !== null
        ? data.prompts.filter((p) => data.selectedIds.indexOf(p.id) !== -1).map((p) => p.name)
        : []
      const on = selectedNames.length > 0
      const title = phase === 'loading'
        ? t('loading')
        : phase === 'error'
          ? t('tipError')
          : on ? t('tipOnPrefix') + selectedNames.join('、') : t('tipOff')

      return h(
        'span',
        { className: 'dsh-ft-wrap', ref: wrapRef },
        h(
          'button',
          {
            type: 'button',
            id: BUTTON_ID,
            className: 'dsh-ft-toggle dsh-ft-icononly',
            'data-state': phase === 'error' ? 'error' : on ? 'on' : 'off',
            'aria-haspopup': 'menu',
            'aria-expanded': open,
            'aria-label': t('ariaLabel') + (on ? ' (' + selectedNames.length + ')' : ''),
            title: title,
            disabled: phase === 'loading',
            onMouseDown: keepFocus,
            onClick: () => {
              if (phase === 'error') { refresh(); return }
              setOpen(!open)
            },
          },
          h('span', { className: 'dsh-ft-icon' }, renderIcon(on)),
        ),
        open && phase === 'ready' && data !== null && h(
          'div',
          { className: 'dsh-ft-menu', role: 'menu' },
          data.prompts.map((p) => {
            const checked = data.selectedIds.indexOf(p.id) !== -1
            const builtin = p.id === BUILTIN_ID
            if (editing !== null && editing.id === p.id) {
              return h(EditForm, {
                key: p.id,
                t: t,
                busy: busy,
                draft: editing,
                onChange: (patch) => setEditing((current) => current === null ? null : Object.assign({}, current, patch)),
                onCancel: () => setEditing(null),
                onSave: saveEdit,
              })
            }
            return h(
              'div',
              { key: p.id, className: 'dsh-ft-row', 'data-checked': checked ? 'true' : 'false', 'data-builtin': builtin ? 'true' : 'false' },
              h(
                'button',
                {
                  type: 'button', role: 'menuitemcheckbox', 'aria-checked': checked,
                  className: 'dsh-ft-item', disabled: busy, onMouseDown: keepFocus,
                  onClick: () => toggle(p.id),
                  title: p.text.length > 90 ? p.text.slice(0, 90) + '…' : p.text,
                },
                h('span', { className: 'dsh-ft-box', 'aria-hidden': 'true' }, checked ? '✓' : ''),
                h('span', { className: 'dsh-ft-name' }, p.name),
              ),
              h('button', {
                type: 'button', className: 'dsh-ft-chip', 'data-scope': p.scope,
                disabled: busy, onMouseDown: keepFocus,
                onClick: () => cycleScope(p.id, p.scope),
                title: t('chipTip'),
              }, t(SCOPE_KEYS[p.scope])),
              builtin ? null : h(
                'button',
                {
                  type: 'button', className: 'dsh-ft-act', title: t('editTip'),
                  'aria-label': t('editEntry') + ' ' + p.name,
                  disabled: busy, onMouseDown: keepFocus,
                  onClick: () => startEdit(p),
                },
                ICONS.pencil,
              ),
              builtin ? null : h(
                'button',
                {
                  type: 'button', className: 'dsh-ft-act dsh-ft-act-del', title: t('deleteTip'),
                  'aria-label': t('deleteEntry') + ' ' + p.name,
                  disabled: busy, onMouseDown: keepFocus,
                  onClick: () => setConfirming({ id: p.id, name: p.name }),
                },
                ICONS.trash,
              ),
            )
          }),
          h('div', { className: 'dsh-ft-sep', role: 'separator' }),
          h(
            'button',
            {
              type: 'button', role: 'menuitem', className: 'dsh-ft-item',
              disabled: busy || !on, onMouseDown: keepFocus, onClick: clearAll,
            },
            h('span', { className: 'dsh-ft-box', 'aria-hidden': 'true' }),
            h('span', { className: 'dsh-ft-name' }, t('menuClear')),
          ),
          h(
            'button',
            {
              type: 'button', role: 'menuitem', className: 'dsh-ft-item dsh-ft-item-add',
              disabled: busy, onMouseDown: keepFocus,
              onClick: () => { setAdding(true); setOpen(false) },
            },
            h('span', { className: 'dsh-ft-box', 'aria-hidden': 'true' }, '＋'),
            h('span', { className: 'dsh-ft-name' }, t('addNew')),
          ),
        ),
        confirming !== null && h(ConfirmDialog, {
          t: t,
          busy: busy,
          name: confirming.name,
          onCancel: () => setConfirming(null),
          onConfirm: deleteRow,
        }),
        adding && h(AddDialog, {
          t: t,
          busy: busy,
          onCancel: () => setAdding(false),
          onSave: (name, text, scope) => {
            call('add', { name: name, text: text, scope: scope })
              .then(() => setAdding(false))
              .catch(() => { setAdding(false); setPhase('error') })
          },
        }),
      )
    }

    async function apply(ctx) {
      installStyles()
      ctx.effect(() => ctx.locale.register(NS, DICTIONARY, 'prompt-picker:dictionary'), 'prompt-picker.locale')
      const t = ctx.locale.bind(NS)
      ctx.effect(
        () =>
          ctx.slots.inject(SLOT, () =>
            ctx.slots.register(
              {
                name: SLOT,
                id: ENTRY_ID,
                order: 0,
                locale: NS,
                registrant: PACKAGE,
                inject: () => ({ t: t }),
              },
              PromptPicker,
            ),
          ),
        'prompt-picker.slot',
      )
    }

    exports.inject = ['slots', 'locale']
    exports.apply = apply
    return module.exports
  },
})
