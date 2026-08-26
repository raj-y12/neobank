import { AuthPanel } from "./AuthPanel";

export default function LoginPage() {
  return (
    <div className="auth-shell">
      <div className="auth-layout"><AuthPanel /></div>
      <footer className="auth-footer"><span>© Corgi</span><span>Privacy</span></footer>
    </div>
  );
}
