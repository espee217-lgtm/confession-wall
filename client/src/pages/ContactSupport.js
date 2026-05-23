import { Link } from "react-router-dom";
import "../styles/legalPages.css";

const supportEmail = "confession.wall.origins@gmail.com";

export default function ContactSupport() {
  return (
    <main className="legal-page">
      <article className="legal-card">
        <Link className="legal-back-link" to="/">
          Back to wall
        </Link>

        <h1 className="legal-title">Contact & Support</h1>
        <p className="legal-updated">Last updated: May 23, 2026</p>

        <section className="legal-section">
          <h2>Main Support Email</h2>
          <p>
            For all support requests, contact{" "}
            <span className="legal-email">{supportEmail}</span>.
          </p>
        </section>

        <section className="legal-section">
          <h2>What You Can Contact Us For</h2>
          <p>Users can contact Confession Wall for:</p>
          <ul className="legal-list">
            <li>Account issues.</li>
            <li>Login issues.</li>
            <li>Payment issues.</li>
            <li>Refund or cancellation requests.</li>
            <li>Seeds or digital credit issues.</li>
            <li>Report or moderation concerns.</li>
            <li>Appeals against moderation action.</li>
            <li>Privacy or data requests.</li>
            <li>Bug reports.</li>
            <li>Safety concerns.</li>
            <li>General questions.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>Response Time</h2>
          <p>
            We usually try to respond within 3 to 7 working days. Complex
            cases, payment disputes, safety reports, or moderation appeals may
            take longer.
          </p>
        </section>

        <section className="legal-section">
          <h2>What Details to Include</h2>
          <p>Please include:</p>
          <ul className="legal-list">
            <li>Registered email or username.</li>
            <li>Issue type.</li>
            <li>Clear explanation of the issue.</li>
            <li>Screenshots, if available.</li>
            <li>Payment ID or order ID if payment-related.</li>
            <li>Post/comment link or screenshot if content-related.</li>
            <li>Device and browser details if bug-related.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>Urgent Safety or Legal Concerns</h2>
          <p>
            For urgent safety or legal concerns, write{" "}
            <strong>Urgent Safety Concern</strong> in the email subject.
          </p>
          <div className="legal-note">
            Confession Wall is not an emergency service. If someone is in
            immediate danger, they should contact local emergency services or
            trusted people nearby.
          </div>
        </section>

        <section className="legal-section">
          <h2>Operator</h2>
          <p>
            Confession Wall is operated by Confession Wall Origins, a
            registered Micro enterprise.
          </p>
        </section>

        <div className="legal-divider" />
      </article>
    </main>
  );
}
