import { LoginForm } from "./LoginForm";
import { SignupForm } from "./SignupForm";

export default function LoginPage() {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand-mark auth-brand-mark" aria-label="Corgi">c</div>
        <p className="eyebrow">Corgi business banking</p>
        <h2 className="auth-heading">Sign in to your account.</h2>
        <p className="intro-copy">Use your business login to continue.</p>
        <LoginForm />
        <div className="auth-divider"><span>New business?</span></div>
        <SignupForm />
      </div>
      <p className="auth-footnote">
        Sandbox environment · every balance shown is derived from an append-only ledger
      </p>
    </div>
  );
}
