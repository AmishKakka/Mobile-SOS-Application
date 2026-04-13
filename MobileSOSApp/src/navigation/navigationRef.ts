import { createNavigationContainerRef, ParamListBase } from '@react-navigation/native';

type PendingNavigation = {
  name: string;
  params?: Record<string, unknown>;
} | null;

export const navigationRef = createNavigationContainerRef<ParamListBase>();

let pendingNavigation: PendingNavigation = null;

export function navigateFromAnywhere(name: string, params?: Record<string, unknown>) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name as never, params as never);
    return;
  }

  pendingNavigation = { name, params };
}

export function flushPendingNavigation() {
  if (!pendingNavigation || !navigationRef.isReady()) {
    return;
  }

  navigationRef.navigate(
    pendingNavigation.name as never,
    pendingNavigation.params as never,
  );
  pendingNavigation = null;
}

export function getCurrentRouteName() {
  return navigationRef.getCurrentRoute()?.name ?? null;
}
