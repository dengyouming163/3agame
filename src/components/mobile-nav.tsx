'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, Swords, Shield, Map, Gamepad2, Lightbulb } from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  swords: Swords,
  shield: Shield,
  map: Map,
  gamepad2: Gamepad2,
  lightbulb: Lightbulb,
};

interface NavLink {
  href: string;
  label: string;
  iconName: string;
  color: string;
}

export function MobileNav({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
        aria-label="Toggle navigation"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div className="absolute top-16 left-0 right-0 border-b border-border bg-background/95 backdrop-blur-lg z-50">
          <nav className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1">
            {links.map((link) => {
              const IconComp = ICON_MAP[link.iconName];
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                >
                  {IconComp && <IconComp className={`h-4 w-4 ${link.color}`} />}
                  {link.label}
                </Link>
              );
            })}
            <div className="h-px bg-border my-1" />
            <Link
              href="/games"
              onClick={() => setOpen(false)}
              className="px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
            >
              All Games
            </Link>
          </nav>
        </div>
      )}
    </div>
  );
}
