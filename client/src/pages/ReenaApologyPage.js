import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { logSpecialActivity } from "../utils/logSpecialActivity";
import "./ReenaApologyPage.css";

export default function ReenaApologyPage() {
  const { user } = useAuth();
  const userName = user?.username || user?.name || "";

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }, []);

  useEffect(() => {
    if (!user?.email) return;

    logSpecialActivity({
      userEmail: user.email,
      userName,
      action: "entered_apology_section",
      page: "/reena-apology",
    });
  }, [user?.email, userName]);

  return (
    <main className="apology-page">
      <section className="apology-card">
        <p className="apology-kicker">My personal message</p>

        <h1>From my heart, Reenaa</h1>

        <div className="apology-letter">
          <p>
            It&apos;s been quite some days since you talked to me, and I honestly
            missed you a lot.
          </p>

          <p>
            I do remember the times where I hurt you, and I blame myself for it
            every day. Perhaps that is why I sent you messages every three days
            or so.
          </p>

          <p>
            I made this to apologize, and perhaps put a smile on your face at
            least even a little.
          </p>

          <p>
            I&apos;m extremely sorry, dear. I really want to talk to you again,
            to share the days with you again, and hear yours too.
          </p>

          <p className="apology-final">
            Please dear, please forgive me.
          </p>
        </div>

        <div className="apology-actions">
          <Link to="/" className="apology-btn secondary">
            Return to Main Site
          </Link>

          <Link to="/reena" className="apology-btn primary">
            Back to Reenaa&apos;s Garden
          </Link>
        </div>
      </section>
    </main>
  );
}