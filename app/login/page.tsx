import { AuthPanel } from "./AuthPanel";

export default function LoginPage() {
  return (
    <div className="auth-shell">
      <header className="auth-header">
        <div className="brand-mark auth-brand-mark" aria-hidden="true">c</div>
        <strong>Corgi</strong>
      </header>
      <div className="auth-layout"><AuthPanel /></div>
      <footer className="auth-footer"><span>© Corgi</span><span>Privacy</span></footer>
    </div>
  );
}
