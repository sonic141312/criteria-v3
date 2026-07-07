import { Outlet, Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { useTheme } from '@/context/ThemeContext';
import { ClipboardList, Zap, PlayCircle, Database } from 'lucide-react';

const NAV = [
  { label: 'Schemas', href: '/schemas', icon: ClipboardList, match: 'schemas' },
  { label: 'Evaluations', href: '/evaluations', icon: Zap, match: 'evaluations' },
  { label: 'Executions', href: '/executions', icon: PlayCircle, match: 'executions' },
];

export function AppLayout() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <aside className="w-56 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="px-4 py-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Criteria System</h1>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Rule Engine v3</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(item => {
            const Icon = item.icon;
            const active = location.pathname.startsWith(`/${item.match}`);
            return (
              <Link
                key={item.label}
                to={item.href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  active
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100',
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <span className="flex items-center gap-2">
              {theme === 'dark' ? '🌙' : '☀️'}
              {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </span>
            <span className="text-[10px] opacity-60">
              {theme === 'dark' ? 'ON' : 'OFF'}
            </span>
          </button>

          <OrgIdBadge />
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

function OrgIdBadge() {
  const orgId = (typeof window !== 'undefined' ? (window as Window & { __orgId?: string }).__orgId : null) ?? '00000000-0000-0000-0000-000000000001';
  const shortId = `${orgId.substring(0, 4)}...${orgId.substring(orgId.length - 4)}`;
  return (
    <div className="text-xs text-gray-400 dark:text-gray-500 px-3">
      <span className="font-medium">Org ID</span>{' '}
      <span className="font-mono" title={orgId}>{shortId}</span>
    </div>
  );
}
