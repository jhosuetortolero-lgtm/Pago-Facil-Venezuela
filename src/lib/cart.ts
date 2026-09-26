"use client";

import { create } from "zustand";

export interface CartProduct {
  id: string;
  name: string;
  price_usd: number;
}

export interface CartItem extends CartProduct {
  quantity: number;
}

type CartState = {
  items: CartItem[];
  add: (item: CartProduct) => void;
  remove: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clear: () => void;
};

export const useCart = create<CartState>((set) => ({
  items: [],
  add: (item) =>
    set((state) => {
      const existingItem = state.items.find((cartItem) => cartItem.id === item.id);
      if (existingItem) {
        return {
          items: state.items.map((cartItem) =>
            cartItem.id === item.id
              ? { ...cartItem, quantity: cartItem.quantity + 1 }
              : cartItem,
          ),
        };
      }
      return {
        items: [...state.items, { ...item, quantity: 1 }],
      };
    }),
  remove: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),
  updateQuantity: (id, quantity) =>
    set((state) => {
      if (!Number.isFinite(quantity)) return state;

      const normalizedQuantity = Math.max(1, Math.trunc(quantity));
      return {
        items: state.items.map((item) =>
          item.id === id ? { ...item, quantity: normalizedQuantity } : item,
        ),
      };
    }),
  clear: () => set({ items: [] }),
}));
