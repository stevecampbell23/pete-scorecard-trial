import { useState } from "react";
import { useGroup } from "../sync/GroupSync";
import { useStore } from "../store";

export function GroupBlock() {
  const { state } = useStore();
  const g = useGroup();
  const [code, setCode] = useState("");
  const room = state.room;

  return (
    <div className="block">
      <h3>More than one phone</h3>
      <p className="note" style={{ margin: 0 }}>
        One phone starts the group. Everybody else joins the code. Buddies and the live card stay in sync. Your yardage bag stays on this phone.
      </p>
      {room ? (
        <>
          <div className="hero" style={{ borderTop: "none" }}>
            <div>
              <span className="eyebrow">Group code</span>
              <span className="big">{room.code}</span>
              <span className="sub">{room.role === "host" ? "You started it" : "You joined"} · {g.peers} other phone{g.peers === 1 ? "" : "s"}</span>
            </div>
          </div>
          <div className="row">
            <button className="btn small" type="button" onClick={() => g.copyLink()}>
              Copy link
            </button>
            <button className="btn small ghost" type="button" onClick={() => g.leave()}>
              Leave group
            </button>
          </div>
        </>
      ) : (
        <>
          <button className="btn solid" type="button" onClick={() => g.startHost()}>
            Start a group
          </button>
          <div className="row">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="CODE"
              maxLength={4}
              aria-label="Group code"
              style={{ width: 120, letterSpacing: "0.2em", fontWeight: 800 }}
            />
            <button className="btn small" type="button" onClick={() => g.join(code)}>
              Join
            </button>
          </div>
        </>
      )}
      {g.status ? <span className="note">{g.status}</span> : null}
    </div>
  );
}
