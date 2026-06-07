// src/components/layout/Sidebar.tsx
import { useEffect } from 'react';
import { Show, UserButton, useAuth } from '@clerk/react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, CalendarDays, Scan, Settings, ShieldCheck } from 'lucide-react';
import { useAdminStore } from '@/store/adminStore';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
}

const navItems: NavItem[] = [
  { icon: <Home className="h-5 w-5" />, label: 'My Garden', href: '/' },
  { icon: <CalendarDays className="h-5 w-5" />, label: 'Care', href: '/care' },
  { icon: <Settings className="h-5 w-5" />, label: 'Settings', href: '/settings' },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const { isAdmin, checkAdmin } = useAdminStore();

  useEffect(() => {
    if (isSignedIn) {
      checkAdmin();
    }
  }, [isSignedIn, checkAdmin]);

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border pt-20 pb-6 px-4">
      {/* ─── User Profile Section ─── */}
      <Show when="signed-in">
        <div className="flex flex-col items-center text-center mb-8 pt-4">
          <div className="mb-3">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'w-16 h-16',
                },
              }}
            />
          </div>
          <p className="font-headline text-lg font-semibold text-primary">Plant Parent</p>
          <span className="text-label-sm text-muted-foreground mt-1 px-3 py-1 bg-muted rounded-full">
            Indoor Gardener
          </span>
        </div>
      </Show>

      {/* ─── Navigation Items ─── */}
      <nav className="flex-1 flex flex-col gap-1.5">
        {navItems.map((item) => {
          // Check if current route matches this nav item
          const isActive = location.pathname === item.href;

          return (
            <Link
              key={item.label}
              to={item.href}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl text-label-sm font-semibold
                transition-all duration-200
                ${isActive
                  ? 'bg-accent text-accent-foreground translate-x-0.5'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }
              `}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Dynamic Admin link */}
        {isAdmin && (
          <Link
            to="/admin"
            className={`
              flex items-center gap-3 px-4 py-3 rounded-xl text-label-sm font-semibold
              transition-all duration-200
              ${location.pathname === '/admin'
                ? 'bg-accent text-accent-foreground translate-x-0.5'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }
            `}
          >
            <ShieldCheck className="h-5 w-5" />
            <span>Admin Control</span>
          </Link>
        )}
      </nav>

      {/* ─── Scan / Add Plant Button ─── */}
      <Show when="signed-in">
        <button
          onClick={() => navigate('/?scan=true')}
          className="mt-auto bg-primary text-primary-foreground rounded-full py-3 px-4 text-label-sm font-semibold flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:bg-primary/90 transition-all active:scale-[0.98]"
        >
          <Scan className="h-4 w-4" />
          Scan Plant
        </button>
      </Show>
    </aside>
  );
}
