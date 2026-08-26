export default function Loading() {
  return (
    <>
      <section className="intro">
        <span className="skel" style={{ width: 140, height: 32 }} />
        <span className="skel" style={{ width: 130, height: 40, borderRadius: 999 }} />
      </section>

      <section className="dashboard-grid">
        <article className="account-card" aria-hidden="true">
          <div className="account-card-top">
            <div>
              <span className="skel" style={{ width: 180, height: 40 }} />
              <span className="skel" style={{ width: 220, height: 14, marginTop: 10 }} />
            </div>
            <div className="account-card-actions">
              <span className="skel" style={{ width: 100, height: 36, borderRadius: 999 }} />
              <span className="skel" style={{ width: 110, height: 36, borderRadius: 999 }} />
              <span className="skel" style={{ width: 90, height: 36, borderRadius: 999 }} />
            </div>
          </div>
          <div className="account-card-transactions">
            <div className="skeleton-list">
              <span /><span /><span /><span />
            </div>
          </div>
        </article>

        <aside className="widgets-rail">
          <div className="widget-card">
            <span className="skel" style={{ width: 90, height: 20, marginBottom: 16 }} />
            <span className="skel" style={{ width: "100%", height: 48, marginBottom: 8 }} />
            <span className="skel" style={{ width: "100%", height: 48 }} />
          </div>
          <div className="widget-card">
            <span className="skel" style={{ width: 140, height: 20, marginBottom: 16 }} />
            <span className="skel" style={{ width: "100%", height: 48 }} />
          </div>
        </aside>
      </section>
    </>
  );
}
