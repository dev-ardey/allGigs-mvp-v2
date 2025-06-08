import { useState } from "react";
import { supabase } from "../../SupabaseClient";

export default function LoginForm() {
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    if (mode === "login") {
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      setMessage(loginError ? loginError.message : "Logged in!");
    } else if (mode === "signup") {
      const { data, error: signupError } = await supabase.auth.signUp({ email, password });
      if (!signupError && data.user) {
        // Insert profile info
        await supabase.from("profiles").insert([
          {
            id: data.user.id,
            name,
            surname,
            linkedin,
          },
        ]);
      }
      setMessage(signupError ? signupError.message : "Check your email to confirm your account!");
    } else if (mode === "forgot") {
      try {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=/jobs`
        });
        if (resetError) {
          console.error("Password reset error:", resetError);
          setMessage(`Error: ${resetError.message}`);
        } else {
          setMessage("Password reset email sent! Please check your inbox and spam folder.");
        }
      } catch (error) {
        console.error("Unexpected error during password reset:", error);
        setMessage("An unexpected error occurred. Please try again.");
      }
    }
  };

  return (
    <form
      onSubmit={handleLogin}
      style={{
        maxWidth: 400,
        margin: "2rem auto",
        padding: 24,
        borderRadius: 8,
        background: "#fff",
        boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
      }}
    >
      <input
        type="email"
        placeholder="Email"
        value={email}
        required
        onChange={e => setEmail(e.target.value)}
        style={{
          width: "100%",
          marginBottom: 12,
          padding: 8,
          borderRadius: 6,
          border: "1px solid #ccc",
        }}
      />

      {mode === "signup" && (
        <>
          <input
            type="text"
            placeholder="First name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            style={{
              width: "100%",
              marginBottom: 12,
              padding: 8,
              borderRadius: 6,
              border: "1px solid #ccc",
            }}
          />
          <input
            type="text"
            placeholder="Surname"
            value={surname}
            onChange={e => setSurname(e.target.value)}
            required
            style={{
              width: "100%",
              marginBottom: 12,
              padding: 8,
              borderRadius: 6,
              border: "1px solid #ccc",
            }}
          />
          <input
            type="url"
            placeholder="LinkedIn URL"
            value={linkedin}
            onChange={e => setLinkedin(e.target.value)}
            required
            style={{
              width: "100%",
              marginBottom: 12,
              padding: 8,
              borderRadius: 6,
              border: "1px solid #ccc",
            }}
          />
        </>
      )}

      {mode !== "forgot" && (
        <input
          type="password"
          placeholder="Password"
          value={password}
          required
          onChange={e => setPassword(e.target.value)}
          style={{
            width: "100%",
            marginBottom: 12,
            padding: 8,
            borderRadius: 6,
            border: "1px solid #ccc",
          }}
        />
      )}

      <button
        type="submit"
        style={{
          width: "100%",
          padding: 10,
          borderRadius: 6,
          background: "#4f46e5",
          color: "#fff",
          border: "none",
          marginBottom: 12,
          fontWeight: 600,
          fontSize: 16,
          cursor: "pointer",
        }}
      >
        {mode === "login" && "Login"}
        {mode === "signup" && "Sign Up"}
        {mode === "forgot" && "Reset Password"}
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: mode !== "forgot" ? "16px" : "0" }}>
        {mode !== "forgot" && (
          <span
            style={{ color: "#4f46e5", cursor: "pointer", fontSize: 14 }}
            onClick={() => setMode("forgot")}
          >
            Forgot?
          </span>
        )}
        <span style={{ fontSize: 14 }}>
          {mode === "login" && (
            <>
              No account?{" "}
              <span
                style={{ color: "#4f46e5", cursor: "pointer" }}
                onClick={() => setMode("signup")}
              >
                Sign up
              </span>
            </>
          )}
          {mode === "signup" && (
            <>
              Already have an account?{" "}
              <span
                style={{ color: "#4f46e5", cursor: "pointer" }}
                onClick={() => setMode("login")}
              >
                Login
              </span>
            </>
          )}
          {mode === "forgot" && (
            <>
              Remembered?{" "}
              <span
                style={{ color: "#4f46e5", cursor: "pointer" }}
                onClick={() => setMode("login")}
              >
                Login
              </span>
            </>
          )}
        </span>
      </div>

      {message && (
        <div style={{ marginTop: 12, color: message.toLowerCase().includes("error") ? "red" : "green" }}>
          {message}
        </div>
      )}
    </form>
  );
}