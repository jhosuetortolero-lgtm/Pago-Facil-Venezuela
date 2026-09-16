"use client";

import { create } from "zustand";

export type CartProduct = { id: string; name: string; price_usd: number };
type CartState = { items: CartProduct[]; add: (item: CartProduct) => void; remove: (id: string) => void; clear: () => void };

export const useCart = create<CartState>((set) => ({
  items: [],
  add: (item) => set((state) => ({ items: [...state.items, item] })),
  remove: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
  clear: () => set({ items: [] }),
}));
