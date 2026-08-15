import React, { useState } from "react";
import { userExists, registerUser, setSession } from "./game.js";

export default function Login({ onLoggedIn }) {
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState("idle"); // idle | checking | not-found | error
  const [pendingName, setPendingName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const attemptLogin = async (e) => {
    e.preventDefault();
    const name = username.trim();
    if (!name) {
      setStatus("error");
      setErrorMsg("Bitte gib einen Nutzernamen ein.");
      return;
    }
    setStatus("checking");
    try {
      const exists = await userExists(name);
      if (exists) {
        setSession(name);
        onLoggedIn(name);
      } else {
        setPendingName(name);
        setStatus("not-found");
      }
    } catch (err) {
      setStatus("error");
      setErrorMsg("Verbindung fehlgeschlagen. Bitte nochmal versuchen.");
    }
  };

  const handleRegister = async () => {
    setStatus("checking");
    try {
      await registerUser(pendingName);
      setSession(pendingName);
      onLoggedIn(pendingName);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message || "Registrierung fehlgeschlagen.");
    }
  };

  const handleCancel = () => {
    setStatus("idle");
    setPendingName("");
  };

  const isChecking = status === "checking";

  return (
    <div className="tg-app">
      <div className="device">
        <div className="device-label">WAY TO BRETTANIEN</div>
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
                disabled={isChecking}
              />
              {status === "checking" && <div className="login-msg">Einen Moment …</div>}
              {status === "not-found" && (
                <div className="login-msg">
                  Diesen Nutzer gibt es noch nicht.
                  <br />
                  Für „{pendingName}" registrieren?
                </div>
              )}
              {status === "error" && <div className="login-msg">{errorMsg}</div>}
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
            <button className="btn btn-wide" onClick={attemptLogin} disabled={isChecking}>
              <span>{isChecking ? "Einen Moment …" : "Einloggen"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
