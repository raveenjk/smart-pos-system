import { create } from 'zustand';
import type { Employee } from '../types';

interface AuthStore {
  currentEmployee: Employee | null;
  setCurrentEmployee: (employee: Employee | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  currentEmployee: {
    id: 1,
    name: 'Admin',
    role: 'admin',
    phone: '',
    is_active: true,
  },
  setCurrentEmployee: (employee) => set({ currentEmployee: employee }),
  logout: () => set({ currentEmployee: null }),
}));
