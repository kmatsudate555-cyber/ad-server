// Meta広告ライブラリ - ライブラリIDを起点にカードを検出
console.log("[Ad Saver] Content script loaded ✓");

let isLoggedIn = false;
let scannedAds = []; // スキャン結果キャッシュ（フィルター用）

chrome.runtime.sendMessage({ type: "GET_AUTH_STATE" }, (res) => {
  isLoggedIn = res?.isLoggedIn || false;
});

// フローティングパネルを追加
function createFloatingPanel() {
  if (document.getElementById("ad-saver-panel")) return;

  const panel = document.createElement("div");
  panel.id = "ad-saver-panel";
  panel.innerHTML = `
    <div id="ad-saver-header">
      <span>💾 Ad Saver</span>
      <span id="ad-saver-count">-</span>
    </div>
    <button id="ad-saver-scan-btn">広告を検索</button>
    <input type="text" id="ad-saver-filter" placeholder="広告主を絞る..." style="display:none;width:100%;box-sizing:border-box;margin-top:6px;padding:5px 8px;border:1px solid #ddd;border-radius:6px;font-size:12px;outline:none;" />
    <div id="ad-saver-list"></div>
  `;
  document.body.appendChild(panel);
  document.getElementById("ad-saver-scan-btn").addEventListener("click", scanAds);
  document.getElementById("ad-saver-filter").addEventListener("input", (e) => {
    renderFilteredAds(e.target.value.trim());
  });
  makeDraggable(panel, document.getElementById("ad-saver-header"));
}

function makeDraggable(panel, handle) {
  let startX, startY, startLeft, startTop;

  handle.style.cursor = "grab";

  handle.addEventListener("mousedown", (e) => {
    e.preventDefault();
    const rect = panel.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    startLeft = rect.left;
    startTop = rect.top;

    // fixed配置に切り替えて現在位置を維持
    panel.style.right = "auto";
    panel.style.left = startLeft + "px";
    panel.style.top = startTop + "px";

    handle.style.cursor = "grabbing";

    function onMouseMove(e) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      panel.style.left = Math.max(0, startLeft + dx) + "px";
      panel.style.top = Math.max(0, startTop + dy) + "px";
    }

    function onMouseUp() {
      handle.style.cursor = "grab";
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });
}

function scanAds() {
  const list = document.getElementById("ad-saver-list");
  const countEl = document.getElementById("ad-saver-count");
  const filterEl = document.getElementById("ad-saver-filter");
  list.innerHTML = "<div style='padding:8px;color:#666;font-size:12px;'>スキャン中...</div>";

  const cards = findAdCards();
  countEl.textContent = `${cards.length}件`;

  if (cards.length === 0) {
    list.innerHTML = "<div style='padding:8px;color:#666;font-size:12px;'>広告が見つかりません。<br>スクロールして広告を表示してからもう一度押してください。</div>";
    filterEl.style.display = "none";
    return;
  }

  scannedAds = cards.map((card, i) => ({ data: extractAdData(card), index: i }));
  filterEl.value = "";
  filterEl.style.display = "block";
  renderFilteredAds("");
}

function renderFilteredAds(query) {
  const list = document.getElementById("ad-saver-list");
  const countEl = document.getElementById("ad-saver-count");

  const filtered = query
    ? scannedAds.filter(({ data }) =>
        (data.advertiser_name || "").toLowerCase().includes(query.toLowerCase())
      )
    : scannedAds;

  countEl.textContent = query
    ? `${filtered.length}/${scannedAds.length}件`
    : `${scannedAds.length}件`;

  list.innerHTML = "";
  if (filtered.length === 0) {
    list.innerHTML = "<div style='padding:8px;color:#666;font-size:12px;'>該当する広告主が見つかりません。</div>";
    return;
  }
  filtered.forEach(({ data, index }) => {
    list.appendChild(createAdItem(data, index));
  });
}

// 「ライブラリID」テキストを含む要素を起点にカードを探す
function findAdCards() {
  const results = [];
  const seen = new Set();

  // ページ内の全テキストノードを走査して「ライブラリID」を含む要素を探す
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null
  );

  let node;
  while ((node = walker.nextNode())) {
    if (!node.textContent.includes("ライブラリID")) continue;

    // このテキストを含む要素から上に遡って適切なカードコンテナを探す
    const card = findCardContainer(node.parentElement);
    if (!card || seen.has(card)) continue;
    seen.add(card);
    results.push(card);
  }

  return results;
}

function findCardContainer(el) {
  // 上に最大15階層たどり、十分な大きさのコンテナを探す
  let current = el;
  for (let i = 0; i < 15; i++) {
    if (!current || current === document.body) break;
    const rect = current.getBoundingClientRect();
    // 幅300px以上、高さ200px以上のコンテナをカードとみなす
    if (rect.width >= 300 && rect.height >= 200) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

function extractAdData(card) {
  const text = card.innerText || "";
  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);

  // ライブラリIDを正規表現で抽出
  const libIdMatch = text.match(/ライブラリID[：:]\s*(\d+)/);
  const libraryId = libIdMatch ? libIdMatch[1] : null;

  // 掲載開始日を抽出（「掲載開始日: YYYY/MM/DD」または「YYYY/MM/DD～YYYY/MM/DD」）
  const dateMatch = text.match(/掲載開始日[：:]\s*([\d\/]+)/) ||
                    text.match(/([\d]{4}\/[\d]{2}\/[\d]{2}[～~][\d]{4}\/[\d]{2}\/[\d]{2})/);
  const startDate = dateMatch ? dateMatch[1] : null;

  // アカウント名とアカウントURL
  // 「スポンサー広告」テキストを含む要素を起点に直前のリンクを探す
  let advertiserName = null;
  let accountUrl = null;
  const walker2 = document.createTreeWalker(card, NodeFilter.SHOW_TEXT, null);
  let n2;
  while ((n2 = walker2.nextNode())) {
    if (n2.textContent.trim() === "スポンサー広告") {
      // 直前のaタグを探す（兄弟・親・その兄弟を遡る）
      let el = n2.parentElement;
      for (let i = 0; i < 8; i++) {
        if (!el || el === card) break;
        // 同階層の前の要素のaタグ
        const prev = el.previousElementSibling;
        if (prev) {
          const aTag = prev.tagName === "A" ? prev : prev.querySelector("a");
          if (aTag) {
            advertiserName = advertiserName || aTag.innerText.trim();
            const href = aTag.href;
            if (href && href.includes("facebook.com") && !href.includes("/ads/library")) {
              accountUrl = href;
            }
            break;
          }
        }
        el = el.parentElement;
      }
      break;
    }
  }
  // フォールバック: lines からアカウント名を取得
  if (!advertiserName) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] === "スポンサー広告" && i > 0) {
        advertiserName = lines[i - 1];
        break;
      }
    }
  }

  // 広告テキスト（スポンサー広告より後の全テキストを改行つきで結合）
  // 「広告の詳細を見る」「http」「ライブラリID」等のメタ行は除外
  const skipPatterns = [
    /^広告の詳細を見る/,
    /^http/,
    /^ライブラリID/,
    /^掲載開始日/,
    /^プラットフォーム/,
    /^スポンサー広告/,
    /^アクティブ/,
    /^非アクティブ/,
    /^EUの透明性/,
    /^\d{4}\/\d{2}\/\d{2}/,
    /^APPS\./,
    /^インストール/,
    /^詳しくはこちら/,
  ];
  const adTextLines = [];
  let foundSponsor = false;
  for (const line of lines) {
    if (line === "スポンサー広告") { foundSponsor = true; continue; }
    if (!foundSponsor) continue;
    if (skipPatterns.some(p => p.test(line))) continue;
    if (line.length < 2) continue;
    adTextLines.push(line);
  }
  const adText = adTextLines.length > 0 ? adTextLines.join("\n") : null;

  // 画像URL（最大サイズの画像を選択、アイコン等の小さい画像は除外）
  const allImgs = Array.from(card.querySelectorAll(
    "img[src*='fbcdn'], img[src*='scontent'], img[src*='facebookcdn']"
  ));
  const adImg = allImgs
    .map(img => {
      const rect = img.getBoundingClientRect();
      const w = img.naturalWidth || rect.width || 0;
      const h = img.naturalHeight || rect.height || 0;
      return { img, area: w * h, w, h };
    })
    .filter(({ w, h }) => w >= 150 && h >= 150)  // アイコンサイズを除外
    .sort((a, b) => b.area - a.area)[0];           // 最大面積の画像を選択
  const imageUrl = adImg?.img.src || null;

  // 動画URL
  const videoEl = card.querySelector("video");
  const videoUrl = videoEl?.src || videoEl?.querySelector("source")?.src || null;

  // Facebook投稿URL（広告の実体URL）
  // 形式: https://www.facebook.com/[page_id]/posts/[post_id]/
  let postUrl = null;
  const allLinks = Array.from(card.querySelectorAll("a[href]"));
  for (const link of allLinks) {
    const href = link.href;
    if (/facebook\.com\/\d+\/posts\/\d+/.test(href)) {
      postUrl = href;
      break;
    }
    // フォールバック: /permalink/ 形式
    if (/facebook\.com\/.+\/permalink\/\d+/.test(href)) {
      postUrl = href;
      break;
    }
  }

  // 「広告の詳細を見る」リンク（ライブラリの詳細ページ）
  let detailUrl = null;
  for (const link of allLinks) {
    if (link.innerText?.includes("広告の詳細を見る")) {
      detailUrl = link.href;
      break;
    }
  }

  // CTAボタンの遷移先URL（詳細を表示・もっと見る等の外部リンク）
  const ctaKeywords = [
    "詳細を表示", "もっと見る", "今すぐ購入", "申し込む", "ダウンロード",
    "インストール", "予約する", "お問い合わせ", "登録する", "購入する",
    "Learn More", "Shop Now", "Sign Up", "Download", "Install",
    "Book Now", "Contact Us", "Subscribe", "Get Offer", "Watch More",
    "Apply Now", "Get Quote",
  ];
  let ctaUrl = null;
  for (const link of allLinks) {
    const linkText = link.innerText?.trim() || "";
    const href = link.href;
    if (!href) continue;
    if (!ctaKeywords.some((kw) => linkText.includes(kw))) continue;

    // Facebook リダイレクトURL（l.facebook.com/l.php?u=実際のURL）から遷移先を抽出
    if (href.includes("/l.php")) {
      try {
        const dest = new URL(href).searchParams.get("u");
        if (dest) { ctaUrl = decodeURIComponent(dest); break; }
      } catch {}
    }

    // 外部リンクはそのまま使用
    if (!href.includes("facebook.com") && !href.includes("instagram.com")) {
      ctaUrl = href;
      break;
    }
  }

  return {
    page_url: window.location.href,
    ad_id: libraryId,
    advertiser_name: advertiserName,
    account_url: accountUrl,
    ad_text: adText,
    start_date: startDate,
    image_url: imageUrl,
    video_url: videoUrl,
    post_url: postUrl,
    detail_url: detailUrl,
    cta_url: ctaUrl,
    tags: [],
  };
}

function createAdItem(adData, index) {
  const item = document.createElement("div");
  item.className = "ad-saver-item";

  const thumb = adData.image_url
    ? `<img src="${adData.image_url}" class="ad-saver-thumb" />`
    : `<div class="ad-saver-thumb ad-saver-no-thumb">${adData.video_url ? "🎥" : "📄"}</div>`;

  item.innerHTML = `
    ${thumb}
    <div class="ad-saver-info">
      <div class="ad-saver-name">${adData.advertiser_name || "広告 " + (index + 1)}</div>
      <div class="ad-saver-meta">ID: ${adData.ad_id || "-"}</div>
      <div class="ad-saver-meta">${adData.start_date || ""}</div>
    </div>
    <button class="ad-saver-save-btn">保存</button>
  `;

  item.querySelector(".ad-saver-save-btn").addEventListener("click", () => {
    if (!isLoggedIn) {
      showToast("ログインしてください", "error");
      return;
    }
    const btn = item.querySelector(".ad-saver-save-btn");
    btn.disabled = true;
    btn.textContent = "保存中...";

    // post_urlがあればpage_urlとして使用（最優先）
    const payload = {
      ...adData,
      page_url: adData.post_url || adData.detail_url || adData.page_url,
    };

    chrome.runtime.sendMessage({ type: "SAVE_AD", payload }, (res) => {
      if (res?.success) {
        btn.textContent = "✓ 済";
        btn.style.background = "#28a745";
        showToast("保存しました！", "success");
      } else {
        btn.disabled = false;
        btn.textContent = "保存";
        showToast(res?.error || "失敗しました", "error");
      }
    });
  });

  return item;
}

function showToast(message, type = "success") {
  const existing = document.getElementById("ad-saver-toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.id = "ad-saver-toast";
  toast.className = `ad-saver-toast ad-saver-toast--${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "AUTH_STATE_CHANGED") isLoggedIn = message.isLoggedIn;
});

// 即座に挿入
function tryCreatePanel() {
  if (document.body) {
    createFloatingPanel();
  } else {
    document.addEventListener("DOMContentLoaded", createFloatingPanel);
  }
}
tryCreatePanel();

// SPA対応：URL変化時に再挿入
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    setTimeout(createFloatingPanel, 1500);
  }
}).observe(document, { subtree: true, childList: true });
