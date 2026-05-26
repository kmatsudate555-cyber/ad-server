import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

export default function LoginPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.login(email, password);
      localStorage.setItem("token", res.access_token);
      localStorage.setItem("user", JSON.stringify(res));
      navigate("/");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "ログインに失敗しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("パスワードは8文字以上にしてください");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.register(email, password, name || undefined);
      localStorage.setItem("token", res.access_token);
      localStorage.setItem("user", JSON.stringify(res));
      navigate("/");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "登録に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.header}>
          <span style={{ fontSize: 32 }}>💾</span>
          <h1 style={styles.title}>Ad Saver</h1>
          <p style={styles.sub}>Meta広告ライブラリ保存ツール</p>
        </div>

        <div style={styles.tabs}>
          {(["login", "register"] as const).map((t) => (
            <button
              key={t}
              style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }}
              onClick={() => { setTab(t); setError(""); }}
            >
              {t === "login" ? "ログイン" : "新規登録"}
            </button>
          ))}
        </div>

        <form onSubmit={tab === "login" ? handleLogin : handleRegister} style={styles.form}>
          {tab === "register" && (
            <input
              style={styles.input}
              type="text"
              placeholder="表示名（任意）"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          <input
            style={styles.input}
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="password"
            placeholder={tab === "register" ? "パスワード（8文字以上）" : "パスワード"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <div style={styles.error}>{error}</div>}
          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? "処理中..." : tab === "login" ? "ログイン" : "登録して始める"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    padding: 16,
  },
  card: {
    background: "#fff",
    borderRadius: 16,
    padding: "32px 28px",
    width: "100%",
    maxWidth: 400,
    boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
  },
  header: { textAlign: "center", marginBottom: 24 },
  title: { fontSize: 26, fontWeight: 800, color: "#1877f2", marginTop: 8 },
  sub: { fontSize: 13, color: "#6c757d", marginTop: 4 },
  tabs: {
    display: "flex",
    background: "#f0f2f5",
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    padding: "8px 0",
    border: "none",
    background: "transparent",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
    color: "#6c757d",
    transition: "all 0.2s",
  },
  tabActive: {
    background: "#fff",
    color: "#1877f2",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  form: { display: "flex", flexDirection: "column", gap: 12 },
  input: {
    padding: "12px 14px",
    border: "1.5px solid #dee2e6",
    borderRadius: 10,
    fontSize: 14,
    outline: "none",
    transition: "border-color 0.2s",
  },
  error: {
    fontSize: 13,
    color: "#dc3545",
    background: "#fff5f5",
    border: "1px solid #f5c6cb",
    borderRadius: 8,
    padding: "8px 12px",
  },
  btn: {
    padding: "13px",
    background: "#1877f2",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    marginTop: 4,
  },
};
