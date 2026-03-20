import { motion } from "motion/react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Login({ onLogin }: { onLogin: () => void }) {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const ok = login(username.trim(), password);
    if (ok) {
      onLogin();
    } else {
      setError("that's not right, try again");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ backgroundColor: "#f5f0e8" }}
    >
      {/* Film grain overlay */}
      <div className="film-grain fixed inset-0 pointer-events-none z-0" />

      {/* Decorative background text */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
        aria-hidden="true"
      >
        <p
          className="font-display text-[18vw] font-bold leading-none"
          style={{ color: "rgba(184,134,11,0.05)", whiteSpace: "nowrap" }}
        >
          our archive.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-sm mx-6"
      >
        <div
          className="rounded-sm px-10 py-12"
          style={{
            background: "rgba(245, 240, 232, 0.78)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            border: "1px solid rgba(184, 134, 11, 0.28)",
            boxShadow:
              "0 8px 40px rgba(184,134,11,0.10), 0 2px 12px rgba(0,0,0,0.06)",
          }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-center mb-10"
          >
            <h1
              className="font-display text-4xl font-bold mb-2"
              style={{ color: "#1a1a1a" }}
            >
              our archive.
            </h1>
            <p
              className="font-display italic text-sm"
              style={{ color: "#8a8070" }}
            >
              just us.
            </p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                autoComplete="username"
                className="w-full bg-transparent outline-none font-body text-sm pb-2"
                style={{
                  borderBottom: "1px solid rgba(184,134,11,0.45)",
                  color: "#1a1a1a",
                }}
                data-ocid="login.input"
              />
            </div>
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password"
                autoComplete="current-password"
                className="w-full bg-transparent outline-none font-body text-sm pb-2"
                style={{
                  borderBottom: "1px solid rgba(184,134,11,0.45)",
                  color: "#1a1a1a",
                }}
                data-ocid="login.input"
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs font-body text-center"
                style={{ color: "#b85c11" }}
                data-ocid="login.error_state"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              className="w-full py-3 font-body text-sm tracking-widest transition-all duration-200 rounded-sm mt-2"
              style={{
                background: "#b8860b",
                color: "#f5f0e8",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "#96700a";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "#b8860b";
              }}
              data-ocid="login.submit_button"
            >
              let me in
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
