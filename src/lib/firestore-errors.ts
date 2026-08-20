import { OperationType } from '../types';

export function handleFirestoreError(error: unknown, operation: OperationType, path: string): string {
  console.error(`Firestore Error [${operation} on ${path}]:`, error);
  // Return user-friendly error string
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Erro ao comunicar com o servidor Firestore.';
}
