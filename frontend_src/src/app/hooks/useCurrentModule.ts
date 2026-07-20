import { useLocation } from 'react-router';
import { getModuleFromPath, ModuleType } from '../config/tantieSagesseConfig';

export function useCurrentModule(): ModuleType {
  const location = useLocation();
  return getModuleFromPath(location.pathname);
}
