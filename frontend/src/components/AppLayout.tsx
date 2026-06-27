import { Outlet, Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';

const NAV = [
  { label: 'Schemas', href: '/schemas' },
  { label: 'Graph Builder', href: '/schemas' },
  { label: 'Run Execution', href: '/schemas' },
];

export function AppLayout() {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-4 py-5 border-b border-gray-200">
          <h1 className="text-sm font-semibold text-gray-900">Criteria System v3</h1>
          <p className="text-xs text-gray-500 mt-0.5">Rule Engine MVP</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(item => (
            <Link
              key={item.label}
              to={item.href}
              className={clsx(
                'block px-3 py-2 rounded-md text-sm font-medium transition-colors',
                location.pathname.startsWith(item.href.split('/')[1] === '' ? '/' : '/' + item.href.split('/')[1])
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-gray-200">
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
  // In MVP, show the org ID. Replace with real auth in production.
  return (
    <div className="text-xs text-gray-400">
      <span className="font-mono break-all">X-Org-Id: dev</span>
    </div>
  );
}
