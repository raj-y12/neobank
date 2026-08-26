import { TeamClient } from "./TeamClient";

export default function TeamPage() {
  return (
    <>
      <section className="intro">
        <div>
          <h2>Employees</h2>
          <p className="muted">Invite employees to your business and choose whether they can approve payments or use delegated cards.</p>
        </div>
      </section>

      <section className="panel">
        <TeamClient />
      </section>
    </>
  );
}
