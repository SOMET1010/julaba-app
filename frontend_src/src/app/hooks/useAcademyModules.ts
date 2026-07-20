import { useState, useEffect } from 'react';
import { API_URL } from '../utils/api';

export interface AcademyModuleAPI {
  id: string;
  titre: string;
  description: string;
  type: string;
  niveau: string;
  profil: string;
  duree: number;
  points: number;
  statut: string;
  image: string | null;
}

export interface AcademyQuestionAPI {
  id: string;
  role: string;
  chapter: number;
  lesson: number;
  question: string;
  options: any[];
  correctIndex: number;
  explication: string | null;
  actif: boolean;
  moduleId: string | null;
}

export interface FormationFromAPI {
  id: string;
  role: string;
  category: string;
  title: string;
  description: string;
  duration: number;
  points: number;
  content: {
    title: string;
    content: string;
    example: string;
    bulletPoints: string[];
  };
  questions: Array<{
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
  }>;
}

export function useAcademyModules(role: string) {
  const [formations, setFormations] = useState<FormationFromAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!role) return;
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const modulesRes = await fetch(`${API_URL}/academy/modules?profil=${role}`, { credentials: 'include' });
        if (!modulesRes.ok) throw new Error('Erreur chargement modules');
        const modulesData = await modulesRes.json();
        const allModules: AcademyModuleAPI[] = Array.isArray(modulesData) ? modulesData : (modulesData.modules || modulesData.data || []);
        const modules = allModules.filter(m => m.profil === role || m.profil === 'tous').filter(m => m.statut === 'publie');

        const formationsList: FormationFromAPI[] = await Promise.all(
          modules.map(async (m) => {
            try {
              const qRes = await fetch(`${API_URL}/academy/questions?module_id=${m.id}`, { credentials: 'include' });
              if (!qRes.ok) throw new Error();
              const qData = await qRes.json();
              const questionsRaw: AcademyQuestionAPI[] = qData.questions || qData.data || [];
              const questions = questionsRaw
                .filter(q => q.actif !== false)
                .map(q => {
                  let options: string[] = [];
                  if (Array.isArray(q.options)) {
                    options = q.options.map((o: any) => typeof o === 'string' ? o : (o?.text || ''));
                  }
                  while (options.length < 4) options.push('');
                  return {
                    question: q.question,
                    options,
                    correctAnswer: q.correctIndex || 0,
                    explanation: q.explication || '',
                  };
                });
              return {
                id: m.id,
                role: m.profil,
                category: m.niveau || 'Général',
                title: m.titre,
                description: m.description || '',
                duration: m.duree || 10,
                points: m.points || 50,
                content: {
                  title: m.titre,
                  content: m.description || '',
                  example: '',
                  bulletPoints: [],
                },
                questions,
              };
            } catch {
              return {
                id: m.id,
                role: m.profil,
                category: m.niveau || 'Général',
                title: m.titre,
                description: m.description || '',
                duration: m.duree || 10,
                points: m.points || 50,
                content: { title: m.titre, content: m.description || '', example: '', bulletPoints: [] },
                questions: [],
              };
            }
          })
        );

        if (!cancelled) {
          setFormations(formationsList);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || 'Erreur de chargement');
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [role]);

  return { formations, loading, error };
}
