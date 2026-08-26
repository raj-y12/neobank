"use client";

import { useState } from "react";
import { LoginForm } from "./LoginForm";
import { SignupForm } from "./SignupForm";
import { BrandMark } from "../components/BrandMark";

export function AuthPanel() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const isLogin = mode === "login";

  return (
    <section className="auth-card" aria-labelledby="auth-heading">
      <div className="auth-brand-lockup">
        <BrandMark className="auth-brand-mark" />
        <strong>Corgi</strong>
      </div>
      <p className="auth-kicker">{isLogin ? "Business banking" : "New to Corgi"}</p>
      <h1 id="auth-heading" className="auth-heading">{isLogin ? "Welcome back" : "Create your account"}</h1>
      <p className="intro-copy">{isLogin ? "Sign in to manage your business account." : "Set up your workspace in a few steps."}</p>
      {isLogin ? <LoginForm /> : <SignupForm />}
      <div className="auth-switch">
        <span>{isLogin ? "New to Corgi?" : "Already have an account?"}</span>
        <button className="auth-switch-button" type="button" onClick={() => setMode(isLogin ? "signup" : "login")}>
          {isLogin ? "Create account" : "Sign in"}
        </button>
      </div>
    </section>
  );
}
