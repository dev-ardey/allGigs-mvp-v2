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
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setMessage(error ? error.message : "Logged in!");
    } else if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (!error && data.user) {
        await supabase.from("profiles").insert([{ id: data.user.id, name, surname, linkedin }]);
      }
      setMessage(error ? error.message : "Check your email to confirm your account!");
    } else if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/jobs`,
      });
      setMessage(error ? `Error: ${error.message}` : "Password reset email sent!");
    }
  };

  return (
    <div className="job-board-container" style={{ maxWidth: 420, margin: "4rem auto", textAlign: "center" }}>
      <img src="/images/allGigs-logo-white.svg" alt="AllGigs Logo" style={{ height: "70px", marginBottom: "1.5rem" }} />
      <p style={{
        color: "#c8c8c8",
        fontSize: "1.1rem",
        marginBottom: "2rem",
        whiteSpace: "normal",
        overflowWrap: "break-word",
        wordBreak: "break-word",
        lineHeight: 1.6,
        maxWidth: "100%",
        textAlign: "center"
      }}>
        Discover your next opportunity from <span style={{ fontWeight: "bold", color: "#0ccf83" }}>1000+</span> curated positions
      </p>



      <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          required
          onChange={e => setEmail(e.target.value)}
          style={inputStyle}
        />

        {mode === "signup" && (
          <>
            <input type="text" placeholder="First name" value={name} onChange={e => setName(e.target.value)} required style={inputStyle} />
            <input type="text" placeholder="Surname" value={surname} onChange={e => setSurname(e.target.value)} required style={inputStyle} />
            <input type="url" placeholder="LinkedIn URL" value={linkedin} onChange={e => setLinkedin(e.target.value)} required style={inputStyle} />
          </>
        )}

        {mode !== "forgot" && (
          <input
            type="password"
            placeholder="Password"
            value={password}
            required
            onChange={e => setPassword(e.target.value)}
            style={inputStyle}
          />
        )}

        <button type="submit" style={buttonStyle}>
          {mode === "login" && "Login"}
          {mode === "signup" && "Sign Up"}
          {mode === "forgot" && "Reset Password"}
        </button>
        å
        <div style={{ fontSize: "0.9rem", marginTop: "0.5rem", color: "#c8c8c8" }}>
          {mode !== "forgot" && (
            <span onClick={() => setMode("forgot")} style={linkStyle}>Forgot?</span>
          )}
          {mode === "login" && (
            <div>
              No account? <span onClick={() => setMode("signup")} style={linkStyle}>Sign up</span>
            </div>
          )}
          {mode === "signup" && (
            <div>
              Already have an account? <span onClick={() => setMode("login")} style={linkStyle}>Login</span>
            </div>
          )}
          {mode === "forgot" && (
            <div>
              Remembered? <span onClick={() => setMode("login")} style={linkStyle}>Login</span>
            </div>
          )}
        </div>

        {message && (
          <div style={{ marginTop: "1rem", color: message.toLowerCase().includes("error") ? "#dc2626" : "#0ccf83" }}>
            {message}
          </div>
        )}
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "0.75rem 1rem",
  borderRadius: "999px",
  border: "1px solid #ccc",
  fontSize: "1rem",
  width: "100%",
};

const buttonStyle: React.CSSProperties = {
  background: "#0ccf83",
  color: "#000",
  fontWeight: 600,
  borderRadius: "999px",
  padding: "0.75rem 1.5rem",
  border: "none",
  cursor: "pointer",
  fontSize: "1rem",
  alignSelf: "center",
};
const linkStyle: React.CSSProperties = {
  color: "#0ccf83",
  cursor: "pointer",
  fontWeight: 500,
};
