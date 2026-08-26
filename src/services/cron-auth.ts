export function hasCronAuthorization(request: Request, secret: string | undefined) {
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}
