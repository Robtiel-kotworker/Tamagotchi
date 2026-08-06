import React, { useState } from "react";
import { userExists, registerUser, setSession } from "./game.js";

export default function Login({ onLoggedIn }) {
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState("idle"); // idle | not-found | error
  const [pendingName, setPendingName] = useState("");

  const attemptLogin = (e) => {
    e.preventDefault();
    const name = username.trim();
    if (!name) {
      setStatus("error");
      return;
    }
    if (userExists(name)) {
      setSession(name);
      onLoggedIn(name);
    } else {
      setPendingName(name);
      setStatus("not-found");
    }
  };

  const handleRegister = () => {
    registerUser(pendingName);
    setSession(pendingName);
    onLoggedIn(pendingName);
  };

  const handleCancel = () => {
    setStatus("idle");
    setPendingName("");
  };

  return (
    <div className="tg-app">
      <div className="device">
        <div className="device-label">TAMA・PET</div>
        <div className="screen">
          <div className="screen-scanlines" />
          <div className="screen-top">
            <span className="stage-tag">LOGIN</span>
          </div>

          <div className="login-panel">
            <div className="login-hint">Wie heißt du?</div>
            <form onSubmit={attemptLogin} className="login-form">
              <input
                type="text"
                className="login-input"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (status !== "idle") setStatus("idle");
                }}
                placeholder="Nutzername"
                maxLength={20}
                autoFocus
              />
              {status === "not-found" && (
                <div className="login-msg">
                  Diesen Nutzer gibt es noch nicht.
                  <br />
                  Für „{pendingName}" registrieren?
                </div>
              )}
              {status === "error" && (
                <div className="login-msg">Bitte gib einen Nutzernamen ein.</div>
              )}
            </form>
          </div>
        </div>

        <div className="controls">
          {status === "not-found" ? (
            <>
              <button className="btn" onClick={handleCancel}>
                <span>Abbrechen</span>
              </button>
              <button className="btn" onClick={handleRegister}>
                <span>Registrieren</span>
              </button>
            </>
          ) : (
            <button className="btn btn-wide" onClick={attemptLogin}>
              <span>Einloggen</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
