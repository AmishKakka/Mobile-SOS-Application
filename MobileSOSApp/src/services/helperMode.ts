import AsyncStorage from '@react-native-async-storage/async-storage';

const HELPER_MODE_KEY = '@safeguard_helper_mode';

export type HelperModeState = {
  isAvailable: boolean;
  updatedAt: number | null;
};

const DEFAULT_STATE: HelperModeState = {
  isAvailable: true,
  updatedAt: null,
};

export async function getHelperModeState(): Promise<HelperModeState> {
  try {
    const raw = await AsyncStorage.getItem(HELPER_MODE_KEY);
    if (!raw) {
      return DEFAULT_STATE;
    }

    const parsed = JSON.parse(raw) as Partial<HelperModeState>;
    return {
      isAvailable: Boolean(parsed.isAvailable),
      updatedAt:
        typeof parsed.updatedAt === 'number' && Number.isFinite(parsed.updatedAt)
          ? parsed.updatedAt
          : null,
    };
  } catch (error) {
    console.warn('[HELPER MODE] Failed to read persisted helper mode:', error);
    return DEFAULT_STATE;
  }
}

export async function setHelperModeState(isAvailable: boolean) {
  const nextState: HelperModeState = {
    isAvailable,
    updatedAt: Date.now(),
  };

  await AsyncStorage.setItem(HELPER_MODE_KEY, JSON.stringify(nextState));
  return nextState;
}
