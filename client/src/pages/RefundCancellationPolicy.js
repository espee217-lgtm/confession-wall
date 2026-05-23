import { Link } from "react-router-dom";
import "../styles/legalPages.css";

const supportEmail = "confession.wall.origins@gmail.com";

export default function RefundCancellationPolicy() {
  return (
    <main className="legal-page">
      <article className="legal-card">
        <Link className="legal-back-link" to="/">
          Back to wall
        </Link>

        <h1 className="legal-title">Refund & Cancellation Policy</h1>
        <p className="legal-updated">Last updated: May 23, 2026</p>

        <section className="legal-section">
          <h2>1. Overview</h2>
          <p>
            Confession Wall may offer paid digital credits, cosmetic items,
            profile features, event-related items, or other digital features
            inside the platform. Seeds are digital credits used only inside
            Confession Wall.
          </p>
          <p>
            Seeds are not crypto, not gambling, not investment, not
            withdrawable, not redeemable for cash, and not transferable outside
            Confession Wall.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Digital Delivery</h2>
          <p>
            Digital credits and items are usually delivered instantly or shortly
            after successful payment. Because these are digital items, refunds
            are generally not provided after successful delivery or usage.
          </p>
        </section>

        <section className="legal-section">
          <h2>3. Cases Where Refund May Be Considered</h2>
          <p>Refunds may be considered only in cases such as:</p>
          <ul className="legal-list">
            <li>Duplicate payment.</li>
            <li>Failed payment where money was deducted.</li>
            <li>Payment successful but Seeds or digital credits were not credited.</li>
            <li>Accidental overcharge.</li>
            <li>Technical error from the platform or payment provider.</li>
            <li>Unauthorized transaction reported quickly with proof.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>4. Refund Request Window</h2>
          <p>
            Users must contact Confession Wall within 7 days of the payment
            issue. Requests made after this period may not be eligible for
            review.
          </p>
        </section>

        <section className="legal-section">
          <h2>5. Required Details for Refund Request</h2>
          <p>
            Email <span className="legal-email">{supportEmail}</span> with:
          </p>
          <ul className="legal-list">
            <li>Registered email or username.</li>
            <li>Payment ID, order ID, or transaction ID.</li>
            <li>Date of payment.</li>
            <li>Amount paid.</li>
            <li>Screenshot, if available.</li>
            <li>Short explanation of the issue.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>6. Refund Method</h2>
          <p>
            Approved refunds will be sent back to the original payment method
            where possible. Processing time may depend on the payment provider,
            bank, card network, or other payment partner involved.
          </p>
        </section>

        <section className="legal-section">
          <h2>7. Cancellation Policy</h2>
          <p>
            Since digital credits and items may be delivered quickly,
            cancellation is not available after successful delivery or use.
            Pending or failed payments may be cancelled or auto-refunded
            depending on the payment provider.
          </p>
        </section>

        <section className="legal-section">
          <h2>8. Reversal Rights</h2>
          <p>
            Confession Wall may reverse Seeds, cosmetics, digital credits, or
            access if a refund, chargeback, fraud, abuse, or policy violation
            occurs.
          </p>
        </section>

        <section className="legal-section">
          <h2>9. Abuse and Fraud</h2>
          <p>
            Repeated refund abuse, chargeback abuse, suspicious payment
            activity, or policy violation may lead to account restrictions,
            suspension, or ban.
          </p>
        </section>

        <section className="legal-section">
          <h2>10. Contact</h2>
          <p>
            For refund or cancellation issues, contact{" "}
            <span className="legal-email">{supportEmail}</span>.
          </p>
        </section>

        <div className="legal-divider" />
      </article>
    </main>
  );
}
