/**
 * UI-only state: selection, current canvas mode, side panel visibility, etc.
 * Kept separate from the graph store so that simulation/canvas can be reset
 * without touching graph data.
 */

import { create } from 'zustand';
import type { ValidationIssue } from '../api/types';

export type CanvasMode = 'design' | 'simulate';

export interface UiState {
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  focusNodeId: string | null;
  /** null = show all; string = focus-mode: show only this page's nodes + globals */
  focusedPageId: string | null;
  mode: CanvasMode;
  validationIssues: ValidationIssue[];
  validationRunAt: number | null;
  validationRunning: boolean;
  validationError: string | null;
  promptModalOpen: boolean;
  promptScopeNodeIds: string[] | null;
  sidebarOpen: boolean;
  rightPanelOpen: boolean;
  /** Which sidebar tab is active: pages list or elements list */
  sidebarTab: 'pages' | 'elements';

  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  clearSelection: () => void;
  focusNode: (id: string) => void;
  clearFocusNode: () => void;
  setFocusedPage: (pageId: string | null) => void;
  setMode: (mode: CanvasMode) => void;
  setValidation: (issues: ValidationIssue[]) => void;
  setValidationRunning: (running: boolean) => void;
  setValidationError: (msg: string | null) => void;
  openPromptModal: (scope?: string[] | null) => void;
  closePromptModal: () => void;
  toggleSidebar: () => void;
  toggleRightPanel: () => void;
  setSidebarTab: (tab: 'pages' | 'elements') => void;
}

export const useUiStore = create<UiState>()((set) => ({
  selectedNodeId: null,
  selectedEdgeId: null,
  focusNodeId: null,
  focusedPageId: null,
  mode: 'design',
  validationIssues: [],
  validationRunAt: null,
  validationRunning: false,
  validationError: null,
  promptModalOpen: false,
  promptScopeNodeIds: null,
  sidebarOpen: true,
  rightPanelOpen: true,
  sidebarTab: 'pages',

  selectNode(id) {
    set({ selectedNodeId: id, selectedEdgeId: null });
  },
  selectEdge(id) {
    set({ selectedEdgeId: id, selectedNodeId: null });
  },
  clearSelection() {
    set({ selectedNodeId: null, selectedEdgeId: null });
  },
  focusNode(id) {
    set({ focusNodeId: id });
  },
  clearFocusNode() {
    set({ focusNodeId: null });
  },
  setFocusedPage(pageId) {
    set({ focusedPageId: pageId });
  },
  setMode(mode) {
    set({ mode });
  },
  setValidation(issues) {
    set({
      validationIssues: issues,
      validationRunAt: Date.now(),
      validationError: null,
      validationRunning: false,
    });
  },
  setValidationRunning(running) {
    set({ validationRunning: running });
  },
  setValidationError(msg) {
    set({ validationError: msg, validationRunning: false });
  },
  openPromptModal(scope = null) {
    set({ promptModalOpen: true, promptScopeNodeIds: scope });
  },
  closePromptModal() {
    set({ promptModalOpen: false, promptScopeNodeIds: null });
  },
  toggleSidebar() {
    set((s) => ({ sidebarOpen: !s.sidebarOpen }));
  },
  toggleRightPanel() {
    set((s) => ({ rightPanelOpen: !s.rightPanelOpen }));
  },
  setSidebarTab(tab) {
    set({ sidebarTab: tab });
  },
}));
