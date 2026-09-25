import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { getAnalysis } from "../api/analysis";
import type { Analysis } from "../types/analysis";
import type { ActiveDocument } from "../components/layout/DocumentIdentity";
import {
  deleteAnalysisFromSupabase,
  listAnalysesFromSupabase,
  type SupabaseHistorySummary,
} from "../api/supabaseHistory";

export type WorkspacePane = "analysis" | "history";

interface WorkspaceValue {
  /** Which rail pane is showing. Backed by ?pane= so reload and back work. */
  pane: WorkspacePane;
  setPane: (pane: WorkspacePane) => void;
  /** The analysis currently loaded into the stage, if any. */
  activeId: string | undefined;
  /** Loads an analysis into the stage without leaving the workspace. */
  select: (id: string) => void;
  /** Clears the stage back to the upload experience. */
  clear: () => void;

  entries: SupabaseHistorySummary[] | null;
  historyError: string | null;
  refresh: () => void;
  remove: (id: string) => Promise<void>;

  /** The analysis on the stage. Polled once here and shared by the rail,
   *  the stage and the chrome, so there is only ever one poll in flight. */
  analysis: Analysis | null;
  analysisError: string | null;
  /** Identity of whatever is on the stage, for the chrome. */
  activeDocument: ActiveDocument | null;
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

/**
 * Holds the workspace's own state: which pane the rail shows, which analysis
 * is on the stage, and the history list shared between them.
 *
 * History is fetched once here rather than per-pane, so switching panes or
 * selecting an entry never refetches and never remounts the stage. Data still
 * goes through the existing api/supabaseHistory seam untouched.
 */
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // The provider sits in the Layout, above the route that carries `:id`, so
  // the active analysis is read from the path rather than from useParams.
  const activeId = location.pathname.startsWith("/w/")
    ? location.pathname.slice(3).split("/")[0] || undefined
    : undefined;
  const inWorkspace = location.pathname.startsWith("/w");

  const pane: WorkspacePane =
    searchParams.get("pane") === "history" ? "history" : "analysis";

  const [entries, setEntries] = useState<SupabaseHistorySummary[] | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  /**
   * Keyed by the id it belongs to. Deriving "is this stale?" during render
   * means switching analyses needs no synchronous reset inside the effect —
   * the previous document's data simply stops matching and is ignored.
   */
  const [stream, setStream] = useState<{
    id: string;
    analysis: Analysis | null;
    error: string | null;
  } | null>(null);

  const current = stream && stream.id === activeId ? stream : null;
  const analysis = current?.analysis ?? null;
  const analysisError = current?.error ?? null;

  // No synchronous setState here: the effect below only starts the fetch, and
  // state is written when it settles. Clearing the error on success rather
  // than on request also avoids a flash of "no error" during a retry.
  const refresh = useCallback(() => {
    listAnalysesFromSupabase()
      .then((rows) => {
        setEntries(rows);
        setHistoryError(null);
      })
      .catch((err) => {
        setHistoryError(
          err instanceof Error ? err.message : "Could not load your history.",
        );
        setEntries([]);
      });
  }, []);

  useEffect(() => {
    if (!session || !inWorkspace) return;
    refresh();
  }, [refresh, session, inWorkspace]);

  /**
   * The single analysis poll. Unchanged in behaviour from the page it
   * replaces: poll every 800ms, stop on a terminal status, and surface a
   * load failure rather than spinning forever.
   */
  useEffect(() => {
    if (!activeId) return;

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      try {
        const result = await getAnalysis(activeId);
        if (cancelled) return;
        setStream({ id: activeId, analysis: result, error: null });
        if (result.status === "COMPLETED" || result.status === "FAILED") {
          if (timer) clearInterval(timer);
        }
      } catch (err) {
        if (cancelled) return;
        setStream({
          id: activeId,
          analysis: null,
          error:
            err instanceof Error
              ? err.message
              : "Could not load this analysis. The server may be unreachable.",
        });
        if (timer) clearInterval(timer);
      }
    };

    poll();
    timer = setInterval(poll, 800);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [activeId]);

  const activeDocument: ActiveDocument | null = useMemo(
    () =>
      analysis
        ? {
            id: analysis.id,
            documentName: analysis.documentName,
            status: analysis.status,
            riskLevel: analysis.risk?.level,
          }
        : null,
    [analysis],
  );

  const setPane = useCallback(
    (next: WorkspacePane) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (next === "history") params.set("pane", "history");
          else params.delete("pane");
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const select = useCallback(
    (id: string) => {
      const suffix = pane === "history" ? "?pane=history" : "";
      navigate(`/w/${id}${suffix}`);
    },
    [navigate, pane],
  );

  const clear = useCallback(() => {
    navigate("/w");
  }, [navigate]);

  /** Mirrors the previous page's behaviour exactly: delete, then drop the row
   *  from the list. Storage-before-row ordering lives in the API, untouched. */
  const remove = useCallback(
    async (id: string) => {
      setHistoryError(null);
      try {
        await deleteAnalysisFromSupabase(id);
        setEntries((prev) => prev?.filter((entry) => entry.id !== id) ?? null);
        if (id === activeId) navigate("/w?pane=history", { replace: true });
      } catch (err) {
        setHistoryError(
          err instanceof Error ? err.message : "Could not delete that analysis.",
        );
        throw err;
      }
    },
    [activeId, navigate],
  );

  const value = useMemo(
    () => ({
      pane, setPane, activeId, select, clear,
      entries, historyError, refresh, remove,
      analysis, analysisError, activeDocument,
    }),
    [
      pane, setPane, activeId, select, clear,
      entries, historyError, refresh, remove,
      analysis, analysisError, activeDocument,
    ],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWorkspace(): WorkspaceValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}
