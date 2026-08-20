import React from 'react';
import { Home, ShoppingCart, Package, Wallet, Menu } from 'lucide-react';
import { MenuTab } from './Sidebar';
import { cn } from '../lib/utils';
import { CashRegister } from '../types';

interface MobileBottomNavProps {
  activeTab: MenuTab;
  onTabChange: (tab: MenuTab) => void;
  onOpenDrawer: () => void;
  activeRegister: CashRegister | null;
}

export default function MobileBottomNav({
  activeTab,
  onTabChange,
  onOpenDrawer,
  activeRegister
}: MobileBottomNavProps) {
  const isPosActive = activeTab === 'vendas_pos';
  const isDashboardActive = activeTab === 'inicio_dashboard';
  const isStockActive = activeTab.startsWith('estoque_') || activeTab.startsWith('cadastros_');
  const isFinanceActive = activeTab.startsWith('financeiro_');

  const isOtherActive = !isPosActive && !isDashboardActive && !isStockActive && !isFinanceActive;

  return (
    <nav 
      aria-label="Navegação Principal Mobile"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 pt-1 pb-safe flex items-center justify-around text-slate-400 select-none shadow-2xl"
    >
      {/* 1. Início */}
      <button
        type="button"
        onClick={() => onTabChange('inicio_dashboard')}
        className={cn(
          "flex flex-col items-center justify-center min-w-[56px] min-h-[48px] px-2 py-1 rounded-xl transition-all",
          isDashboardActive 
            ? "text-emerald-400 font-black" 
            : "text-slate-400 hover:text-slate-200 active:scale-95"
        )}
      >
        <Home className={cn("w-5 h-5 mb-0.5", isDashboardActive && "stroke-[2.5]")} />
        <span className="text-[10px] tracking-tight">Início</span>
      </button>

      {/* 2. PDV (Destaque Central) */}
      <button
        type="button"
        onClick={() => onTabChange('vendas_pos')}
        className={cn(
          "flex flex-col items-center justify-center min-w-[64px] min-h-[48px] px-2 py-1 rounded-xl transition-all relative",
          isPosActive 
            ? "text-emerald-400 font-black" 
            : "text-slate-300 hover:text-white active:scale-95"
        )}
      >
        <div className={cn(
          "w-8 h-8 rounded-xl flex items-center justify-center -mt-1.5 shadow-md transition-all",
          isPosActive ? "bg-emerald-500 text-slate-950 scale-105" : "bg-slate-800 text-emerald-400"
        )}>
          <ShoppingCart className="w-4 h-4" />
        </div>
        <span className="text-[10px] tracking-tight mt-0.5 font-bold">PDV</span>
      </button>

      {/* 3. Estoque */}
      <button
        type="button"
        onClick={() => onTabChange('estoque_inventario')}
        className={cn(
          "flex flex-col items-center justify-center min-w-[56px] min-h-[48px] px-2 py-1 rounded-xl transition-all",
          isStockActive 
            ? "text-emerald-400 font-black" 
            : "text-slate-400 hover:text-slate-200 active:scale-95"
        )}
      >
        <Package className={cn("w-5 h-5 mb-0.5", isStockActive && "stroke-[2.5]")} />
        <span className="text-[10px] tracking-tight">Estoque</span>
      </button>

      {/* 4. Caixa / Financeiro */}
      <button
        type="button"
        onClick={() => onTabChange('financeiro_caixa')}
        className={cn(
          "flex flex-col items-center justify-center min-w-[56px] min-h-[48px] px-2 py-1 rounded-xl transition-all relative",
          isFinanceActive 
            ? "text-emerald-400 font-black" 
            : "text-slate-400 hover:text-slate-200 active:scale-95"
        )}
      >
        <div className="relative">
          <Wallet className={cn("w-5 h-5 mb-0.5", isFinanceActive && "stroke-[2.5]")} />
          {activeRegister && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </div>
        <span className="text-[10px] tracking-tight">Caixa</span>
      </button>

      {/* 5. Menu Completo (Drawer) */}
      <button
        type="button"
        onClick={onOpenDrawer}
        className={cn(
          "flex flex-col items-center justify-center min-w-[56px] min-h-[48px] px-2 py-1 rounded-xl transition-all",
          isOtherActive 
            ? "text-emerald-400 font-black" 
            : "text-slate-400 hover:text-slate-200 active:scale-95"
        )}
      >
        <Menu className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] tracking-tight">Menu</span>
      </button>
    </nav>
  );
}
