// src/components/layout/BottomNav.tsx
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Scan, CalendarDays, Settings } from 'lucide-react';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  isFab?: boolean;
}

const navItems: NavItem[] = [
  { icon: <Home className="h-5 w-5" />, label: 'Garden', href: '/' },
  { icon: <CalendarDays className="h-5 w-5" />, label: 'Care', href: '/care' },
  { icon: <Scan className="h-6 w-6" />, label: 'Scan', href: '/scan', isFab: true },
  { icon: <Settings className="h-5 w-5" />, label: 'Settings', href: '/settings' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <>
      {/* Spacer to prevent content from hiding behind the fixed navbar */}
      <div className="h-20 lg:hidden" />

      <nav className="fixed bottom-0 left-0 z-50 w-full bg-background/90 backdrop-blur-lg border-t border-border/50 lg:hidden shadow-[0_-4px_20px_rgba(23,49,36,0.06)]">
        <div className="flex h-16 items-center justify-around px-4 pb-safe">
          {navItems.map((item) =>
            item.isFab ? (
              /* ─── Floating Action Button (Scan) ─── */
              <div key={item.label} className="relative -top-4">
                <button
                  onClick={() => navigate('/scan')}
                  className="flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
                  aria-label={item.label}
                >
                  {item.icon}
                </button>
              </div>
            ) : (
              /* ─── Regular Nav Item ─── */
              <Link
                key={item.label}
                to={item.href}
                className={`
                  flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-colors
                  ${location.pathname === item.href
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-primary'
                  }
                `}
              >
                {item.icon}
                <span className="text-[10px] font-semibold">{item.label}</span>
              </Link>
            )
          )}
        </div>
      </nav>
    </>
  );
}
