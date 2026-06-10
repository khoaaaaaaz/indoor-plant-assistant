// import { Show, UserButton, SignInButton } from "@clerk/react";
// import { Leaf, Bell, Settings, Sun, Moon } from "lucide-react";
// import { useTheme } from "next-themes";
// import { Button } from "../ui/button";

// export function Header() {
//   const { theme, setTheme } = useTheme();
//   return (
//     <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
//       <div className="flex h-16 items-center justify-between px-container-mobile lg:px-container-desktop">
//         {/* App Logo / Title */}
//         <div className="flex items-center gap-2.5">
//           <div className="bg-primary/10 p-1.5 rounded-full">
//             <Leaf className="h-5 w-5 text-primary" />
//           </div>
//           <span className="font-headline text-xl font-semibold tracking-tight text-primary">
//             Plant Assistant
//           </span>
//         </div>

//         {/* Right-side actions */}
//         <div className="flex items-center gap-2">
//           <Show when="signed-in">
//             <button className="p-2 rounded-full text-muted-foreground hover:text-primary hover:bg-muted transition-colors">
//               <Bell className="h-5 w-5" />
//             </button>
//             <button className="p-2 rounded-full text-muted-foreground hover:text-primary hover:bg-muted transition-colors">
//               <Settings className="h-5 w-5" />
//             </button>
//             <div className="ml-1">
//               <UserButton />
//             </div>
//           </Show>
//           <Show when="signed-out">
//             <SignInButton mode="modal">
//               <button className="text-sm font-semibold px-4 py-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
//                 Sign In
//               </button>
//             </SignInButton>
//           </Show>
//         </div>
//       </div>
//       <button
//         onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
//         className="text-muted-foreground hover:text-primary transition-colors"
//         aria-label="Toggle theme"
//       >
//         {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
//       </button>
//     </header>
//   );
// }

// src/components/layout/Header.tsx
import { Show, UserButton, SignInButton } from "@clerk/react";
import { Link } from "react-router-dom";
import { Leaf, Bell, Sun, Moon, Droplets, Cloud, Trash2, X } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CuteYellowFlowerPlant } from "@/components/icons/cute-plants";
import { useNotificationStore } from "@/store/notificationStore";
import { t } from "i18next";

export function Header() {
  const { theme, setTheme } = useTheme();
  const { i18n } = useTranslation();
  const { notifications, markAllAsRead, clearNotification, clearAll, getUnreadCount } = useNotificationStore();
  const unreadCount = getUnreadCount();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-container-mobile lg:px-container-desktop">
        {/* App Logo / Title */}
        <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
          <div className="bg-primary/10 p-1.5 rounded-full">
            <Leaf className="h-5 w-5 text-primary" />
          </div>
          <span className="font-headline text-xl font-semibold tracking-tight text-primary">
            FloraMentor
          </span>
        </Link>

        {/* Right-side actions */}
        <div className="flex items-center gap-1">
          {/* Language toggle */}
          <button
            onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'vi' : 'en')}
            className="p-2 rounded-full text-label-sm font-semibold text-muted-foreground
              hover:text-primary hover:bg-muted transition-colors"
            aria-label="Toggle language"
          >
            {i18n.language === 'en' ? '🇻🇳' : '🇬🇧'}
          </button>

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-full text-muted-foreground hover:text-primary
              hover:bg-muted transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          <Show when="signed-in">
            <Popover onOpenChange={(open) => { if (open) markAllAsRead(); }}>
              <PopoverTrigger asChild>
                <button className="p-2 rounded-full text-muted-foreground hover:text-primary hover:bg-muted transition-colors relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm px-1 border border-background">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4 mr-4 mt-2 bg-card border border-border/50 shadow-lg rounded-2xl flex flex-col">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-6 px-4">
                    <CuteYellowFlowerPlant size={64} className="mb-3 opacity-80" />
                    <h4 className="font-headline text-lg text-primary font-medium mb-1">
                      {t('notifications.empty')}
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t('notifications.emptyDesc')}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col w-full">
                    {/* Header Row */}
                    <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-2 px-1">
                      <span className="text-label-sm font-semibold text-primary uppercase tracking-wider">
                        {t('notifications.title')}
                      </span>
                      <button
                        onClick={clearAll}
                        className="text-[11px] font-semibold text-muted-foreground hover:text-destructive hover:underline transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        {t('notifications.clearAll')}
                      </button>
                    </div>

                    {/* Notification List Items */}
                    <div className="max-h-72 overflow-y-auto space-y-2 pr-0.5 custom-scrollbar">
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`relative p-3 rounded-xl border border-border/30 flex gap-2.5 group transition-all duration-200 ${!n.isRead
                              ? 'bg-primary/5 border-primary/20 shadow-sm'
                              : 'bg-muted/20 hover:bg-muted/40'
                            }`}
                        >
                          {/* Notification Icon */}
                          <div className={`p-2 rounded-lg shrink-0 w-9 h-9 flex items-center justify-center ${n.type === 'care'
                              ? 'bg-sky-500/10 text-sky-600 dark:bg-sky-400/10 dark:text-sky-400'
                              : n.type === 'weather'
                                ? 'bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400'
                                : 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400'
                            }`}>
                            {n.type === 'care' ? (
                              <Droplets className="h-4.5 w-4.5" />
                            ) : n.type === 'weather' ? (
                              <Cloud className="h-4.5 w-4.5" />
                            ) : (
                              <Leaf className="h-4.5 w-4.5" />
                            )}
                          </div>

                          {/* Text Body */}
                          <div className="flex flex-col text-left pr-4">
                            <span className="text-label-sm font-semibold text-primary leading-snug">
                              {i18n.language === 'vi' ? n.titleVi : n.titleEn}
                            </span>
                            <span className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                              {i18n.language === 'vi' ? n.descVi : n.descEn}
                            </span>
                            <span className="text-[9px] text-muted-foreground/60 mt-1.5">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {/* Clear single notification button */}
                          <button
                            onClick={() => clearNotification(n.id)}
                            className="absolute top-2 right-2 text-muted-foreground/60 hover:text-destructive p-1 rounded-full hover:bg-muted transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
                            aria-label="Remove notification"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </PopoverContent>
            </Popover>
            <div className="ml-1">
              <UserButton />
            </div>
          </Show>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="text-sm font-semibold px-4 py-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                Sign In
              </button>
            </SignInButton>
          </Show>
        </div>
      </div>
    </header>
  );
}

