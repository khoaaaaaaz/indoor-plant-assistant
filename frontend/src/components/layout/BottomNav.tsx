import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Scan, CalendarDays, Settings } from 'lucide-react';
import { Show, UserButton } from '@clerk/react';
import { useTranslation } from 'react-i18next';

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <>
      {/* Spacer to prevent content from hiding behind the fixed navbar */}
      <div className="h-20 lg:hidden" />

      <nav className="fixed bottom-0 left-0 z-50 w-full bg-background/90 backdrop-blur-lg border-t border-border/50 lg:hidden shadow-[0_-4px_20px_rgba(23,49,36,0.06)]">
        <div className="relative flex h-16 items-center justify-between px-6 pb-safe">
          
          {/* Left Section: My Garden & Care (Care requires auth) */}
          <div className="flex flex-1 justify-around items-center h-full">
            <Link
              to="/"
              className={`
                flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-colors cursor-pointer
                ${location.pathname === '/' ? 'text-primary' : 'text-muted-foreground hover:text-primary'}
              `}
            >
              <Home className="h-5 w-5" />
              <span className="text-[10px] font-semibold">{t('nav.myGarden', 'Garden')}</span>
            </Link>

            <Show when="signed-in">
              <Link
                to="/care"
                className={`
                  flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-colors cursor-pointer
                  ${location.pathname === '/care' ? 'text-primary' : 'text-muted-foreground hover:text-primary'}
                `}
              >
                <CalendarDays className="h-5 w-5" />
                <span className="text-[10px] font-semibold">{t('nav.care', 'Care')}</span>
              </Link>
            </Show>
          </div>

          {/* Center Section: Floating Action Button (Scan - requires auth) */}
          <Show when="signed-in">
            <div className="relative -top-4 flex justify-center w-16 shrink-0 z-10">
              <button
                onClick={() => navigate('/?scan=true')}
                className="flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                aria-label={t('nav.scan', 'Scan')}
              >
                <Scan className="h-6 w-6" />
              </button>
            </div>
          </Show>

          {/* Right Section: Settings & Profile (Profile requires auth) */}
          <div className="flex flex-1 justify-around items-center h-full">
            <Link
              to="/settings"
              className={`
                flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-colors cursor-pointer
                ${location.pathname === '/settings' ? 'text-primary' : 'text-muted-foreground hover:text-primary'}
              `}
            >
              <Settings className="h-5 w-5" />
              <span className="text-[10px] font-semibold">{t('nav.settings', 'Settings')}</span>
            </Link>

            <Show when="signed-in">
              <div className="flex flex-col items-center justify-center gap-1 w-16 h-full">
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: 'h-5 w-5',
                    },
                  }}
                />
                <span className="text-[10px] font-semibold text-muted-foreground">{t('nav.profile', 'Profile')}</span>
              </div>
            </Show>
          </div>

        </div>
      </nav>
    </>
  );
}
