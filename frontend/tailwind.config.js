/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      /* ─── Typography ─── */
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        serif: ['"Newsreader"', 'serif'],
        headline: ['"Newsreader"', 'serif'],
        body: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      fontSize: {
        'headline-xl': ['40px', { lineHeight: '48px', letterSpacing: '-0.02em', fontWeight: '600' }],
        'headline-lg': ['32px', { lineHeight: '40px', fontWeight: '500' }],
        'headline-lg-mobile': ['28px', { lineHeight: '36px', fontWeight: '500' }],
        'body-lg': ['18px', { lineHeight: '28px', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'label-sm': ['13px', { lineHeight: '18px', letterSpacing: '0.04em', fontWeight: '600' }],
      },

      /* ─── Colors (Shadcn CSS Variable Pattern) ─── */
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },

      /* ─── Border Radius (DESIGN.md) ─── */
      borderRadius: {
        sm: "0.25rem",     /* 4px  */
        DEFAULT: "0.5rem", /* 8px  */
        md: "0.75rem",     /* 12px */
        lg: "var(--radius)",        /* 16px (1rem) */
        xl: "1.5rem",      /* 24px — card radius per DESIGN.md */
        "2xl": "2rem",     /* 32px */
        full: "9999px",
      },

      /* ─── Spacing (8px rhythm from DESIGN.md) ─── */
      spacing: {
        'unit': '8px',
        'container-mobile': '20px',
        'container-desktop': '48px',
        'gutter': '16px',
        'section-gap': '64px',
      },
    },
  },
  plugins: [],
}
