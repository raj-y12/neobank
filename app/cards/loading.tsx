export default function Loading() {
  return (
    <>
      <section className="intro">
        <div>
          <span className="skel" style={{ width: 90, height: 28 }} />
          <span className="skel" style={{ width: 220, height: 14, marginTop: 10 }} />
        </div>
        <span className="skel" style={{ width: 110, height: 40, borderRadius: 999 }} />
      </section>

      <section className="card-tile-grid section-panel" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card-tile is-skeleton">
            <div className="card-tile-top">
              <span className="skel" style={{ width: 70, height: 12 }} />
            </div>
            <span className="skel" style={{ width: 150, height: 16 }} />
            <div className="card-tile-bottom">
              <span className="skel" style={{ width: 80, height: 14 }} />
              <span className="skel" style={{ width: 60, height: 14 }} />
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
