import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

export interface SelectOption<T extends string> {
  value: T
  label: string
  hint?: string
}

interface Props<T extends string> {
  value: T | null
  options: SelectOption<T>[]
  onChange: (value: T) => void
  placeholder?: string
  /** 让触发按钮和 label 关联起来，方便屏幕阅读器 */
  'aria-label'?: string
}

/**
 * 替代原生 <select> 的下拉选择：触发按钮 + 浮出的 listbox。
 * 支持方向键 / Enter / Esc / Home / End，点击外部关闭。
 */
export default function Select<T extends string>({
  value,
  options,
  onChange,
  placeholder = '请选择',
  'aria-label': ariaLabel
}: Props<T>): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listId = useId()

  const selectedIndex = options.findIndex((o) => o.value === value)
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null

  function openList(): void {
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)
    setOpen(true)
  }

  function closeList(refocus = true): void {
    setOpen(false)
    if (refocus) buttonRef.current?.focus()
  }

  function commit(index: number): void {
    const opt = options[index]
    if (!opt) return
    if (opt.value !== value) onChange(opt.value)
    closeList()
  }

  useEffect(() => {
    if (!open) return
    listRef.current?.focus()
    function onPointerDown(e: MouseEvent): void {
      if (!rootRef.current?.contains(e.target as Node)) closeList(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  useEffect(() => {
    if (!open || activeIndex < 0) return
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [open, activeIndex])

  function onButtonKeyDown(e: React.KeyboardEvent): void {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openList()
    }
  }

  function onListKeyDown(e: React.KeyboardEvent): void {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex((i) => Math.min(options.length - 1, i + 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((i) => Math.max(0, i - 1))
        break
      case 'Home':
        e.preventDefault()
        setActiveIndex(0)
        break
      case 'End':
        e.preventDefault()
        setActiveIndex(options.length - 1)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        commit(activeIndex)
        break
      case 'Escape':
        e.preventDefault()
        closeList()
        break
      case 'Tab':
        closeList(false)
        break
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? closeList() : openList())}
        onKeyDown={onButtonKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        className={`panel-2 flex w-full items-center justify-between gap-3 rounded-lg px-3.5 py-2.5 text-left text-sm ring-1 transition-shadow hover:ring-ink/20 ${
          open ? 'ring-accent/60' : 'ring-ink/10'
        }`}
      >
        <span className={selected ? 'text-ink/85' : 'text-ink/40'}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-ink/45 transition-transform duration-150 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          onKeyDown={onListKeyDown}
          className="popover absolute left-0 right-0 top-[calc(100%+6px)] z-10 max-h-64 overflow-y-auto rounded-lg p-1 outline-none"
        >
          {options.map((opt, i) => {
            const isSelected = opt.value === value
            const isActive = i === activeIndex
            return (
              <li
                key={opt.value}
                id={`${listId}-${i}`}
                data-index={i}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => commit(i)}
                className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm ${
                  isActive ? 'bg-accent text-accent-fg' : 'text-ink/80'
                }`}
              >
                <span className="flex-1">
                  {opt.label}
                  {opt.hint && <span className="ml-2 text-xs opacity-60">{opt.hint}</span>}
                </span>
                {isSelected && <Check className="size-3.5 shrink-0" />}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
