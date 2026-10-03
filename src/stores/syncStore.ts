import { create } from 'zustand';
import type { SyncStatus } from '../types';

interface SyncStore {
  status: SyncStatus;
  pendingCount: number;
  setStatus: (status: SyncStatus) => void;
  setPendingCount: (count: number) => void;
}

export const useSyncStore = create<SyncStore>((set) => ({
  status: 'offline',
  pendingCount: 0,
  setStatus: (status) => set({ status }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
}));
