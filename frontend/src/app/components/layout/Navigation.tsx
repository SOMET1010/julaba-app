import { BottomBar } from './BottomBar';
import { Sidebar } from './Sidebar';

interface NavigationProps {
  role: 'marchand' | 'producteur' | 'cooperative' | 'institution' | 'identificateur';
  onMicClick?: () => void;
}

export function Navigation({ role, onMicClick }: NavigationProps) {
  return (
    <>
      <Sidebar role={role} onMicClick={onMicClick} />
      <div className="lg:hidden">
        <BottomBar role={role} onMicClick={onMicClick} />
      </div>
    </>
  );
}
