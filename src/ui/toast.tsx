import { useEffect, useRef } from 'react'
import { create } from 'zustand'
import { Icon } from './kit'

type Toast = { id: number; message: string; action?: { label: string; run: () => void }; duration: number }

const useToasts = create<{ items: Toast[]; push: (t: Toast) => void; drop: (id: number) => void }>((set) => ({
  items: [],
  push: (t) => set((s) => ({ items: [...s.items.slice(-2), t] })),
  drop: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
}))

let seq = 0

export function toast(message: string, opts: { action?: Toast['action']; duration?: number } = {}) {
  const id = ++seq
  useToasts.getState().push({ id, message, action: opts.action, duration: opts.duration ?? (opts.action ? 7000 : 4000) })
  return id
}

function Item({ item, closeLabel }: { item: Toast; closeLabel: string }) {
  const drop = useToasts((s) => s.drop)
  const timer = useRef<number | undefined>(undefined)
  const left = useRef(item.duration)
  const started = useRef(0)

  const start = () => {
    started.current = Date.now()
    timer.current = window.setTimeout(() => drop(item.id), left.current)
  }
  const pause = () => {
    window.clearTimeout(timer.current)
    left.current -= Date.now() - started.current
  }

  useEffect(() => {
    start()
    return () => window.clearTimeout(timer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="toast" role="status" onPointerEnter={pause} onPointerLeave={start} onFocus={pause} onBlur={start}>
      <span className="toast-msg">{item.message}</span>
      {item.action && (
        <button
          type="button"
          className="toast-action"
          onClick={() => {
            item.action!.run()
            drop(item.id)
          }}
        >
          {item.action.label}
        </button>
      )}
      <button type="button" className="toast-close" aria-label={closeLabel} onClick={() => drop(item.id)}>
        <Icon name="x" size={14} />
      </button>
      <i className="toast-time" style={{ animationDuration: `${item.duration}ms` }} />
    </div>
  )
}

export function Toaster({ closeLabel }: { closeLabel: string }) {
  const items = useToasts((s) => s.items)
  return (
    <div className="toasts" aria-live="polite">
      {items.map((t) => (
        <Item key={t.id} item={t} closeLabel={closeLabel} />
      ))}
    </div>
  )
}
