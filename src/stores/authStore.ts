import { create } from 'zustand';
import type { Employee, PermissionKey } from '../types';
import { checkPermission } from '../types';

interface AuthStore {
  currentEmployee: Employee | null;
  temporaryOverrides: PermissionKey[];
  setCurrentEmployee: (employee: Employee | null) => void;
  logout: () => void;
  can: (permission: PermissionKey) => boolean;
  isAdmin: () => boolean;
  isManagerOrAdmin: () => boolean;
  grantOverride: (permission: PermissionKey) => void;
  clearOverrides: () => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  currentEmployee: null,
  temporaryOverrides: [],

  setCurrentEmployee: (employee) => set({ currentEmployee: employee, temporaryOverrides: [] }),
  logout: () => set({ currentEmployee: null, temporaryOverrides: [] }),

  can: (permission: PermissionKey) => {
    const { currentEmployee, temporaryOverrides } = get();
    if (temporaryOverrides.includes(permission)) return true;
    if (!currentEmployee) return false;
    return checkPermission(currentEmployee.role, permission);
  },

  isAdmin: () => {
    const { currentEmployee } = get();
    return currentEmployee?.role === 'admin';
  },

  isManagerOrAdmin: () => {
    const { currentEmployee } = get();
    return currentEmployee?.role === 'admin' || currentEmployee?.role === 'manager';
  },

  grantOverride: (permission: PermissionKey) => {
    set((state) => ({
      temporaryOverrides: [...state.temporaryOverrides, permission],
    }));
  },

  clearOverrides: () => set({ temporaryOverrides: [] }),
}));
