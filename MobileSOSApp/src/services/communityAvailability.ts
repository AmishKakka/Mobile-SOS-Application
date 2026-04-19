import { AppUser, getCurrentAppUser, updateCurrentUserStatus } from './appUser';
import { getHelperModeState, setHelperModeState } from './helperMode';
import {
  flushOfflineQueue,
  sendImmediateLocation,
  startPassiveTracking,
  stopPassiveTracking,
} from './locationTracker';
import { registerDeviceForPush } from './fcmSetup';
import { requestLocationPermissionsForTracking } from './permissions';

type CommunityAvailabilityResult = {
  isAvailable: boolean;
  session: AppUser;
  statusText: string;
};

export async function getCommunityAvailabilitySnapshot(): Promise<CommunityAvailabilityResult> {
  const session = await getCurrentAppUser();
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
  const session = await getCurrentAppUser();
  const helperMode = await getHelperModeState();

  if (!helperMode.isAvailable) {
    try {
      await stopPassiveTracking();
      await updateCurrentUserStatus({
        isHelperAvailable: false,
        role: 'victim',
      });
    } catch (error: any) {
      return {
        session,
        isAvailable: false,
        statusText:
          error?.message || 'Community availability is off.',
      };
    }

    return {
      session,
      isAvailable: false,
      statusText: 'Community availability is off.',
    };
  }

  try {
    await registerDeviceForPush(session);
    await sendImmediateLocation(session.userId);
    await startPassiveTracking(session.userId);
    await flushOfflineQueue(session.userId);
    await updateCurrentUserStatus({
      isHelperAvailable: true,
      role: 'helper',
    });

    return {
      session,
      isAvailable: true,
      statusText: 'Community availability is on and your last live location is synced.',
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
  const session = await getCurrentAppUser();

  if (!nextValue) {
    await stopPassiveTracking();
    await updateCurrentUserStatus({
      isHelperAvailable: false,
      role: 'victim',
    });
    await setHelperModeState(false);

    return {
      session,
      isAvailable: false,
      statusText: 'Sorry! I am not available to help.',
    };
  }

  const granted = await requestLocationPermissionsForTracking();
  if (!granted) {
    await updateCurrentUserStatus({
      isHelperAvailable: false,
      role: 'victim',
    });
    await setHelperModeState(false);

    return {
      session,
      isAvailable: false,
      statusText: 'Location permission is required before availability can stay on.',
    };
  }

  await registerDeviceForPush(session);
  await sendImmediateLocation(session.userId);
  await startPassiveTracking(session.userId);
  await flushOfflineQueue(session.userId);
  await updateCurrentUserStatus({
    isHelperAvailable: true,
    role: 'helper',
  });
  await setHelperModeState(true);

  return {
    session,
    isAvailable: true,
    statusText: 'Community availability is on.',
  };
}
