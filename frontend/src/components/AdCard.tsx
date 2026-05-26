import { useState } from "react";
import { SavedAd } from "../api/client";

interface Props {
  ad: SavedAd;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: { tags?: string[]; memo?: string }) => void;
}

export default function AdCard({ ad, onDelete, onUpdate }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  const mediaUrl = ad.saved_image_path
    ? `/uploads/${ad.saved_image_path}`
    : ad.image_url;
  const videoUrl = ad.saved_video_path
    ? `/uploads/${ad.saved_video_path}`
    : ad.video_url;

  const savedDate = new Date(ad.saved_at).toLocaleDateString("ja-JP", {
    year: "numeric", month: "short", day: "numeric",
  });

  return (
    <>
      {/* カード */}
      <div style={s.card} onClick={() => setModalOpen(true)}>
        {/* メディアサムネイル */}
        <div style={s.thumb}>
          {videoUrl ? (
            <video src={videoUrl} style={s.thumbMedia} preload="metadata" muted />
          ) : mediaUrl ? (
            <img src={mediaUrl} alt="" style={s.thumbMedia} loading="lazy" />
          ) : (
            <div style={s.noMedia}>画像なし</div>
          )}
          {videoUrl && <div style={s.videoIcon}>▶</div>}
        </div>

        {/* カード情報 */}
        <div style={s.cardBody}>
          {/* アカウント名 */}
          {ad.account_url ? (
            <a href={ad.account_url} target="_blank" rel="noopener noreferrer"
              style={{ ...s.advertiser, textDecoration: "none" }}
              onClick={e => e.stopPropagation()}>
              {ad.advertiser_name || "（広告主不明）"}
            </a>
          ) : (
            <div style={s.advertiser}>{ad.advertiser_name || "（広告主不明）"}</div>
          )}
          <div style={s.subLabel}>スポンサー広告</div>

          {/* 広告テキスト */}
          {ad.ad_text && (
            <p style={s.adText}>
              {ad.ad_text.length > 80 ? ad.ad_text.slice(0, 80) + "..." : ad.ad_text}
            </p>
          )}

          {/* メタ情報 */}
          <div style={s.meta}>
            {ad.ad_id && <span style={s.metaItem}>ID: {ad.ad_id}</span>}
            {ad.start_date && <span style={s.metaItem}>{ad.start_date}</span>}
          </div>

          {/* タグ */}
          {ad.tags.length > 0 && (
            <div style={s.tags}>
              {ad.tags.map((t) => <span key={t} style={s.tag}>{t}</span>)}
            </div>
          )}

          <div style={s.savedDate}>{savedDate}に保存</div>
        </div>
      </div>

      {/* モーダル */}
      {modalOpen && (
        <AdModal
          ad={ad}
          mediaUrl={mediaUrl}
          videoUrl={videoUrl}
          onClose={() => setModalOpen(false)}
          onDelete={onDelete}
          onUpdate={onUpdate}
        />
      )}
    </>
  );
}

/* ---- モーダル ---- */
function AdModal({ ad, mediaUrl, videoUrl, onClose, onDelete, onUpdate }: {
  ad: SavedAd;
  mediaUrl?: string | null;
  videoUrl?: string | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: { tags?: string[]; memo?: string }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [memo, setMemo] = useState(ad.memo || "");
  const [tagInput, setTagInput] = useState(ad.tags.join(", "));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const tags = tagInput.split(",").map(t => t.trim()).filter(Boolean);
    await onUpdate(ad.id, { tags, memo });
    setSaving(false);
    setEditing(false);
  }

  function handleDelete() {
    if (!confirm("この広告を削除しますか？")) return;
    onDelete(ad.id);
    onClose();
  }

  const externalUrl = ad.post_url || ad.detail_url || ad.page_url;

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        {/* モーダルヘッダー */}
        <div style={s.modalHeader}>
          <span style={s.modalTitle}>{ad.advertiser_name || "広告詳細"}</span>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={s.modalBody}>
          {/* 左：メディア */}
          <div style={s.mediaCol}>
            {videoUrl ? (
              <video
                src={videoUrl}
                controls
                controlsList="nodownload"
                style={s.modalMedia}
                preload="auto"
              />
            ) : mediaUrl ? (
              <img src={mediaUrl} alt="広告画像" style={s.modalMedia} />
            ) : (
              <div style={s.noMediaLarge}>画像・動画なし</div>
            )}
          </div>

          {/* 右：詳細情報 */}
          <div style={s.infoCol}>
            {/* アカウント */}
            <div style={s.infoSection}>
              {ad.account_url ? (
                <a href={ad.account_url} target="_blank" rel="noopener noreferrer"
                  style={{ ...s.infoAdvertiser, textDecoration: "none" }}>
                  {ad.advertiser_name || "—"} 🔗
                </a>
              ) : (
                <div style={s.infoAdvertiser}>{ad.advertiser_name || "—"}</div>
              )}
              <div style={s.infoSubLabel}>スポンサー広告</div>
            </div>

            <div style={s.divider} />

            {/* メタ情報 */}
            <div style={s.infoSection}>
              {ad.ad_id && (
                <div style={s.infoRow}>
                  <span style={s.infoLabel}>ライブラリID</span>
                  <span style={s.infoVal}>{ad.ad_id}</span>
                </div>
              )}
              {ad.start_date && (
                <div style={s.infoRow}>
                  <span style={s.infoLabel}>掲載開始日</span>
                  <span style={s.infoVal}>{ad.start_date}</span>
                </div>
              )}
              <div style={s.infoRow}>
                <span style={s.infoLabel}>保存日</span>
                <span style={s.infoVal}>
                  {new Date(ad.saved_at).toLocaleDateString("ja-JP")}
                </span>
              </div>
            </div>

            <div style={s.divider} />

            {/* 広告テキスト */}
            {ad.ad_text && (
              <div style={s.infoSection}>
                <div style={s.infoLabel}>広告テキスト</div>
                <p style={s.adTextFull}>{ad.ad_text}</p>
              </div>
            )}

            {/* タグ・メモ */}
            <div style={s.infoSection}>
              {!editing ? (
                <div>
                  <div style={s.tags}>
                    {ad.tags.length > 0
                      ? ad.tags.map(t => <span key={t} style={s.tag}>{t}</span>)
                      : <span style={{ fontSize: 12, color: "#adb5bd" }}>タグなし</span>}
                  </div>
                  {ad.memo && <p style={s.memoText}>{ad.memo}</p>}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <input
                    style={s.editInput}
                    type="text"
                    placeholder="タグ（カンマ区切り）"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                  />
                  <textarea
                    style={s.editTextarea}
                    placeholder="メモ"
                    value={memo}
                    onChange={e => setMemo(e.target.value)}
                    rows={4}
                  />
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
                      {saving ? "保存中..." : "保存"}
                    </button>
                    <button style={s.cancelBtn} onClick={() => setEditing(false)}>
                      キャンセル
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* アクション */}
            <div style={s.modalActions}>
              {externalUrl && (
                <a href={externalUrl} target="_blank" rel="noopener noreferrer" style={s.linkBtn}>
                  🔗 元の広告を開く
                </a>
              )}
              <button style={s.editBtn} onClick={() => setEditing(!editing)}>
                ✏️ 編集
              </button>
              <button style={s.deleteBtn} onClick={handleDelete}>
                🗑️ 削除
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- スタイル ---- */
const s: Record<string, React.CSSProperties> = {
  // カード
  card: {
    background: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
    cursor: "pointer",
    transition: "box-shadow 0.2s, transform 0.15s",
    display: "flex",
    flexDirection: "column",
  },
  thumb: {
    width: "100%",
    background: "#f0f2f5",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 180,
    maxHeight: 280,
  },
  thumbMedia: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    display: "block",
    maxHeight: 280,
  },
  noMedia: {
    padding: 40,
    color: "#adb5bd",
    fontSize: 13,
  },
  videoIcon: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%,-50%)",
    background: "rgba(0,0,0,0.55)",
    color: "#fff",
    width: 44,
    height: 44,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    pointerEvents: "none",
  },
  cardBody: {
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 5,
    flex: 1,
  },
  advertiser: { fontSize: 14, fontWeight: 700, color: "#212529" },
  subLabel: { fontSize: 11, color: "#6c757d" },
  adText: { fontSize: 13, color: "#495057", lineHeight: 1.5, margin: 0 },
  meta: { display: "flex", flexDirection: "column", gap: 2 },
  metaItem: { fontSize: 11, color: "#868e96" },
  tags: { display: "flex", flexWrap: "wrap" as const, gap: 4, marginTop: 2 },
  tag: {
    fontSize: 11, fontWeight: 600,
    background: "#e8f0fe", color: "#1877f2",
    padding: "2px 8px", borderRadius: 20,
  },
  savedDate: { fontSize: 11, color: "#adb5bd", marginTop: 4 },

  // モーダル
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.65)",
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modal: {
    background: "#fff",
    borderRadius: 16,
    width: "100%",
    maxWidth: 860,
    maxHeight: "90vh",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 20px",
    borderBottom: "1px solid #e9ecef",
    flexShrink: 0,
  },
  modalTitle: { fontSize: 16, fontWeight: 700, color: "#212529" },
  closeBtn: {
    background: "none", border: "none",
    fontSize: 18, cursor: "pointer",
    color: "#6c757d", padding: "4px 8px",
    borderRadius: 6,
  },
  modalBody: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  },
  mediaCol: {
    flex: "0 0 55%",
    background: "#000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  modalMedia: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    maxHeight: "80vh",
    display: "block",
  },
  noMediaLarge: {
    color: "#6c757d",
    fontSize: 14,
    padding: 40,
  },
  infoCol: {
    flex: 1,
    overflowY: "auto" as const,
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 0,
  },
  infoSection: { paddingBottom: 12 },
  divider: { borderTop: "1px solid #f0f2f5", margin: "4px 0 12px" },
  infoAdvertiser: { fontSize: 15, fontWeight: 700, color: "#212529" },
  infoSubLabel: { fontSize: 12, color: "#6c757d", marginTop: 2 },
  infoRow: {
    display: "flex", justifyContent: "space-between",
    alignItems: "flex-start", gap: 8,
    marginBottom: 6,
  },
  infoLabel: { fontSize: 12, color: "#6c757d", flexShrink: 0 },
  infoVal: { fontSize: 12, color: "#212529", textAlign: "right" as const, wordBreak: "break-all" as const },
  adTextFull: {
    fontSize: 13, color: "#212529",
    lineHeight: 1.6, margin: "6px 0 0",
    whiteSpace: "pre-wrap" as const,
  },
  memoText: {
    fontSize: 12, color: "#495057",
    background: "#f8f9fa", borderRadius: 8,
    padding: "8px 10px", marginTop: 6,
    lineHeight: 1.5,
  },
  editInput: {
    padding: "8px 10px",
    border: "1.5px solid #dee2e6",
    borderRadius: 8, fontSize: 13, outline: "none",
    width: "100%",
  },
  editTextarea: {
    padding: "8px 10px",
    border: "1.5px solid #dee2e6",
    borderRadius: 8, fontSize: 13, outline: "none",
    resize: "vertical" as const,
    fontFamily: "inherit",
    width: "100%",
  },
  saveBtn: {
    flex: 1, padding: "8px",
    background: "#1877f2", color: "#fff",
    border: "none", borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
  cancelBtn: {
    flex: 1, padding: "8px",
    background: "transparent", color: "#6c757d",
    border: "1.5px solid #dee2e6",
    borderRadius: 8, fontSize: 13, cursor: "pointer",
  },
  modalActions: {
    display: "flex", gap: 8,
    marginTop: "auto", paddingTop: 12,
    borderTop: "1px solid #f0f2f5",
    flexWrap: "wrap" as const,
  },
  linkBtn: {
    flex: 1, padding: "8px 12px",
    background: "#e8f0fe", color: "#1877f2",
    border: "none", borderRadius: 8,
    fontSize: 12, fontWeight: 600,
    cursor: "pointer", textDecoration: "none",
    textAlign: "center" as const,
  },
  editBtn: {
    padding: "8px 12px",
    background: "#f8f9fa", color: "#495057",
    border: "1.5px solid #dee2e6",
    borderRadius: 8, fontSize: 12, cursor: "pointer",
  },
  deleteBtn: {
    padding: "8px 12px",
    background: "#fff5f5", color: "#dc3545",
    border: "1.5px solid #f5c6cb",
    borderRadius: 8, fontSize: 12, cursor: "pointer",
  },
};
