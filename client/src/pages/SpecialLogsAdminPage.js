import React, { useState } from "react";
import "./SpecialLogsAdminPage.css";

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://confession-wall-hn63.onrender.com");

export default function SpecialLogsAdminPage() {
  const [secret, setSecret] = useState("");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    try {
      setLoading(true);

      const res = await fetch(`${API_BASE}/api/special-activity/logs`, {
        headers: {
          "x-admin-log-secret": secret,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Could not fetch logs.");
        return;
      }

      setLogs(data);
    } catch (err) {
      console.error(err);
      alert("Something went wrong while fetching logs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="special-admin-page">
      <section className="special-admin-header">
        <p>Admin Logs</p>
        <h1>Special Section Activity</h1>
        <span>
          Track who entered Reenaa’s section, opened pages, and submitted trivia.
        </span>

        <div className="special-admin-secret">
          <input
            type="password"
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            placeholder="Enter ADMIN_LOG_SECRET"
          />

          <button type="button" onClick={fetchLogs} disabled={loading || !secret}>
            {loading ? "Loading..." : "Load Logs"}
          </button>
        </div>
      </section>

      <section className="special-log-list">
        {logs.map((log) => (
          <article className="special-log-card" key={log._id}>
            <div className="special-log-top">
              <div>
                <h2>{log.action}</h2>
                <p>{log.page || "No page recorded"}</p>
              </div>

              <time>
                {new Date(log.createdAt).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </time>
            </div>

            <div className="special-log-user">
              <span>Email</span>
              <strong>{log.userEmail || "Unknown"}</strong>
            </div>

            <div className="special-log-user">
              <span>Name</span>
              <strong>{log.userName || "Unknown"}</strong>
            </div>

            {log.details && Object.keys(log.details).length > 0 && (
              <pre className="special-log-details">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            )}
          </article>
        ))}

        {!logs.length && (
          <div className="special-empty">
            No logs loaded yet. Enter your admin secret and click Load Logs.
          </div>
        )}
      </section>
    </main>
  );
}