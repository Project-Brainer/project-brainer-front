/**
 * Branch store — manages the active branch for the current project.
 *
 * null activeBranchId  → working on the root / main project directly
 * non-null             → all graph saves go through the branch endpoint
 */

import { create } from 'zustand';
import { branchesApi } from '../api/branches';
import type { Branch, CreateBranchInput, MergeResult } from '../api/types';

export interface BranchState {
  branches: Branch[];
  activeBranchId: string | null;
  loadingBranches: boolean;
  branchError: string | null;

  // modals
  commitModalOpen: boolean;
  mergeModalOpen: boolean;
  mergeResult: MergeResult | null;
  mergeSourceBranchId: string | null;

  // ---- actions ----
  loadBranches: (projectId: string) => Promise<void>;
  createBranch: (projectId: string, input: CreateBranchInput) => Promise<Branch | null>;
  setActiveBranch: (branchId: string | null) => void;
  deleteBranch: (projectId: string, branchId: string) => Promise<void>;

  openCommitModal: () => void;
  closeCommitModal: () => void;

  openMergeModal: (sourceBranchId: string, result: MergeResult) => void;
  closeMergeModal: () => void;

  reset: () => void;
}

export const useBranchStore = create<BranchState>()((set, get) => ({
  branches: [],
  activeBranchId: null,
  loadingBranches: false,
  branchError: null,

  commitModalOpen: false,
  mergeModalOpen: false,
  mergeResult: null,
  mergeSourceBranchId: null,

  async loadBranches(projectId) {
    set({ loadingBranches: true, branchError: null });
    try {
      const branches = await branchesApi.list(projectId);
      set({ branches, loadingBranches: false });
    } catch (err) {
      set({ branchError: (err as Error).message, loadingBranches: false });
    }
  },

  async createBranch(projectId, input) {
    try {
      const branch = await branchesApi.create(projectId, input);
      set((s) => ({ branches: [...s.branches, branch] }));
      return branch;
    } catch (err) {
      set({ branchError: (err as Error).message });
      return null;
    }
  },

  setActiveBranch(branchId) {
    set({ activeBranchId: branchId });
  },

  async deleteBranch(projectId, branchId) {
    try {
      await branchesApi.remove(projectId, branchId);
      const { activeBranchId } = get();
      set((s) => ({
        branches: s.branches.filter((b) => b.id !== branchId),
        activeBranchId: activeBranchId === branchId ? null : activeBranchId,
      }));
    } catch (err) {
      set({ branchError: (err as Error).message });
    }
  },

  openCommitModal() {
    set({ commitModalOpen: true });
  },
  closeCommitModal() {
    set({ commitModalOpen: false });
  },

  openMergeModal(sourceBranchId, result) {
    set({ mergeModalOpen: true, mergeSourceBranchId: sourceBranchId, mergeResult: result });
  },
  closeMergeModal() {
    set({ mergeModalOpen: false, mergeResult: null, mergeSourceBranchId: null });
  },

  reset() {
    set({
      branches: [],
      activeBranchId: null,
      loadingBranches: false,
      branchError: null,
      commitModalOpen: false,
      mergeModalOpen: false,
      mergeResult: null,
      mergeSourceBranchId: null,
    });
  },
}));

/** Selector — the active Branch object (or null for root). */
export function selectActiveBranch(state: BranchState): Branch | null {
  if (!state.activeBranchId) return null;
  return state.branches.find((b) => b.id === state.activeBranchId) ?? null;
}
