import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type RealtimeTable =
  | string
  | { table: string; filter?: string };

/**
 * Subscribe to postgres_changes on given tables and invalidate query keys
 * on any change. Each table entry can specify a server-side filter so users
 * only receive events for rows they are authorized to see. RLS is still the
 * primary gate — filters are defense-in-depth.
 *
 * Channel names are suffixed with a random token so they cannot be guessed
 * or collided with by other clients.
 */
export function useRealtime(
  channelName: string,
  tables: RealtimeTable[],
  invalidateKeys: (string | (string | number)[])[],
) {
  const qc = useQueryClient();
  useEffect(() => {
    const uniqueName = `${channelName}:${crypto.randomUUID()}`;
    const ch = supabase.channel(uniqueName, { config: { private: false } });
    for (const t of tables) {
      const table = typeof t === "string" ? t : t.table;
      const filter = typeof t === "string" ? undefined : t.filter;
      ch.on(
        "postgres_changes",
        { event: "*", schema: "public", table, ...(filter ? { filter } : {}) },
        () => {
          for (const key of invalidateKeys) {
            qc.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] });
          }
        },
      );
    }
    ch.subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, JSON.stringify(tables), JSON.stringify(invalidateKeys)]);
}
