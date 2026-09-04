/** Shape every admin server action returns so forms can render results uniformly. */
export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; message?: string; errors?: Record<string, string> };

export const okResult = <T,>(message?: string, data?: T): ActionResult<T> => ({ ok: true, message, data });
export const failResult = (message: string, errors?: Record<string, string>): ActionResult<never> => ({
  ok: false,
  message,
  errors,
});
