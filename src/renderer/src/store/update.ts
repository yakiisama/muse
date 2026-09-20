import { create } from "zustand";
import type { UpdateCheckResult } from "@shared/types";

interface UpdateState {
  /** 启动时或手动检查发现的新版本；null 表示没有（或还没检查） */
  available: UpdateCheckResult | null;
  setAvailable: (res: UpdateCheckResult | null) => void;
}

export const useUpdateStore = create<UpdateState>((set) => ({
  available: null,
  setAvailable: (res) => set({ available: res?.hasUpdate ? res : null }),
}));
