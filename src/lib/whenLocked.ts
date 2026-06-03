/** Selección de texto permitida (p. ej. modo ejecución con candado). */
export const ENABLE_SELECTION = "enable-selection";

export function whenLocked(locked: boolean, className = ENABLE_SELECTION): string {
  return locked ? className : "";
}
