export async function authedFetch(input: RequestInfo, init: RequestInit = {}) {
  const token = localStorage.getItem("accessToken");
  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
