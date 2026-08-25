import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return <section className="panel auth-panel">
    <p className="eyebrow">Corgi business banking</p>
    <h2>Sign in to your business account.</h2>
    <p className="intro-copy">Use the demo credentials supplied for your role.</p>
    <LoginForm />
  </section>;
}
