"use client";

import { useEffect, useState } from "react";
import { onSnapshot, Query, FirestoreError } from "firebase/firestore";

interface State<T> {
  data: T[];
  loading: boolean;
  error: string | null;
}

/**
 * Subscribes to a live Firestore query and keeps a component in sync in
 * real time — the dashboard, live GPS feed and activity stream all rely on
 * this rather than polling, matching the design system's "instantaneous
 * operational clarity" requirement.
 */
export function useLiveCollection<T>(query: Query<T> | null): State<T> {
  const [state, setState] = useState<State<T>>({ data: [], loading: true, error: null });

  useEffect(() => {
    if (!query) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    const unsub = onSnapshot(
      query,
      (snap) => {
        setState({ data: snap.docs.map((d) => d.data()), loading: false, error: null });
      },
      (err: FirestoreError) => {
        setState({ data: [], loading: false, error: err.message });
      }
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return state;
}
