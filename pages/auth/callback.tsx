import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../SupabaseClient";

export default function AuthCallback() {
  const router = useRouter();
  const [message, setMessage] = useState("Processing...");
  const [newPassword, setNewPassword] = useState("");
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";

    if (hash.includes("type=recovery")) {
      setMessage("Please set your new password.");
      setShowPasswordForm(true);
    } else if (hash.includes("type=signup")) {
      setMessage("Your email has been confirmed! You can now log in.");
      setShowPasswordForm(false);
      setTimeout(() => router.push("/jobs"), 3000);
    } else {
      setMessage("Redirecting...");
      setShowPasswordForm(false);
      setTimeout(() => router.push("/jobs"), 2000);
    }
  }, [router]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("Updating password...");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Password updated! Redirecting to login...");
      setShowPasswordForm(false);
      setTimeout(() => router.push("/jobs"), 2000);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "4rem auto", textAlign: "center" }}>
      {showPasswordForm ? (
        <form onSubmit={handlePasswordSubmit}>
          <h2>Set New Password</h2>
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="New password"
            required
            style={{ width: "100%", padding: 8, marginBottom: 12, borderRadius: 6, border: "1px solid #ccc" }}
          />
          <button
            type="submit"
            style={{ width: "100%", padding: 10, borderRadius: 6, background: "#4f46e5", color: "#fff", fontWeight: "bold", border: "none" }}
          >
            Set Password
          </button>
        </form>
      ) : (
        <h2>{message}</h2>
      )}
    </div>
  );
}