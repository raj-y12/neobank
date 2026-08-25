import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand-mark auth-brand-mark" aria-label="Corgi">c</div>
        <p className="eyebrow">Corgi business banking</p>
        <h2 className="auth-heading">Sign in to your account.</h2>
        <p className="intro-copy">Use the demo credentials provided for your role.</p>
        <LoginForm />
      </div>
      <p className="auth-footnote">
        Sandbox environment · every balance shown is derived from an append-only ledger
      </p>
    </div>
  );
}
