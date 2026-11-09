import { useCallback, useEffect, useState } from "react";
import type { Tables } from "@/integrations/supabase/types";
import { groupService } from "@/services/groupService";
import { fieldService, type BranchField } from "@/services/fieldService";
import type { Occupancy, Session } from "@/lib/groupRules";

export type DirectoryGroup = Tables<"groups"> & { coaches?: Tables<"coaches"> | null };

/** Gruplar + doluluk + seanslar + sahalar (öneri ve seçim listeleri için) */
export function useGroupDirectory(enabled = true) {
  const [groups, setGroups] = useState<DirectoryGroup[]>([]);
  const [occupancy, setOccupancy] = useState<Record<string, Occupancy>>({});
  const [sessions, setSessions] = useState<Record<string, Session[]>>({});
  const [fields, setFields] = useState<Record<string, BranchField>>({});
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [g, o, s, f] = await Promise.all([
        groupService.getAllGroups(),
        groupService.getOccupancy().catch(() => ({} as Record<string, Occupancy>)),
        groupService.getAllSessions().catch(() => ({} as Record<string, Session[]>)),
        fieldService.list().catch(() => [] as BranchField[]),
      ]);
      setGroups(g as DirectoryGroup[]);
      setOccupancy(o);
      setSessions(s);
      setFields(Object.fromEntries(f.map((x) => [x.id, x])));
    } catch (e) {
      console.error("Grup listesi yüklenemedi:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) reload();
  }, [enabled, reload]);

  return { groups, occupancy, sessions, fields, loading, reload };
}
