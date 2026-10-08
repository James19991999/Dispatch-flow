"use client";

import { useEffect, useRef, useState } from "react";
import { onSnapshot, queryEqual, Query, FirestoreError } from "firebase/firestore";
import { reportQueryError } from "./queryErrors";

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
export function useLiveCollection<T>(incoming: Query<T> | null): State<T> {
  const [state, setState] = useState<State<T>>({ data: [], loading: true, error: null });

  // Pages build a brand-new Query object on every render. Keying the effect on
  // that object identity re-subscribed after every render, and because the
  // effect also set state, the page re-rendered forever (frozen UI, clicks
  // "doing nothing"). Keep the previous Query while the new one is equivalent.
  const stable = useRef<Query<T> | null>(incoming);
  if (incoming !== stable.current) {
    const same = incoming && stable.current && queryEqual(incoming, stable.current);
    if (!same) stable.current = incoming;
  }
  const query = stable.current;

  useEffect(() => {
    if (!query) {
      setState((s) => (s.data.length === 0 && !s.loading && !s.error ? s : { data: [], loading: false, error: null }));
      return;
    }
    setState((s) => (s.loading ? s : { ...s, loading: true }));
    const unsub = onSnapshot(
      query,
      (snap) => {
        setState({ data: snap.docs.map((d) => d.data()), loading: false, error: null });
      },
      (err: FirestoreError) => {
        reportQueryError(`${err.code}: ${err.message}`);
        setState({ data: [], loading: false, error: err.message });
      }
    );
    return unsub;
  }, [query]);

  return state;
}
