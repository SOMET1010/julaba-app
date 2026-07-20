import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Package, TrendingUp } from 'lucide-react';
import { Stocks } from './Stocks';
import { Revenus } from './Revenus';
import { SubPageLayout } from '../layout/SubPageLayout';

type TabType = 'stocks' | 'revenus';

export function StocksWrapper() {
  const [activeTab, setActiveTab] = useState<TabType>('stocks');
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  // Auto-scroll to center active tab
  useEffect(() => {
    const activeTabElement = tabRefs.current[activeTab];
    const container = tabsContainerRef.current;

    if (activeTabElement && container) {
      const tabLeft = activeTabElement.offsetLeft;
      const tabWidth = activeTabElement.offsetWidth;
      const containerWidth = container.offsetWidth;
      const scrollPosition = tabLeft - (containerWidth / 2) + (tabWidth / 2);

      container.scrollTo({
        left: scrollPosition,
        behavior: 'smooth',
      });
    }
  }, [activeTab]);

  return (
    <SubPageLayout role="producteur" title="Mes stocks">
      <div className="min-h-screen pb-28 lg:pb-8">
        {/* Tabs - Fixed sticky header */}
        <div className="sticky top-0 z-20 bg-gradient-to-b from-green-50 to-white pb-4">
          <div 
            ref={tabsContainerRef}
            className="flex gap-3 overflow-x-auto hide-scrollbar px-1 scroll-smooth"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {[
              { id: 'stocks', label: 'Stocks', icon: Package },
              { id: 'revenus', label: 'Revenus', icon: TrendingUp },
            ].map((tab) => {
              const Icon = tab.icon || Package;
              const isActive = activeTab === tab.id;
              
              return (
                <motion.button
                  key={tab.id}
                  ref={(el) => { tabRefs.current[tab.id] = el; }}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`
                    relative flex items-center gap-2 px-6 py-3 rounded-2xl 
                    font-bold text-sm whitespace-nowrap transition-all
                    ${isActive
                      ? 'text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200'
                    }
                  `}
                  style={{
                    backgroundColor: isActive ? '#00563B' : undefined,
                  }}
                  whileHover={{ scale: isActive ? 1 : 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  animate={isActive ? {
                    y: [0, -2, 0],
                  } : {}}
                  transition={isActive ? {
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  } : {}}
                >
                  {/* Glow effect for active tab */}
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-2xl"
                      style={{ backgroundColor: '#00563B' }}
                      animate={{
                        boxShadow: [
                          '0 0 20px rgba(0, 86, 59, 0.3)',
                          '0 0 30px rgba(0, 86, 59, 0.5)',
                          '0 0 20px rgba(0, 86, 59, 0.3)',
                        ],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  )}

                  <Icon 
                    className={`w-5 h-5 relative z-10 ${isActive ? 'animate-pulse' : ''}`}
                    strokeWidth={2.5}
                  />
                  <span className="relative z-10">{tab.label}</span>

                  {/* Active indicator */}
                  {isActive && (
                    <motion.div
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-white rounded-full"
                      layoutId="activeTab"
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30
                      }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 lg:px-6">
          {activeTab === 'stocks' && <Stocks />}
          {activeTab === 'revenus' && <Revenus />}
        </div>
      </div>
      
    </SubPageLayout>
  );
}