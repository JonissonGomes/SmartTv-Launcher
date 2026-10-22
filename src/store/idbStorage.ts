import { del, get, set } from 'idb-keyval'
import type { StateStorage } from 'zustand/middleware'

const memory = new Map<string, string>()

async function safeGet(name: string): Promise<string | null> {
  try {
    const value = await get<string>(name)
    if (value !== undefined) {
      memory.set(name, value)
      return value
    }
  } catch (err) {
    console.warn('[storage] get falhou, usando memória', err)
  }
  return memory.get(name) ?? null
}

async function safeSet(name: string, value: string): Promise<void> {
  memory.set(name, value)
  try {
    await set(name, value)
  } catch (err) {
    console.warn('[storage] set falhou, mantendo só em memória', err)
  }
}

async function safeDel(name: string): Promise<void> {
  memory.delete(name)
  try {
    await del(name)
  } catch (err) {
    console.warn('[storage] del falhou', err)
  }
}

/** Storage Zustand com fallback em memória (IndexedDB pode falhar no Simulator). */
export const idbStorage: StateStorage = {
  getItem: async (name) => safeGet(name),
  setItem: async (name, value) => {
    await safeSet(name, value)
  },
  removeItem: async (name) => {
    await safeDel(name)
  },
}
