/** Presentation only: preserve integer cents and format every UI amount alike. */
export function formatMoney(cents: number, incoming = false): string {
  const digits = Math.abs(cents).toString().padStart(3, "0");
  const whole = digits.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const sign = cents < 0 ? "− " : incoming ? "+ " : "";
  return `${sign}€ ${whole},${digits.slice(-2)}`;
}
