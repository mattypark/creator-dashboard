/**
 * Verify the single shared password and set an httpOnly session cookie.
 * When APP_PASSWORD is unset (demo mode) login is a no-op success.
 */
export async function POST(request: Request) {
  const password = process.env.APP_PASSWORD;
  if (!password) return Response.json({ ok: true }); // demo mode

  const body = await request.json().catch(() => ({}));
  if (body.password !== password) {
    return Response.json({ error: "wrong password" }, { status: 401 });
  }

  const res = Response.json({ ok: true });
  res.headers.append(
    "Set-Cookie",
    `cd_auth=${encodeURIComponent(password)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${60 * 60 * 24 * 30}`,
  );
  return res;
}
