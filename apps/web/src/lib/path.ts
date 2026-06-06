/** Normalise a path by removing trailing slashes. The `|| '/'` guard prevents the root `/` from becoming an empty string. */
export const normalise = (p: string): string => p.replace(/\/$/, '') || '/';
