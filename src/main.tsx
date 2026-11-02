import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { StoreProvider } from "./store";
import { GroupSync } from "./sync/GroupSync";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <StoreProvider>
      <GroupSync>
        <App />
      </GroupSync>
    </StoreProvider>
  </React.StrictMode>,
);
