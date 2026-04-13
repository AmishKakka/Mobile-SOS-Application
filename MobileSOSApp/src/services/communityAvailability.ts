import {
  getOrCreateDemoSession,
  getStoredDemoSession,
  syncDemoSession,
  updateHelperAvailability,
} from './demoSession';
import { getHelperModeState, setHelperModeState } from './helperMode';
import {
  flushOfflineQueue,
  sendImmediateLocation,
  startPassiveTracking,
  stopPassiveTracking,
} from './locationTracker';
import { requestLocationPermissionsForTracking } from './permissions';

type CommunityAvailabilityResult = {
  isAvailable: boolean;
  session: { userId: string; name: string; role: 'victim' | 'helper' };
  statusText: string;
};

export async function getCommunityAvailabilitySnapshot(): Promise<CommunityAvailabilityResult> {
  const session =
    (await getStoredDemoSession('victim')) ||
    (await getOrCreateDemoSession('victim', 'SafeGuard User'));
  const helperMode = await getHelperModeState();

  return {
    session,
    isAvailable: helperMode.isAvailable,
    statusText: helperMode.isAvailable
      ? 'You can receive nearby SOS requests.'
      : 'You will not receive nearby SOS requests.',
  };
}

export async function restoreCommunityAvailability(): Promise<CommunityAvailabilityResult> {
  const session =
    (await getStoredDemoSession('victim')) ||
    (await getOrCreateDemoSession('victim', 'SafeGuard User'));
  const helperMode = await getHelperModeState();
  let syncWarning = '';

  try {
    await syncDemoSession(session, { isHelperAvailable: helperMode.isAvailable });
  } catch (error: any) {
    syncWarning = error?.message || 'Availability sync is temporarily unavailable.';
  }

  if (!helperMode.isAvailable) {
    try {
      await stopPassiveTracking();
      await updateHelperAvailability(session.userId, false);
    } catch (error: any) {
      return {
        session,
        isAvailable: false,
        statusText:
          error?.message || syncWarning || 'Community availability is off.',
      };
    }

    return {
      session,
      isAvailable: false,
      statusText: syncWarning || 'Community availability is off.',
    };
  }

  try {
    await sendImmediateLocation(session.userId);
    await startPassiveTracking(session.userId);
    await flushOfflineQueue(session.userId);
    await updateHelperAvailability(session.userId, true);

    return {
      session,
      isAvailable: true,
      statusText:
        syncWarning || 'Community availability is on and your last live location is synced.',
    };
  } catch (error: any) {
    return {
      session,
      isAvailable: true,
      statusText:
        error?.message ||
        'Community availability is on, but live location could not be refreshed yet.',
    };
  }
}

export async function setCommunityAvailability(
  nextValue: boolean,
): Promise<CommunityAvailabilityResult> {
  const session =
    (await getStoredDemoSession('victim')) ||
    (await getOrCreateDemoSession('victim', 'SafeGuard User'));

  if (!nextValue) {
    await stopPassiveTracking();
    await updateHelperAvailability(session.userId, false);
    await syncDemoSession(session, { isHelperAvailable: false });
    await setHelperModeState(false);

    return {
      session,
      isAvailable: false,
      statusText: 'Sorry! I am not available to help.',
    };
  }

  const granted = await requestLocationPermissionsForTracking();
  if (!granted) {
    await updateHelperAvailability(session.userId, false);
    await syncDemoSession(session, { isHelperAvailable: false });
    await setHelperModeState(false);

    return {
      session,
      isAvailable: false,
      statusText: 'Location permission is required before availability can stay on.',
    };
  }

  await sendImmediateLocation(session.userId);
  await startPassiveTracking(session.userId);
  await flushOfflineQueue(session.userId);
  await updateHelperAvailability(session.userId, true);
  await syncDemoSession(session, { isHelperAvailable: true });
  await setHelperModeState(true);

  return {
    session,
    isAvailable: true,
    statusText: 'Community availability is on.',
  };
}
