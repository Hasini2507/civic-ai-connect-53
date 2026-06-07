import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribe to postgres_changes on given tables and invalidate query keys
 * on any change. Cleans up on unmount.
 */
export function useRealtime(
  channelName: string,
  tables: string[],
  invalidateKeys: (string | (string | number)[])[],
) {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase.channel(channelName);
    for (const table of tables) {
      ch.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
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
  }, [channelName, tables.join(","), JSON.stringify(invalidateKeys)]);
}
