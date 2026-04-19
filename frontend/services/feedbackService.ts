import { authFetch } from '../utils/api'
import { API_BASE_URL } from '../utils/config'

export async function submitFeedback({ rating, message, email }: { rating: number; message: string; email?: string }): Promise<number> {
  const response = await authFetch(`${API_BASE_URL}/feedback`, {
    method: 'POST',
    body: JSON.stringify({ rating, message, email }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Error al enviar feedback');
  }

  const { id } = await response.json();
  return id;
}
