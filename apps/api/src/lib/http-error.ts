import { HTTPException } from "hono/http-exception";

export function badRequest(message: string): never {
  throw new HTTPException(400, { message });
}
export function unauthorized(message = "Unauthorized"): never {
  throw new HTTPException(401, { message });
}
export function forbidden(message = "Forbidden"): never {
  throw new HTTPException(403, { message });
}
export function notFound(message = "Not found"): never {
  throw new HTTPException(404, { message });
}
export function conflict(message: string): never {
  throw new HTTPException(409, { message });
}
