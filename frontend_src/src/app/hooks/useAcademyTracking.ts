import { useCallback } from "react";
import { useApp } from "../contexts/AppContext";

const BASE = "/api/v1/academy/modules";

export function useAcademyTracking() {
  const { accessToken } = useApp();
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` };

  const enroll = useCallback((moduleId: string) =>
    fetch(`${BASE}/${moduleId}/enroll`, { method: "POST", headers }).then(r => r.json()),
    [accessToken]);

  const updateProgress = useCallback((moduleId: string, taux_completion: number, score?: number, last_question_index?: number) =>
    fetch(`${BASE}/${moduleId}/progress`, { method: "PATCH", headers, body: JSON.stringify({ taux_completion, score, last_question_index }) }).then(r => r.json()),
    [accessToken]);

  const getProgress = useCallback((moduleId: string) =>
    fetch(`${BASE}/${moduleId}/progress`, { headers }).then(r => r.json()),
    [accessToken]);

  const myProgress = useCallback(() =>
    fetch("/api/v1/academy/my-progress", { headers }).then(r => r.json()),
    [accessToken]);

  return { enroll, updateProgress, getProgress, myProgress };
}
