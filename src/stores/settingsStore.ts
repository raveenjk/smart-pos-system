import { create } from 'zustand';
import type { AppSettings } from '../types';

interface SettingsStore {
  settings: Partial<AppSettings>;
  isLoading: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<boolean>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: {
    shop_name: 'POS System',
    shop_subtitle: 'Retail & POS',
    shop_address: '',
    shop_phone: '',
    currency: 'LKR',
    receipt_footer: 'Thank you for shopping with us! Please come again.',
  },
  isLoading: false,

  loadSettings: async () => {
    if (!window.api) return;
    set({ isLoading: true });
    try {
      const data = await window.api.getSettings();
      if (data) {
        set({ settings: data });
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  updateSettings: async (newSettings: Partial<AppSettings>) => {
    const updated = { ...get().settings, ...newSettings };
    set({ settings: updated });
    if (window.api) {
      try {
        await window.api.updateSettings(updated as AppSettings);
        return true;
      } catch (err) {
        console.error('Failed to update settings:', err);
        return false;
      }
    }
    return true;
  },
}));
