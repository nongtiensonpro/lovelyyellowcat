// useGalleryReactions.ts — đếm reaction cho gallery + realtime sync (debounce).
// Tách khỏi Grid để Grid chỉ lo orchestration render; logic đếm là side-effect thuần.
import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { shouldRefetch } from "./galleryQuery";

const supabaseClient = getSupabaseBrowserClient();

export function useGalleryReactions(): Record<string, number> {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const lastFetchRef = useRef<number | null>(null);

  const fetchAll = useCallback(async () => {
    const { data, error } = await supabaseClient.from("reactions").select("article_id");
    if (!error && data) {
      const next: Record<string, number> = {};
      for (const row of data as Array<{ article_id: string }>) {
        next[row.article_id] = (next[row.article_id] || 0) + 1;
      }
      setCounts(next);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const channel = supabaseClient
      .channel("gallery-reactions-counts")
      .on("postgres_changes", { event: "*", schema: "public", table: "reactions" }, () => {
        if (shouldRefetch(lastFetchRef.current, Date.now())) {
          lastFetchRef.current = Date.now();
          fetchAll();
        }
      })
      .subscribe();
    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [fetchAll]);

  return counts;
}
