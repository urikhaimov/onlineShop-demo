import { create } from 'zustand';

interface SidebarState {
  mobileOpen: boolean;
  expanded: boolean;
  cartOpen: boolean;
  anchorEl: HTMLElement | null;

  toggleMobileDrawer: () => void;
  closeMobileDrawer: () => void;
  setExpanded: (expanded: boolean) => void;

  openCartDrawer: () => void;
  closeCartDrawer: () => void;

  setAnchorEl: (el: HTMLElement | null) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  mobileOpen: false,
  expanded: true,
  cartOpen: false,
  anchorEl: null,

  toggleMobileDrawer: () => set((state) => ({ mobileOpen: !state.mobileOpen })),

  closeMobileDrawer: () => set({ mobileOpen: false }),

  setExpanded: (expanded) => set({ expanded }),

  openCartDrawer: () => set({ cartOpen: true }),

  closeCartDrawer: () => set({ cartOpen: false }),

  setAnchorEl: (el) => set({ anchorEl: el }),
}));
