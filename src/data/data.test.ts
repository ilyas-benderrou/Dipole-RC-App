import { beforeEach, describe, expect, it } from 'vitest';
import { LocalStorageRepository } from './localStorageRepository';

class MemoryStorage {
  private m = new Map<string, string>();
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();
});

describe('repository localStorage', () => {
  it('crée un apprenant à la première connexion, avec un code anonyme, puis le retrouve', async () => {
    const repo = new LocalStorageRepository('test');
    await repo.init();
    await repo.clearDemo();
    const a = await repo.findOrCreateStudent('yassine', 'el idrissi', '2bac-pc-a');
    expect(a.firstName).toBe('Yassine');
    expect(a.lastName).toBe('El Idrissi');
    expect(a.classCode).toBe('2BAC-PC-A');
    expect(a.group).toBe('experimental');
    expect(a.anonCode).toMatch(/^A-\d{2,}$/);
    const b = await repo.findOrCreateStudent(' Yassine ', 'EL IDRISSI', '2BAC-PC-A');
    expect(b.id).toBe(a.id);
  });

  it('refuse un code de classe inconnu', async () => {
    const repo = new LocalStorageRepository('test');
    await expect(repo.findOrCreateStudent('A', 'B', 'XXX')).rejects.toThrow(/classe inconnu/);
  });

  it('donne des codes anonymes distincts et crée des apprenants du groupe témoin', async () => {
    const repo = new LocalStorageRepository('test');
    await repo.clearDemo();
    const t = await repo.createStudent('Nora', 'Bennani', '2BAC-PC-A', 'temoin');
    const u = await repo.createStudent('Omar', 'Tazi', '2BAC-PC-A', 'temoin');
    expect(t.group).toBe('temoin');
    expect(t.createdBy).toBe('teacher');
    expect(t.anonCode).not.toBe(u.anonCode);
    await expect(repo.createStudent('nora', 'bennani', '2BAC-PC-A', 'temoin')).rejects.toThrow(/existe déjà/);
  });

  it('persiste dans localStorage et conserve l’historique lors d’une réinitialisation', async () => {
    const repo = new LocalStorageRepository('test');
    await repo.clearDemo();
    const s = await repo.findOrCreateStudent('Salma', 'Alaoui', '2BAC-PC-A');
    s.model.competences.C1 = 80;
    await repo.saveStudent(s);
    const again = new LocalStorageRepository('test');
    expect((await again.getStudent(s.id))?.model.competences.C1).toBe(80);
    await again.resetStudentProgress(s.id);
    expect((await again.getStudent(s.id))?.model.competences.C1).toBe(0);
  });

  it('archive la passation du questionnaire quand le professeur autorise une reprise', async () => {
    const repo = new LocalStorageRepository('test');
    await repo.clearDemo();
    const s = await repo.findOrCreateStudent('Imane', 'Tazi', '2BAC-PC-B');
    await repo.saveQuestionnaireResponse({ id: 'r1', studentId: s.id, startedAt: '', submittedAt: '2026-01-01', autoSubmitted: false, order: {}, answers: {} });
    expect(await repo.getQuestionnaireResponse(s.id)).not.toBeNull();
    await repo.allowQuestionnaireRetake(s.id);
    expect(await repo.getQuestionnaireResponse(s.id)).toBeNull();
    expect((await repo.listQuestionnaireResponses({ includeArchived: true })).length).toBe(1);
  });
});
