import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Peer, type DataConnection } from "peerjs";
import { getSnapshot, isRemoteApply, subscribe, useActions } from "../store";
import { shareSlice, type SharedSlice } from "../engine/merge";
import { codeFromHash, groupUrl, makeRoomCode, normalizeRoomCode, peerIdFor } from "../engine/roomCode";

type Msg = { type: "hello" | "state"; slice: SharedSlice };

type Api = {
  status: string;
  peers: number;
  startHost: () => void;
  join: (code: string) => void;
  leave: () => void;
  copyLink: () => void;
};

const Ctx = createContext<Api | null>(null);

export function useGroup() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("group sync missing");
  return ctx;
}

export function GroupSync({ children }: { children: ReactNode }) {
  const actions = useActions();
  const peerRef = useRef<Peer | null>(null);
  const conns = useRef(new Set<DataConnection>());
  const [status, setStatus] = useState("");
  const [peers, setPeers] = useState(0);
  const timer = useRef(0);

  function recount() {
    setPeers([...conns.current].filter((c) => c.open).length);
  }

  function send(conn: DataConnection, type: Msg["type"]) {
    if (!conn.open) return;
    conn.send({ type, slice: shareSlice(getSnapshot().state) } satisfies Msg);
  }

  function broadcast() {
    for (const c of conns.current) send(c, "state");
  }

  function hook(conn: DataConnection) {
    conn.on("open", () => {
      conns.current.add(conn);
      recount();
      send(conn, "hello");
    });
    conn.on("data", (raw) => {
      const msg = raw as Msg;
      if (!msg || (msg.type !== "hello" && msg.type !== "state") || !msg.slice) return;
      actions.applyShared(msg.slice);
      if (getSnapshot().state.room?.role === "host") {
        window.setTimeout(broadcast, 40);
      }
    });
    conn.on("close", () => {
      conns.current.delete(conn);
      recount();
    });
    conn.on("error", () => {
      conns.current.delete(conn);
      recount();
    });
  }

  function kill() {
    window.clearTimeout(timer.current);
    for (const c of conns.current) c.close();
    conns.current.clear();
    peerRef.current?.destroy();
    peerRef.current = null;
    recount();
  }

  function startHost(code = makeRoomCode()) {
    kill();
    const id = peerIdFor(code);
    const peer = new Peer(id);
    peerRef.current = peer;
    setStatus("Opening the group…");
    peer.on("open", () => {
      actions.setRoom({ code, role: "host" });
      setStatus("Waiting for Buddies. Keep this phone on.");
    });
    peer.on("connection", hook);
    peer.on("error", (err) => {
      const t = (err as { type?: string }).type;
      if (t === "unavailable-id") {
        join(code);
        return;
      }
      setStatus("Couldn’t open a group. Try again on the course Wi‑Fi.");
    });
  }

  function join(raw: string) {
    const code = normalizeRoomCode(raw);
    if (code.length !== 4) {
      setStatus("Code is 4 letters.");
      return;
    }
    kill();
    const peer = new Peer();
    peerRef.current = peer;
    setStatus("Finding the group…");
    peer.on("open", () => {
      const conn = peer.connect(peerIdFor(code), { reliable: true });
      hook(conn);
      actions.setRoom({ code, role: "guest" });
      setStatus("Connected. Scores land on every phone in the group.");
    });
    peer.on("error", () => {
      setStatus("Couldn’t join. Check the code, and that one phone started the group.");
    });
  }

  function leave() {
    kill();
    actions.setRoom(null);
    setStatus("");
    if (window.location.hash.includes("g=")) history.replaceState(null, "", window.location.pathname + window.location.search);
  }

  function copyLink() {
    const code = getSnapshot().state.room?.code;
    if (!code) return;
    void navigator.clipboard?.writeText(groupUrl(code));
    setStatus("Link copied. They open it and they’re in.");
  }

  useEffect(() => {
    const off = subscribe(() => {
      if (isRemoteApply()) return;
      if (!getSnapshot().state.room) return;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(broadcast, 180);
    });
    return () => {
      off();
    };
  }, []);

  useEffect(() => {
    const boot = codeFromHash(window.location.hash);
    const existing = getSnapshot().state.room;
    if (boot) join(boot);
    else if (existing?.role === "host") startHost(existing.code);
    else if (existing?.role === "guest") join(existing.code);
    return () => kill();
    // reconnect once on load
  }, []);

  const api: Api = { status, peers, startHost, join, leave, copyLink };
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
