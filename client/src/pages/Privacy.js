export default function Privacy() {
  return (
    <div style={{ minHeight: "100vh", padding: "40px 18px", background: "#071407", color: "#dfffd8", fontFamily: "Georgia, serif" }}>
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>
        <h1>Privacy Policy</h1>
        <p>We collect only the information needed to run Confession Wall.</p>

        <h3>Information We Store</h3>
        <p>Username, email, hashed password, profile picture, posts, comments, reactions, and reports.</p>

        <h3>Anonymous Posts</h3>
        <p>Posts may appear anonymous publicly, but the system may still store account ownership for safety and moderation.</p>

        <h3>Reports</h3>
        <p>Reports are visible to admins for moderation purposes.</p>

        <h3>Data Removal</h3>
        <p>Users may delete their account where supported. Admins may remove harmful content.</p>
      </div>
    </div>
  );
}