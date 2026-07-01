import { Outlet, Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { useTheme } from '@/context/ThemeContext';

const NAV = [
  { label: 'Schemas', href: '/schemas', icon: '📋' },
  { label: 'Evaluations', href: '/evaluations', icon: '⚡' },
  { label: 'Run Execution', href: '/executions', icon: '▶️' },
];

export function AppLayout() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Sidebar */}
      <aside className="w-56 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="px-4 py-5 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Criteria System v3</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Rule Engine MVP</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(item => (
            <Link
              key={item.label}
              to={item.href}
              className={clsx(
                'block px-3 py-2 rounded-md text-sm font-medium transition-colors',
                location.pathname.startsWith(item.href.split('/')[1] === '' ? '/' : `/${item.href.split('/')[1]}`)
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Bottom section with theme toggle and org ID */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
          {/* Theme Toggle */}
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

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

function OrgIdBadge() {
  return (
    <div className="text-xs text-gray-400 dark:text-gray-500">
      <span className="font-mono break-all">X-Org-Id: dev</span>
    </div>
  );
}
