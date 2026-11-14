import packageJson from '../../package.json' with { type: 'json' };

/** The app version from its package manifest (shown in the settings footer). */
export const APP_VERSION: string = packageJson.version;
