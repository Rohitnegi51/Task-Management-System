'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, CheckSquare, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuthStore } from '@/store/useAuthStore';
import apiClient from '@/lib/axios';

const navItems = [
  { name: 'Today', href: '/' },
  { name: 'Scheduled', href: '/scheduled' },
  { name: 'Progress', href: '/progress' },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { clearAuth } = useAuthStore();

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error', error);
    } finally {
      clearAuth();
      router.push('/login');
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">

        {/* Mobile: Hamburger Menu (Left) */}
        <div className="flex md:hidden items-center">
          <Sheet>
            <SheetTrigger>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col h-full">
              <SheetTitle>
                 <div className="flex items-center gap-2 font-bold text-lg mb-6">
                  <CheckSquare className="h-5 w-5 text-primary" />
                  <span>TaskMaster</span>
                </div>
              </SheetTitle>
              <nav className="flex flex-col gap-4 mt-4">
                {navItems.map((item) => (
                  <SheetClose key={item.name}>
                    <Link
                      href={item.href}
                      className={`text-lg font-medium transition-colors hover:text-primary ${
                        pathname === item.href ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      {item.name}
                    </Link>
                  </SheetClose>
                ))}
              </nav>
              {/* Bottom aligned elements in Mobile Menu */}
              <div className="mt-auto border-t pt-4 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Theme</span>
                  <ThemeToggle />
                </div>
                <Button variant="destructive" className="w-full justify-start" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop: Logo (Left) */}
        <Link href="/" className="hidden md:flex items-center gap-2 font-bold text-xl tracking-tight mr-6">
          <CheckSquare className="h-6 w-6 text-primary" />
          <span>TaskMaster</span>
        </Link>

        {/* Desktop: Links (Center-ish) */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium flex-1">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`transition-colors hover:text-primary ${
                pathname === item.href ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Both: Right Side Actions */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle is hidden on mobile nav bar because it's inside the hamburger menu */}
          <div className="hidden md:block">
            <ThemeToggle />
          </div>
          <Button variant="ghost" size="icon" className="hidden md:flex text-muted-foreground hover:text-destructive" onClick={handleLogout}>
             <LogOut className="h-5 w-5" />
             <span className="sr-only">Logout</span>
          </Button>

           {/* Mobile layout keeps the logo centered if possible, or just space between. Let's show logo in center on mobile. */}
           <div className="md:hidden flex items-center font-bold text-lg">
             <CheckSquare className="mr-2 h-5 w-5 text-primary" />
             TaskMaster
           </div>

           {/* Spacer for mobile to keep logo centered */}
           <div className="md:hidden w-10"></div>
        </div>

      </div>
    </header>
  );
}