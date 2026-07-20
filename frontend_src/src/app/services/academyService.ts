/**
* ACADEMY SERVICE - Persistence via API NestJS (plus de localStorage)
*/

import { API_URL } from '../utils/api';

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function getMyProgress() {
  return apiFetch('/academy/my-progress');
}

export async function getModuleProgress(moduleId: string) {
  return apiFetch(`/academy/modules/${moduleId}/progress`);
}

export async function enrollModule(moduleId: string) {
  return apiFetch(`/academy/modules/${moduleId}/enroll`, { method: 'POST' });
}

export async function updateModuleProgress(moduleId: string, tauxCompletion: number, score?: number, lastQuestionIndex?: number) {
  return apiFetch(`/academy/modules/${moduleId}/progress`, {
    method: 'PATCH',
    body: JSON.stringify({ taux_completion: tauxCompletion, score, last_question_index: lastQuestionIndex }),
  });
}

export async function getAcademyStats() {
  return apiFetch('/academy/stats');
}

// Compatibilité legacy — ne plus utiliser localStorage
export function getLevelFromPoints(points: number): string {
  if (points < 200) return 'debutant';
  if (points < 500) return 'actif';
  if (points < 1000) return 'expert';
  return 'leader';
}

export function getProgressToNextLevel(points: number) {
  const levels = [
    { name: 'debutant', min: 0, max: 199 },
    { name: 'actif', min: 200, max: 499 },
    { name: 'expert', min: 500, max: 999 },
    { name: 'leader', min: 1000, max: Infinity },
  ];
  const current = levels.find(l => points >= l.min && points <= l.max) || levels[0];
  const idx = levels.indexOf(current);
  const next = levels[idx + 1];
  if (!next) return { currentLevel: current.name, nextLevel: null, pointsToNext: 0, percentage: 100 };
  const pointsToNext = next.min - points;
  const percentage = Math.round(((points - current.min) / (next.min - current.min)) * 100);
  return { currentLevel: current.name, nextLevel: next.name, pointsToNext, percentage };
}

export function getJulabaScoreBonus(xpEarned: number): number {
  return Math.floor(xpEarned / 10);
}
