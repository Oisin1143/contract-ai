// src/LiveUserCount.jsx
// Live registered-user count for the header. Reads from public.profiles
// (a public mirror of auth.users maintained by a DB trigger — see
// supabase-user-count-setup.sql, since auth.users itself can't be queried
// from the browser) and subscribes to inserts so a new signup ticks the
// number up in real time for anyone with the page open, not just on
// refresh.

import { useState, useEffect } from "react";
import { supabase } from "./supabase";

export default function LiveUserCount() {
  const [count, setCount] = useState(null);
  const [justBumped, setJustBumped] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .then(({ count: c, error }) => {
        if (!cancelled && !error && typeof c === "number") setCount(c);
      });

    const channel = supabase
      .channel("profiles-count")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "profiles" },
        () => {
          setCount((c) => (c === null ? c : c + 1));
          setJustBumped(true);
          setTimeout(() => setJustBumped(false), 1200);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  if (count === null) return null;

  return (
    <div className={`user-count-badge ${justBumped ? "user-count-bump" : ""}`}>
      <div className="live-dot" />
      <span className="user-count-num">{count.toLocaleString()}</span>
      <span>registered</span>
    </div>
  );
}
