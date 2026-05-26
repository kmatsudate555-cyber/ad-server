import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api, SavedAd } from "../api/client";
import AdCard from "../components/AdCard";

export default function MyPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [ads, setAds] = useState<SavedAd[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const PER_PAGE = 20;

  const fetchAds = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAds({
        q: query || undefined,
        tag: tagFilter || undefined,
        page,
        per_page: PER_PAGE,
      });
      setAds(res.items);
      setTotal(res.total);
    } catch {
      // 401 は client.ts 側でリダイレクト
    } finally {
      setLoading(false);
    }
  }, [query, tagFilter, page]);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }

  async function handleDelete(id: string) {
    if (!confirm("この広告を削除しますか？")) return;
    await api.deleteAd(id);
    fetchAds();
  }

  async function handleUpdate(id: string, data: { tags?: string[]; memo?: string }) {
    await api.updateAd(id, data);
    fetchAds();
  }

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div style={styles.page}>
      {/* ヘッダー */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logo}>
            <span style={{ fontSize: 22 }}>💾</span>
            <span style={styles.logoText}>Ad Saver</span>
          </div>
          <div style={styles.userArea}>
            <span style={styles.userName}>{user.display_name || user.email}</span>
            <button style={styles.logoutBtn} onClick={handleLogout}>
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main style={styles.main}>
        {/* 検索バー */}
        <div style={styles.searchBar}>
          <input
            style={styles.searchInput}
            type="text"
            placeholder="広告主名・テキストで検索..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          />
          <input
            style={{ ...styles.searchInput, maxWidth: 160 }}
            type="text"
            placeholder="タグで絞り込み"
            value={tagFilter}
            onChange={(e) => { setTagFilter(e.target.value); setPage(1); }}
          />
          <button style={styles.searchBtn} onClick={fetchAds}>
            検索
          </button>
        </div>

        {/* 件数表示 */}
        <div style={styles.resultMeta}>
          {loading ? "読み込み中..." : `${total}件の広告`}
        </div>

        {/* 広告グリッド */}
        {ads.length === 0 && !loading ? (
          <div style={styles.empty}>
            <p style={{ fontSize: 48 }}>📂</p>
            <p style={{ fontSize: 16, color: "#6c757d", marginTop: 12 }}>
              保存済み広告がありません
            </p>
            <p style={{ fontSize: 13, color: "#adb5bd", marginTop: 6 }}>
              Chrome拡張機能でMeta広告ライブラリの広告を保存してみましょう
            </p>
          </div>
        ) : (
          <div style={styles.grid}>
            {ads.map((ad) => (
              <AdCard
                key={ad.id}
                ad={ad}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        )}

        {/* ページネーション */}
        {totalPages > 1 && (
          <div style={styles.pagination}>
            <button
              style={styles.pageBtn}
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              前へ
            </button>
            <span style={{ fontSize: 14, color: "#6c757d" }}>
              {page} / {totalPages}
            </span>
            <button
              style={styles.pageBtn}
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              次へ
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#f0f2f5" },
  header: {
    background: "#fff",
    borderBottom: "1px solid #e9ecef",
    position: "sticky",
    top: 0,
    zIndex: 100,
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  },
  headerInner: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "0 24px",
    height: 60,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: { display: "flex", alignItems: "center", gap: 8 },
  logoText: { fontSize: 18, fontWeight: 800, color: "#1877f2" },
  userArea: { display: "flex", alignItems: "center", gap: 12 },
  userName: { fontSize: 14, color: "#495057", fontWeight: 500 },
  logoutBtn: {
    padding: "6px 14px",
    border: "1.5px solid #dee2e6",
    borderRadius: 8,
    background: "transparent",
    cursor: "pointer",
    fontSize: 13,
    color: "#6c757d",
  },
  main: { maxWidth: 1200, margin: "0 auto", padding: "24px 24px 48px" },
  searchBar: {
    display: "flex",
    gap: 10,
    marginBottom: 16,
    flexWrap: "wrap" as const,
  },
  searchInput: {
    flex: 1,
    minWidth: 200,
    padding: "10px 14px",
    border: "1.5px solid #dee2e6",
    borderRadius: 10,
    fontSize: 14,
    background: "#fff",
    outline: "none",
  },
  searchBtn: {
    padding: "10px 20px",
    background: "#1877f2",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  resultMeta: { fontSize: 13, color: "#6c757d", marginBottom: 16 },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 20,
  },
  empty: {
    textAlign: "center",
    padding: "80px 20px",
    background: "#fff",
    borderRadius: 16,
  },
  pagination: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    marginTop: 32,
  },
  pageBtn: {
    padding: "8px 20px",
    border: "1.5px solid #dee2e6",
    borderRadius: 8,
    background: "#fff",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
  },
};
