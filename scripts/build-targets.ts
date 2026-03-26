export const BUILD_TARGETS = ['background', 'offscreen', 'popup', 'heic-worker'] as const;

export type BuildTarget = (typeof BUILD_TARGETS)[number];
