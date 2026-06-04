import { Link } from "react-router-dom";
import "../styles/legalPages.css";

const supportEmail = "confession.wall.origins@gmail.com";

export default function CommunityGuidelines() {
  return (
    <main className="legal-page">
      <article className="legal-card">
        <Link className="legal-back-link" to="/">
          Back to wall
        </Link>

        <h1 className="legal-title">Community Guidelines</h1>
        <p className="legal-updated">Last updated: May 23, 2026</p>

        <section className="legal-section">
          <h2>1. Purpose</h2>
          <p>
            Confession Wall is a platform for anonymous emotional venting,
            thoughts, stories, dilemmas, life experiences, and community
            support. The goal is to create a place where people can speak
            honestly while respecting others.
          </p>
        </section>

        <section className="guidelines-transparency-note" aria-labelledby="seeded-demo-content-title">
          <h2 id="seeded-demo-content-title" className="guidelines-transparency-title">
            Seeded Demo Content Transparency
          </h2>
          <p className="guidelines-transparency-text">
            Transparency note: During the early stage of Confession Wall, some
            visible confessions, comments, reactions, and accounts may be seeded
            demo content. These seed accounts help show how the platform works,
            what kinds of anonymous posts people can make, and how community
            interactions look while the real user base grows. Seeded content is
            used for demonstration and onboarding, not to replace real
            participation. As real confessions and community activity grow,
            seeded demo content may be reduced or removed so the space becomes
            fully shaped by real users. Real users can still post, comment,
            react, report, and interact normally.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Not Therapy or an Emergency Service</h2>
          <p>
            Confession Wall is not therapy, medical advice, legal advice,
            financial advice, or an emergency service. If users are in immediate
            danger or crisis, they should contact local emergency services or
            trusted people nearby.
          </p>
        </section>

        <section className="legal-section">
          <h2>3. Respectful Behavior</h2>
          <p>Users should:</p>
          <ul className="legal-list">
            <li>Be respectful.</li>
            <li>Avoid targeted attacks.</li>
            <li>Avoid humiliating others.</li>
            <li>Disagree without harassment.</li>
            <li>Support others without pretending to be professionals.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>4. Prohibited Content</h2>
          <p>Do not post or promote:</p>
          <ul className="legal-list">
            <li>Harassment or bullying.</li>
            <li>Hate speech.</li>
            <li>Threats or incitement to violence.</li>
            <li>Doxxing or sharing private personal information.</li>
            <li>Impersonation.</li>
            <li>Spam.</li>
            <li>Scams or fraud.</li>
            <li>Illegal content.</li>
            <li>Sexual content involving minors.</li>
            <li>Adult solicitation.</li>
            <li>Graphic violence.</li>
            <li>Self-harm encouragement.</li>
            <li>Instructions for dangerous or illegal acts.</li>
            <li>Promotion of drugs, weapons, gambling, illegal services, or fraud.</li>
            <li>Content that violates someone's privacy or rights.</li>
            <li>Copyrighted content posted without permission.</li>
            <li>Malicious links, viruses, or harmful software.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>5. User-Generated Content</h2>
          <p>
            Users are responsible for what they post. Anonymous posting does
            not mean users can harm, threaten, expose, or abuse others.
          </p>
        </section>

        <section className="legal-section">
          <h2>6. Reporting</h2>
          <p>
            Users can report posts or comments that violate these guidelines.
            Reports will be reviewed by moderation or admin where possible.
          </p>
        </section>

        <section className="legal-section">
          <h2>7. Enforcement</h2>
          <p>Violations may result in:</p>
          <ul className="legal-list">
            <li>Content removal.</li>
            <li>Comment removal.</li>
            <li>Warning.</li>
            <li>Temporary restriction.</li>
            <li>Suspension.</li>
            <li>Ban.</li>
            <li>Seed or digital credit reversal.</li>
            <li>Cosmetic or access reversal.</li>
            <li>Escalation if legally required.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>8. Digital Credits and Seeds</h2>
          <p>
            Seeds are digital credits used only inside Confession Wall. Seeds
            are not crypto, not gambling, not investment, not withdrawable, not
            redeemable for cash, and not transferable outside Confession Wall.
          </p>
          <p>
            Abuse, fraud, chargebacks, or policy violations may lead to Seed
            reversal or account restriction.
          </p>
        </section>

        <section className="legal-section">
          <h2>9. Contact</h2>
          <p>
            For guideline questions or appeals, contact{" "}
            <span className="legal-email">{supportEmail}</span>.
          </p>
        </section>

        <div className="legal-divider" />
      </article>
    </main>
  );
}
