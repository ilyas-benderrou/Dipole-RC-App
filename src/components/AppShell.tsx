import { Bell, LogOut, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../app/auth';
import { APP } from '../config/app';
import { Logo } from './Logo';
import { DemoBanner, relativeTime } from './ui';

export interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  /** Correspondance exacte de l'URL (accueil). */
  end?: boolean;
  /** Pastille de notification (ex. questionnaire à faire). */
  badge?: boolean;
  locked?: boolean;
}

export interface ShellNotification {
  id: string;
  text: string;
  at?: string | null;
  to?: string;
  unread?: boolean;
}

export interface SearchEntry {
  label: string;
  hint?: string;
  to: string;
  keywords?: string;
}

interface Props {
  title: ReactNode;
  greeting?: ReactNode;
  children: ReactNode;
  nav: NavItem[];
  /** Barre du bas sur téléphone (5 icônes). */
  mobileNav: NavItem[];
  user: { name: string; sub?: string; initials: string };
  notifications?: ShellNotification[];
  onNotificationsOpen?: () => void;
  search?: SearchEntry[];
  demo?: boolean;
  /** Contenu flottant (tuteur Capi). */
  floating?: ReactNode;
  headerExtra?: ReactNode;
}

function SearchBox({ entries }: { entries: SearchEntry[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const results = useMemo(() => {
    const n = norm(q.trim());
    if (!n) return entries.slice(0, 7);
    return entries.filter((e) => norm(`${e.label} ${e.hint ?? ''} ${e.keywords ?? ''}`).includes(n)).slice(0, 8);
  }, [q, entries]);
  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="grid h-10 w-10 place-items-center rounded-full text-teal-700 transition hover:bg-white/70" aria-label="Rechercher" aria-expanded={open}>
        <Search size={20} />
      </button>
      {open && (
        <div className="glass glass-strong page-enter absolute right-0 top-12 z-40 w-[min(22rem,calc(100vw-2rem))] p-2">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Leçon, mission, page…"
            className="field mb-1"
            aria-label="Rechercher dans l'application"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && results[0]) {
                navigate(results[0].to);
                setOpen(false);
              }
            }}
          />
          <ul className="max-h-80 overflow-y-auto">
            {results.map((r) => (
              <li key={r.to + r.label}>
                <button
                  type="button"
                  className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-teal-50"
                  onClick={() => {
                    navigate(r.to);
                    setOpen(false);
                  }}
                >
                  <span className="font-semibold text-ink">{r.label}</span>
                  {r.hint && <span className="ml-2 text-xs text-muted">{r.hint}</span>}
                </button>
              </li>
            ))}
            {!results.length && <li className="px-3 py-2 text-sm text-muted">Aucun résultat.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

function NotificationBell({ items, onOpen }: { items: ShellNotification[]; onOpen?: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const unread = items.filter((i) => i.unread).length;
  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) onOpen?.();
        }}
        className="relative grid h-10 w-10 place-items-center rounded-full text-teal-700 transition hover:bg-white/70"
        aria-label={`Notifications${unread ? ` (${unread} non lues)` : ''}`}
        aria-expanded={open}
      >
        <Bell size={20} />
        {unread > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-cur ring-2 ring-white" />}
      </button>
      {open && (
        <div className="glass glass-strong page-enter absolute right-0 top-12 z-40 w-[min(22rem,calc(100vw-2rem))] p-2">
          <p className="label-caps px-3 py-1.5">Notifications</p>
          <ul className="max-h-80 overflow-y-auto">
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  disabled={!n.to}
                  onClick={() => {
                    if (n.to) navigate(n.to);
                    setOpen(false);
                  }}
                  className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-teal-50 disabled:cursor-default disabled:hover:bg-transparent"
                >
                  <span className={n.unread ? 'font-semibold text-ink' : 'text-ink-soft'}>{n.text}</span>
                  {n.at && <span className="block text-xs text-muted">{relativeTime(n.at)}</span>}
                </button>
              </li>
            ))}
            {!items.length && <li className="px-3 py-3 text-sm text-muted">Rien de nouveau pour l'instant.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

function SideLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[0.92rem] font-medium transition ${
          isActive ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-[0_12px_24px_-12px_rgba(15,124,124,0.95)]' : 'text-teal-800 hover:bg-white/60'
        }`
      }
    >
      <span className="shrink-0 [&_svg]:h-[19px] [&_svg]:w-[19px]">{item.icon}</span>
      <span className="truncate">{item.label}</span>
      {item.badge && <span className="ml-auto h-2.5 w-2.5 rounded-full bg-cur ring-2 ring-white" aria-label="À faire" />}
      {item.locked && <span className="ml-auto text-xs opacity-60" aria-label="Verrouillé">🔒</span>}
    </NavLink>
  );
}

export function AppShell({ title, greeting, children, nav, mobileNav, user, notifications = [], onNotificationsOpen, search = [], demo, floating, headerExtra }: Props) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menu, setMenu] = useState(false);
  useEffect(() => setMenu(false), [location.pathname]);

  return (
    <div className="min-h-screen lg:p-5">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-2">
        Aller au contenu
      </a>
      <div className="mx-auto flex max-w-[1500px] gap-5 lg:glass lg:min-h-[calc(100vh-2.5rem)] lg:rounded-[28px] lg:bg-white/25 lg:p-0">
        {/* Barre latérale (ordinateur) */}
        <aside className="no-print sticky top-5 hidden h-[calc(100vh-2.5rem)] w-[248px] shrink-0 flex-col border-r border-white/60 px-4 py-6 lg:flex">
          <Link to={nav[0]?.to ?? '/'} className="mb-8 px-2" aria-label={`Accueil ${APP.name}`}>
            <Logo />
          </Link>
          <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto thin-scroll" aria-label="Navigation principale">
            {nav.map((item, i) => (
              <div key={item.to}>
                {i > 0 && item.label === '—' ? <hr className="my-3 border-white/70" /> : <SideLink item={item} />}
              </div>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="mt-4 flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-white/60"
          >
            <LogOut size={18} /> Déconnexion
          </button>
        </aside>

        <div className="min-w-0 flex-1 px-4 pb-28 pt-4 sm:px-6 lg:px-8 lg:pb-8 lg:pt-7">
          {/* En-tête */}
          <header className="no-print mb-5 flex items-start justify-between gap-3 sm:mb-7">
            <div className="min-w-0">
              <div className="mb-3 lg:hidden">
                <Logo compact />
              </div>
              {greeting && <p className="text-sm font-medium text-teal-700 sm:text-[0.95rem]">{greeting}</p>}
              <h1 className="mt-0.5 text-[1.85rem] font-semibold leading-tight tracking-tight text-ink sm:text-[2.5rem]">{title}</h1>
            </div>
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              {headerExtra}
              {search.length > 0 && <SearchBox entries={search} />}
              <NotificationBell items={notifications} onOpen={onNotificationsOpen} />
              <div className="relative">
                <button type="button" onClick={() => setMenu((m) => !m)} className="flex items-center gap-2 rounded-full py-1 pl-1 pr-1 transition hover:bg-white/60 sm:pr-3" aria-label="Menu du compte" aria-expanded={menu}>
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-teal-400 to-teal-700 text-sm font-bold text-white ring-2 ring-white">{user.initials}</span>
                  <span className="hidden text-left leading-tight sm:block">
                    <span className="block text-sm font-semibold text-ink">{user.name}</span>
                    {user.sub && <span className="block text-xs text-muted">{user.sub}</span>}
                  </span>
                </button>
                {menu && (
                  <div className="glass glass-strong page-enter absolute right-0 top-12 z-40 w-48 p-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        navigate('/');
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-teal-50"
                    >
                      <LogOut size={16} /> Déconnexion
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>
          {demo && <DemoBanner className="no-print mb-4 w-fit" />}
          <main id="contenu" key={location.pathname} className="page-enter">
            {children}
          </main>
        </div>
      </div>

      {/* Barre du bas (téléphone) : 5 icônes */}
      <nav className="no-print fixed inset-x-2 bottom-2 z-30 lg:hidden" aria-label="Navigation">
        <div className="glass glass-strong flex items-stretch justify-around px-1 py-1.5" style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom))' }}>
          {mobileNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10.5px] font-semibold transition ${isActive ? 'bg-teal-600 text-white' : 'text-teal-800'}`
              }
            >
              <span className="[&_svg]:h-5 [&_svg]:w-5">{item.icon}</span>
              <span className="truncate">{item.label}</span>
              {item.badge && <span className="absolute right-3 top-1 h-2 w-2 rounded-full bg-cur" />}
            </NavLink>
          ))}
        </div>
      </nav>
      {floating}
    </div>
  );
}
