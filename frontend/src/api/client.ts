const BASE = import.meta.env.VITE_API_URL ?? "/api";

function getToken(): string | null {
  return localStorage.getItem("token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "エラーが発生しました" }));
    throw new Error(err.detail || "エラーが発生しました");
  }

  return res.json();
}

export interface TokenResponse {
  access_token: string;
  user_id: string;
  email: string;
  display_name?: string;
}

export interface SavedAd {
  id: string;
  ad_id?: string;
  advertiser_name?: string;
  ad_text?: string;
  start_date?: string;
  page_url?: string;
  account_url?: string;
  post_url?: string;
  detail_url?: string;
  image_url?: string;
  video_url?: string;
  saved_image_path?: string;
  saved_video_path?: string;
  tags: string[];
  memo?: string;
  saved_at: string;
}

export interface AdsListResponse {
  total: number;
  items: SavedAd[];
}

export const api = {
  login: (email: string, password: string) =>
    request<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string, display_name?: string) =>
    request<TokenResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, display_name }),
    }),

  getAds: (params: { q?: string; tag?: string; page?: number; per_page?: number }) => {
    const qs = new URLSearchParams();
    if (params.q) qs.set("q", params.q);
    if (params.tag) qs.set("tag", params.tag);
    if (params.page) qs.set("page", String(params.page));
    if (params.per_page) qs.set("per_page", String(params.per_page));
    return request<AdsListResponse>(`/ads/?${qs.toString()}`);
  },

  updateAd: (id: string, data: { tags?: string[]; memo?: string }) =>
    request<SavedAd>(`/ads/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteAd: (id: string) =>
    request<{ message: string }>(`/ads/${id}`, { method: "DELETE" }),
};
