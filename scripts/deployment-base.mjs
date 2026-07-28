export function resolveDeploymentBase(value = process.env.DEPLOY_BASE_PATH) {
  const base = value?.trim() || '/';
  const segments = base.split('/');
  const invalid =
    !base.startsWith('/') ||
    !base.endsWith('/') ||
    base.includes('\\') ||
    base.includes('//') ||
    base.includes('?') ||
    base.includes('#') ||
    segments.includes('.') ||
    segments.includes('..');

  if (invalid) {
    throw new Error(
      `DEPLOY_BASE_PATH must start and end with "/" and contain no traversal, query, or fragment: ${base}`,
    );
  }

  return base;
}
