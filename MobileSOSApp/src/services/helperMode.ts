import AsyncStorage from '@react-native-async-storage/async-storage';

const HELPER_MODE_KEY = '@safeguard_helper_mode';
const HELPER_MODE_SCHEMA_KEY = '@safeguard_helper_mode_schema';
const HELPER_MODE_SCHEMA_VERSION = 1;

export type HelperModeState = {
  isAvailable: boolean;
  updatedAt: number | null;
};

const DEFAULT_STATE: HelperModeState = {
  isAvailable: false,
  updatedAt: null,
};

export async function getHelperModeState(): Promise<HelperModeState> {
  try {
    const schemaVersion = await AsyncStorage.getItem(HELPER_MODE_SCHEMA_KEY);
    if (schemaVersion !== String(HELPER_MODE_SCHEMA_VERSION)) {
      await AsyncStorage.setItem(HELPER_MODE_KEY, JSON.stringify(DEFAULT_STATE));
      await AsyncStorage.setItem(
        HELPER_MODE_SCHEMA_KEY,
        String(HELPER_MODE_SCHEMA_VERSION),
      );
      return DEFAULT_STATE;
    }

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

  await AsyncStorage.multiSet([
    [HELPER_MODE_KEY, JSON.stringify(nextState)],
    [HELPER_MODE_SCHEMA_KEY, String(HELPER_MODE_SCHEMA_VERSION)],
  ]);
  return nextState;
}
