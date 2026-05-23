import { Link } from "react-router-dom";
import "../styles/legalPages.css";

const supportEmail = "confession.wall.origins@gmail.com";

export default function ModerationReportPolicy() {
  return (
    <main className="legal-page">
      <article className="legal-card">
        <Link className="legal-back-link" to="/">
          Back to wall
        </Link>

        <h1 className="legal-title">Moderation & Report Policy</h1>
        <p className="legal-updated">Last updated: May 23, 2026</p>

        <section className="legal-section">
          <h2>1. Overview</h2>
          <p>
            Confession Wall allows users to report posts and comments that may
            violate Community Guidelines, privacy rules, platform rules, payment
            rules, or applicable law.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. What Can Be Reported</h2>
          <p>Users may report:</p>
          <ul className="legal-list">
            <li>Harassment.</li>
            <li>Hate speech.</li>
            <li>Threats.</li>
            <li>Doxxing or private information sharing.</li>
            <li>Impersonation.</li>
            <li>Spam or scams.</li>
            <li>Illegal content.</li>
            <li>Sexual content involving minors.</li>
            <li>Self-harm encouragement.</li>
            <li>Graphic violence.</li>
            <li>Payment abuse or fraud.</li>
            <li>Content violating Community Guidelines.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>3. How Reports Are Reviewed</h2>
          <p>
            Reports may be reviewed by admin or moderation. Moderation is not
            always instant. No platform can guarantee all harmful content is
            removed immediately, but Confession Wall will make reasonable
            efforts.
          </p>
        </section>

        <section className="legal-section">
          <h2>4. Possible Actions</h2>
          <p>After review, Confession Wall may:</p>
          <ul className="legal-list">
            <li>Take no action if no violation is found.</li>
            <li>Hide or remove a post.</li>
            <li>Remove a comment.</li>
            <li>Issue a warning.</li>
            <li>Restrict features.</li>
            <li>Suspend an account.</li>
            <li>Ban an account.</li>
            <li>Reverse Seeds, digital credits, or cosmetics.</li>
            <li>
              Preserve records for safety, abuse prevention, disputes, payment
              review, or legal compliance.
            </li>
            <li>Escalate when legally required.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>5. False Reports</h2>
          <p>
            False, repeated, malicious, or abusive reports may be ignored and
            may lead to action against the reporter.
          </p>
        </section>

        <section className="legal-section">
          <h2>6. Appeals</h2>
          <p>
            Users can appeal moderation decisions by emailing{" "}
            <span className="legal-email">{supportEmail}</span>.
          </p>
          <p>Appeal emails should include:</p>
          <ul className="legal-list">
            <li>Registered email or username.</li>
            <li>Post/comment link or screenshot.</li>
            <li>Explanation.</li>
            <li>Reason they believe the moderation action was incorrect.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>7. Payment Abuse and Platform Abuse</h2>
          <p>
            Payment fraud, chargebacks, refund abuse, suspicious transactions,
            exploitation of Seeds or digital credits, or attempts to manipulate
            the platform may result in account restrictions and reversal of
            Seeds, cosmetics, or access.
          </p>
        </section>

        <section className="legal-section">
          <h2>8. Legal and Safety Compliance</h2>
          <p>
            Confession Wall may preserve logs, report records, payment records,
            and moderation history when needed for:
          </p>
          <ul className="legal-list">
            <li>Security.</li>
            <li>Abuse prevention.</li>
            <li>Fraud prevention.</li>
            <li>Payment disputes.</li>
            <li>Legal compliance.</li>
            <li>Platform integrity.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>9. Contact</h2>
          <p>
            For moderation or report concerns, contact{" "}
            <span className="legal-email">{supportEmail}</span>.
          </p>
        </section>

        <div className="legal-divider" />
      </article>
    </main>
  );
}
