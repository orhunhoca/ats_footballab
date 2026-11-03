import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { branchService, type Branch } from "@/services/branchService";

const STORAGE_KEY = "footbalLab.selectedBranch";

interface BranchContextValue {
  /** Tüm şubeler (pasifler dahil) */
  branches: Branch[];
  /** Yalnızca aktif şubeler (formlarda seçilebilenler) */
  activeBranches: Branch[];
  /** Seçili şube; null = Tüm Şubeler */
  selectedBranchId: string | null;
  setSelectedBranchId: (id: string | null) => void;
  loading: boolean;
  reload: () => Promise<void>;
  getBranchName: (id?: string | null) => string;
  /** Yeni kayıt formlarında varsayılan şube: seçili şube, yoksa tek aktif şube, yoksa boş */
  defaultBranchId: string;
}

const BranchContext = createContext<BranchContextValue | undefined>(undefined);

function readStored(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStored(id: string | null) {
  try {
    if (id) window.localStorage.setItem(STORAGE_KEY, id);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* tarayıcı depolaması kapalı olabilir */
  }
}

export function BranchProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedState] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const data = await branchService.getAll();
      setBranches(data);
      // Kayıtlı seçim artık yoksa/pasifse "Tüm Şubeler"e dön
      const stored = readStored();
      const valid = stored && data.some((b) => b.id === stored && b.is_active) ? stored : null;
      setSelectedState(valid);
      if (!valid && stored) writeStored(null);
    } catch (error) {
      console.error("Şubeler yüklenemedi:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) reload();
  }, [enabled, reload]);

  const setSelectedBranchId = useCallback((id: string | null) => {
    setSelectedState(id);
    writeStored(id);
  }, []);

  const value = useMemo<BranchContextValue>(() => {
    const activeBranches = branches.filter((b) => b.is_active);
    const defaultBranchId = selectedBranchId ?? (activeBranches.length === 1 ? activeBranches[0].id : "");
    return {
      branches,
      activeBranches,
      selectedBranchId,
      setSelectedBranchId,
      loading,
      reload,
      getBranchName: (id) => (id ? branches.find((b) => b.id === id)?.name ?? "—" : "—"),
      defaultBranchId,
    };
  }, [branches, selectedBranchId, setSelectedBranchId, loading, reload]);

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}

export function useBranch(): BranchContextValue {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error("useBranch yalnızca BranchProvider içinde kullanılabilir");
  return ctx;
}
