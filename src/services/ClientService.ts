
import { Client, UserProfile } from '../types';

async function getHeaders() {
  const token = localStorage.getItem('varejopro_auth_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

export function getLoyaltyTier(points: number): 'BRONZE' | 'PRATA' | 'OURO' | 'VIP' {
  if (points >= 3000) return 'VIP';
  if (points >= 1500) return 'OURO';
  if (points >= 500) return 'PRATA';
  return 'BRONZE';
}

export async function adjustLoyaltyPoints(clientId: string, pointsDelta: number, _user: UserProfile, _reason?: string): Promise<number> {
  const response = await fetch(`/api/client/adjust-loyalty/${clientId}`, {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify({ pointsDelta })
  });
  if (!response.ok) throw new Error("Erro ao ajustar pontos.");
  const data = await response.json();
  return data.newBalance;
}

export async function createClient(clientData: Partial<Client>, _user: UserProfile): Promise<string> {
  const response = await fetch('/api/client/create', {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify({ clientData })
  });
  if (!response.ok) throw new Error("Erro ao criar cliente.");
  const data = await response.json();
  return data.id;
}

export async function updateClient(clientId: string, clientData: Partial<Client>, _user: UserProfile): Promise<void> {
  const response = await fetch(`/api/client/update/${clientId}`, {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify({ clientData })
  });
  if (!response.ok) throw new Error("Erro ao atualizar cliente.");
}

export async function deleteClient(clientId: string, _user: UserProfile): Promise<void> {
  const response = await fetch(`/api/client/delete/${clientId}`, {
    method: 'POST',
    headers: await getHeaders()
  });
  if (!response.ok) throw new Error("Erro ao excluir cliente.");
}
