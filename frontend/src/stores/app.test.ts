/**
 * App Store tests
 * @module @task-filewas/frontend/stores/app.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useAppStore, PANEL_CONSTRAINTS } from './app';

describe('useAppStore', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    // Reset store to initial state
    const { reset } = useAppStore.getState();
    reset();
  });

  afterEach(() => {
    // Cleanup after each test
    const { reset } = useAppStore.getState();
    reset();
  });

  it('should initialize with default state', () => {
    const state = useAppStore.getState();

    expect(state.sidebarWidth).toBe(220);
    expect(state.inboxWidth).toBe(300);
    expect(state.isSidebarCollapsed).toBe(false);
    expect(state.currentProjectId).toBe(null);
    expect(state.theme).toBe('dark');
    expect(state.isCommandPaletteOpen).toBe(false);
    expect(state.isSettingsOpen).toBe(false);
    expect(state.isShortcutsHelpOpen).toBe(false);
    expect(state.breadcrumb).toEqual([]);
  });

  it('should set sidebar width within constraints', () => {
    const { setSidebarWidth } = useAppStore.getState();
    setSidebarWidth(250);

    const { sidebarWidth } = useAppStore.getState();
    expect(sidebarWidth).toBe(250);
  });

  it('should clamp sidebar width to min constraint', () => {
    const { setSidebarWidth } = useAppStore.getState();
    setSidebarWidth(100); // Below min (180)

    const { sidebarWidth } = useAppStore.getState();
    expect(sidebarWidth).toBe(180); // Min constraint
  });

  it('should clamp sidebar width to max constraint', () => {
    const { setSidebarWidth } = useAppStore.getState();
    setSidebarWidth(500); // Above max (320)

    const { sidebarWidth } = useAppStore.getState();
    expect(sidebarWidth).toBe(320); // Max constraint
  });

  it('should set inbox width within constraints', () => {
    const { setInboxWidth } = useAppStore.getState();
    setInboxWidth(350);

    const { inboxWidth } = useAppStore.getState();
    expect(inboxWidth).toBe(350);
  });

  it('should clamp inbox width to min constraint', () => {
    const { setInboxWidth } = useAppStore.getState();
    setInboxWidth(100); // Below min (240)

    const { inboxWidth } = useAppStore.getState();
    expect(inboxWidth).toBe(240); // Min constraint
  });

  it('should clamp inbox width to max constraint', () => {
    const { setInboxWidth } = useAppStore.getState();
    setInboxWidth(600); // Above max (480)

    const { inboxWidth } = useAppStore.getState();
    expect(inboxWidth).toBe(480); // Max constraint
  });

  it('should toggle sidebar collapsed state', () => {
    const { toggleSidebar } = useAppStore.getState();

    expect(useAppStore.getState().isSidebarCollapsed).toBe(false);

    toggleSidebar();
    expect(useAppStore.getState().isSidebarCollapsed).toBe(true);

    toggleSidebar();
    expect(useAppStore.getState().isSidebarCollapsed).toBe(false);
  });

  it('should set sidebar collapsed state explicitly', () => {
    const { setSidebarCollapsed } = useAppStore.getState();

    setSidebarCollapsed(true);
    expect(useAppStore.getState().isSidebarCollapsed).toBe(true);

    setSidebarCollapsed(false);
    expect(useAppStore.getState().isSidebarCollapsed).toBe(false);
  });

  it('should set current project ID', () => {
    const { setCurrentProjectId } = useAppStore.getState();

    setCurrentProjectId('project-123');
    expect(useAppStore.getState().currentProjectId).toBe('project-123');

    setCurrentProjectId(null);
    expect(useAppStore.getState().currentProjectId).toBe(null);
  });

  it('should set command palette open state', () => {
    const { setCommandPaletteOpen } = useAppStore.getState();

    setCommandPaletteOpen(true);
    expect(useAppStore.getState().isCommandPaletteOpen).toBe(true);

    setCommandPaletteOpen(false);
    expect(useAppStore.getState().isCommandPaletteOpen).toBe(false);
  });

  it('should toggle command palette state', () => {
    const { toggleCommandPalette } = useAppStore.getState();

    toggleCommandPalette();
    expect(useAppStore.getState().isCommandPaletteOpen).toBe(true);

    toggleCommandPalette();
    expect(useAppStore.getState().isCommandPaletteOpen).toBe(false);
  });

  it('should set settings open state', () => {
    const { setSettingsOpen } = useAppStore.getState();

    setSettingsOpen(true);
    expect(useAppStore.getState().isSettingsOpen).toBe(true);

    setSettingsOpen(false);
    expect(useAppStore.getState().isSettingsOpen).toBe(false);
  });

  it('should toggle settings state', () => {
    const { toggleSettings } = useAppStore.getState();

    toggleSettings();
    expect(useAppStore.getState().isSettingsOpen).toBe(true);

    toggleSettings();
    expect(useAppStore.getState().isSettingsOpen).toBe(false);
  });

  it('should set shortcuts help open state', () => {
    const { setShortcutsHelpOpen } = useAppStore.getState();

    setShortcutsHelpOpen(true);
    expect(useAppStore.getState().isShortcutsHelpOpen).toBe(true);

    setShortcutsHelpOpen(false);
    expect(useAppStore.getState().isShortcutsHelpOpen).toBe(false);
  });

  it('should toggle shortcuts help state', () => {
    const { toggleShortcutsHelp } = useAppStore.getState();

    toggleShortcutsHelp();
    expect(useAppStore.getState().isShortcutsHelpOpen).toBe(true);

    toggleShortcutsHelp();
    expect(useAppStore.getState().isShortcutsHelpOpen).toBe(false);
  });

  it('should set breadcrumb', () => {
    const { setBreadcrumb } = useAppStore.getState();
    const breadcrumb = ['Home', 'Projects', 'My Project'];

    setBreadcrumb(breadcrumb);

    expect(useAppStore.getState().breadcrumb).toEqual(breadcrumb);
  });

  it('should reset to initial state', () => {
    const { reset: resetStore, setSidebarWidth, toggleSidebar, setCurrentProjectId, toggleCommandPalette, setBreadcrumb } =
      useAppStore.getState();

    // Modify state
    setSidebarWidth(250);
    toggleSidebar();
    setCurrentProjectId('project-123');
    toggleCommandPalette();
    setBreadcrumb(['Home', 'Test']);

    // Verify state is modified
    expect(useAppStore.getState().sidebarWidth).toBe(250);
    expect(useAppStore.getState().isSidebarCollapsed).toBe(true);
    expect(useAppStore.getState().currentProjectId).toBe('project-123');
    expect(useAppStore.getState().isCommandPaletteOpen).toBe(true);
    expect(useAppStore.getState().breadcrumb).toEqual(['Home', 'Test']);

    // Reset
    resetStore();

    // Verify reset to initial state
    const state = useAppStore.getState();
    expect(state.sidebarWidth).toBe(220);
    expect(state.inboxWidth).toBe(300);
    expect(state.isSidebarCollapsed).toBe(false);
    expect(state.currentProjectId).toBe(null);
    expect(state.isCommandPaletteOpen).toBe(false);
    expect(state.isSettingsOpen).toBe(false);
    expect(state.isShortcutsHelpOpen).toBe(false);
    expect(state.breadcrumb).toEqual([]);
  });
});

describe('PANEL_CONSTRAINTS', () => {
  it('should have correct sidebar constraints', () => {
    expect(PANEL_CONSTRAINTS.sidebar.min).toBe(180);
    expect(PANEL_CONSTRAINTS.sidebar.default).toBe(220);
    expect(PANEL_CONSTRAINTS.sidebar.max).toBe(320);
  });

  it('should have correct inbox constraints', () => {
    expect(PANEL_CONSTRAINTS.inbox.min).toBe(240);
    expect(PANEL_CONSTRAINTS.inbox.default).toBe(300);
    expect(PANEL_CONSTRAINTS.inbox.max).toBe(480);
  });

  it('should have correct spacing values', () => {
    expect(PANEL_CONSTRAINTS.windowEdge).toBe(6);
    expect(PANEL_CONSTRAINTS.panelSpacing).toBe(5);
  });
});
