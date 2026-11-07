import { STORAGE_KEYS } from '../config/app';
import { newLearnerModel, normalizeModel } from '../engine/adaptive';
import type { Group, TestId } from '../engine/types';
import { buildDemoDatabase, emptyDatabase } from './demo';
import { RepositoryError, anonCode, capitalizeName, newId, normalizeName } from './ids';
import type { Repository } from './repository';
import type {
  Alert,
  Attempt,
  ClassRoom,
  Database,
  MissionRun,
  QuestionnaireResponse,
  QuestionnaireWindow,
  Settings,
  Student,
  TeacherMessage,
  TestCopy,
  VideoView,
} from './types';

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

const copy = <T>(x: T): T => structuredClone(x);
const now = () => new Date().toISOString();

/** Implémentation V1 : toute la base dans une clé localStorage (avec repli en mémoire). */
export class LocalStorageRepository implements Repository {
  private db: Database | null = null;

  constructor(private readonly key: string = STORAGE_KEYS.db) {}

  private load(): Database {
    if (this.db) return this.db;
    const raw = storage()?.getItem(this.key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Database;
        if (parsed.version === 1 && Array.isArray(parsed.students)) {
          // Champs ajoutés au fil des versions : on complète sans perdre les données.
          const base = emptyDatabase();
          this.db = { ...base, ...parsed, settings: { ...base.settings, ...parsed.settings } };
          this.db.students.forEach((s) => (s.model = normalizeModel(s.model)));
          return this.db;
        }
      } catch {
        // Données corrompues : on repart des données de démo.
      }
    }
    this.db = buildDemoDatabase();
    this.persist();
    return this.db;
  }

  private persist(): void {
    try {
      storage()?.setItem(this.key, JSON.stringify(this.db));
    } catch {
      // Stockage plein ou indisponible (navigation privée) : on garde la base en mémoire.
    }
  }

  private student(id: string): Student {
    const s = this.load().students.find((x) => x.id === id);
    if (!s) throw new RepositoryError('Apprenant introuvable.');
    return s;
  }

  private nextAnonCode(): string {
    const db = this.load();
    const used = new Set(db.students.map((s) => s.anonCode));
    let code = anonCode(db.nextAnon);
    while (used.has(code)) {
      db.nextAnon += 1;
      code = anonCode(db.nextAnon);
    }
    db.nextAnon += 1;
    return code;
  }

  async init(): Promise<void> {
    this.load();
  }

  async resetDemo(): Promise<void> {
    this.db = buildDemoDatabase();
    this.persist();
  }

  async clearDemo(): Promise<void> {
    const db = this.load();
    const demoIds = new Set(db.students.filter((s) => s.demo).map((s) => s.id));
    const keep = <T extends { studentId: string }>(arr: T[]) => arr.filter((x) => !demoIds.has(x.studentId));
    db.students = db.students.filter((s) => !s.demo);
    db.attempts = keep(db.attempts);
    db.alerts = keep(db.alerts);
    db.messages = keep(db.messages);
    db.videoViews = keep(db.videoViews);
    db.missionRuns = keep(db.missionRuns);
    db.questionnaireResponses = keep(db.questionnaireResponses);
    db.testCopies = keep(db.testCopies);
    this.persist();
  }

  async hasDemoData(): Promise<boolean> {
    return this.load().students.some((s) => s.demo);
  }

  async getSettings(): Promise<Settings> {
    return copy(this.load().settings);
  }

  async saveSettings(settings: Settings): Promise<void> {
    this.load().settings = copy(settings);
    this.persist();
  }

  async checkTeacherPin(pin: string): Promise<boolean> {
    return pin.trim() === this.load().settings.teacherPin;
  }

  async listClasses(): Promise<ClassRoom[]> {
    return copy(this.load().classes);
  }

  async addClass(room: ClassRoom): Promise<void> {
    const db = this.load();
    const code = room.code.trim().toUpperCase();
    if (!code) throw new RepositoryError('Code de classe vide.');
    if (db.classes.some((c) => c.code === code)) throw new RepositoryError('Ce code de classe existe déjà.');
    db.classes.push({ code, name: room.name.trim() || code });
    this.persist();
  }

  private makeStudent(firstName: string, lastName: string, classCode: string, group: Group, createdBy: Student['createdBy']): Student {
    return {
      id: newId('stu'),
      anonCode: this.nextAnonCode(),
      firstName: capitalizeName(firstName),
      lastName: capitalizeName(lastName),
      classCode,
      group,
      createdBy,
      accessOpened: false,
      createdAt: now(),
      lastActive: null,
      model: newLearnerModel(),
    };
  }

  private checkNames(firstName: string, lastName: string, classCode: string): string {
    const db = this.load();
    const code = classCode.trim().toUpperCase();
    if (!db.classes.some((c) => c.code === code)) throw new RepositoryError('Code de classe inconnu. Vérifie-le auprès de ton professeur.');
    if (!firstName.trim() || !lastName.trim()) throw new RepositoryError('Indique le prénom et le nom.');
    return code;
  }

  private findByName(firstName: string, lastName: string, code: string): Student | undefined {
    const f = normalizeName(firstName);
    const l = normalizeName(lastName);
    return this.load().students.find((s) => s.classCode === code && normalizeName(s.firstName) === f && normalizeName(s.lastName) === l);
  }

  async findOrCreateStudent(firstName: string, lastName: string, classCode: string): Promise<Student> {
    const code = this.checkNames(firstName, lastName, classCode);
    let student = this.findByName(firstName, lastName, code);
    if (!student) {
      student = this.makeStudent(firstName, lastName, code, 'experimental', 'self');
      this.load().students.push(student);
    }
    student.lastActive = now();
    this.persist();
    return copy(student);
  }

  async createStudent(firstName: string, lastName: string, classCode: string, group: Group): Promise<Student> {
    const code = this.checkNames(firstName, lastName, classCode);
    if (this.findByName(firstName, lastName, code)) throw new RepositoryError('Cet apprenant existe déjà dans cette classe.');
    const student = this.makeStudent(firstName, lastName, code, group, 'teacher');
    this.load().students.push(student);
    this.persist();
    return copy(student);
  }

  async getStudent(id: string): Promise<Student | null> {
    const s = this.load().students.find((x) => x.id === id);
    return s ? copy(s) : null;
  }

  async listStudents(filter: { classCode?: string; group?: Group } = {}): Promise<Student[]> {
    return copy(
      this.load().students.filter((s) => (!filter.classCode || s.classCode === filter.classCode) && (!filter.group || s.group === filter.group)),
    );
  }

  async saveStudent(student: Student): Promise<void> {
    const db = this.load();
    const i = db.students.findIndex((s) => s.id === student.id);
    if (i < 0) throw new RepositoryError('Apprenant introuvable.');
    db.students[i] = copy(student);
    this.persist();
  }

  async resetStudentProgress(id: string): Promise<void> {
    const s = this.student(id);
    s.model = newLearnerModel();
    this.load()
      .alerts.filter((a) => a.studentId === id && !a.resolved)
      .forEach((a) => {
        a.resolved = true;
        a.resolvedAt = now();
      });
    this.persist();
  }

  async addAttempt(attempt: Attempt): Promise<void> {
    this.load().attempts.push(copy(attempt));
    this.persist();
  }

  async listAttempts(filter: { studentId?: string } = {}): Promise<Attempt[]> {
    return copy(this.load().attempts.filter((a) => !filter.studentId || a.studentId === filter.studentId));
  }

  async addAlert(alert: Alert): Promise<void> {
    this.load().alerts.push(copy(alert));
    this.persist();
  }

  async listAlerts(filter: { studentId?: string; activeOnly?: boolean } = {}): Promise<Alert[]> {
    return copy(
      this.load().alerts.filter((a) => (!filter.studentId || a.studentId === filter.studentId) && (!filter.activeOnly || !a.resolved)),
    );
  }

  async resolveAlerts(studentId: string): Promise<void> {
    this.load()
      .alerts.filter((a) => a.studentId === studentId && !a.resolved)
      .forEach((a) => {
        a.resolved = true;
        a.resolvedAt = now();
      });
    this.persist();
  }

  async addMessage(message: TeacherMessage): Promise<void> {
    this.load().messages.push(copy(message));
    this.persist();
  }

  async listMessages(studentId: string): Promise<TeacherMessage[]> {
    return copy(this.load().messages.filter((m) => m.studentId === studentId));
  }

  async markMessagesRead(studentId: string): Promise<void> {
    this.load()
      .messages.filter((m) => m.studentId === studentId)
      .forEach((m) => (m.read = true));
    this.persist();
  }

  async addVideoView(view: VideoView): Promise<void> {
    this.load().videoViews.push(copy(view));
    this.persist();
  }

  async listVideoViews(filter: { studentId?: string } = {}): Promise<VideoView[]> {
    return copy(this.load().videoViews.filter((v) => !filter.studentId || v.studentId === filter.studentId));
  }

  async addMissionRun(run: MissionRun): Promise<void> {
    this.load().missionRuns.push(copy(run));
    this.persist();
  }

  async listMissionRuns(filter: { studentId?: string } = {}): Promise<MissionRun[]> {
    return copy(this.load().missionRuns.filter((r) => !filter.studentId || r.studentId === filter.studentId));
  }

  async listQuestionnaireWindows(): Promise<QuestionnaireWindow[]> {
    return copy(this.load().questionnaireWindows);
  }

  async getQuestionnaireWindow(classCode: string): Promise<QuestionnaireWindow> {
    const w = this.load().questionnaireWindows.find((x) => x.classCode === classCode);
    const win = w ?? { classCode, open: false, openedAt: null, closedAt: null, deadline: null };
    // Date limite dépassée : le questionnaire est considéré comme fermé.
    if (win.open && win.deadline && new Date(win.deadline).getTime() < Date.now()) return { ...copy(win), open: false };
    return copy(win);
  }

  async saveQuestionnaireWindow(window: QuestionnaireWindow): Promise<void> {
    const db = this.load();
    const i = db.questionnaireWindows.findIndex((x) => x.classCode === window.classCode);
    if (i >= 0) db.questionnaireWindows[i] = copy(window);
    else db.questionnaireWindows.push(copy(window));
    this.persist();
  }

  async getQuestionnaireResponse(studentId: string): Promise<QuestionnaireResponse | null> {
    const r = this.load().questionnaireResponses.find((x) => x.studentId === studentId && !x.archived);
    return r ? copy(r) : null;
  }

  async listQuestionnaireResponses(filter: { includeArchived?: boolean } = {}): Promise<QuestionnaireResponse[]> {
    return copy(this.load().questionnaireResponses.filter((r) => filter.includeArchived || !r.archived));
  }

  async saveQuestionnaireResponse(response: QuestionnaireResponse): Promise<void> {
    const db = this.load();
    const i = db.questionnaireResponses.findIndex((x) => x.id === response.id);
    if (i >= 0) db.questionnaireResponses[i] = copy(response);
    else db.questionnaireResponses.push(copy(response));
    this.persist();
  }

  async allowQuestionnaireRetake(studentId: string): Promise<void> {
    this.load()
      .questionnaireResponses.filter((r) => r.studentId === studentId && !r.archived)
      .forEach((r) => (r.archived = true));
    this.persist();
  }

  async listTestCopies(filter: { test?: TestId; studentId?: string } = {}): Promise<TestCopy[]> {
    return copy(this.load().testCopies.filter((c) => (!filter.test || c.test === filter.test) && (!filter.studentId || c.studentId === filter.studentId)));
  }

  async getTestCopy(studentId: string, test: TestId): Promise<TestCopy | null> {
    const c = this.load().testCopies.find((x) => x.studentId === studentId && x.test === test);
    return c ? copy(c) : null;
  }

  async saveTestCopy(testCopy: TestCopy): Promise<void> {
    const db = this.load();
    const i = db.testCopies.findIndex((x) => x.id === testCopy.id || (x.studentId === testCopy.studentId && x.test === testCopy.test));
    if (i >= 0) db.testCopies[i] = copy(testCopy);
    else db.testCopies.push(copy(testCopy));
    this.persist();
  }

  async deleteTestCopy(id: string): Promise<void> {
    const db = this.load();
    db.testCopies = db.testCopies.filter((c) => c.id !== id);
    this.persist();
  }
}
