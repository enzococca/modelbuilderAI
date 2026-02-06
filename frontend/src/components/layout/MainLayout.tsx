import { useSettingsStore } from '@/stores/settingsStore';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export function MainLayout({ children }: Props) {
  const sidebarOpen = useSettingsStore(s => s.sidebarOpen);

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      {sidebarOpen && <Sidebar />}
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <main className="flex-1 overflow-hidden flex flex-col">
          {children}
        </main>
      </div>
    </div>
  );
}
