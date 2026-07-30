export interface BuildInfo {
  version: string;
  revision: string;
  dirty: boolean;
}

export const BUILD_INFO: Readonly<BuildInfo> = Object.freeze({
  version:
    typeof __EDUPLANNER_VERSION__ === "string"
      ? __EDUPLANNER_VERSION__
      : "development",
  revision:
    typeof __EDUPLANNER_REVISION__ === "string"
      ? __EDUPLANNER_REVISION__
      : "unknown",
  dirty:
    typeof __EDUPLANNER_DIRTY__ === "boolean"
      ? __EDUPLANNER_DIRTY__
      : true,
});

export function formatBuildRevision(buildInfo: BuildInfo = BUILD_INFO): string {
  if (buildInfo.revision === "unknown") return "unknown";
  const shortRevision = buildInfo.revision.slice(0, 12);
  return buildInfo.dirty ? `${shortRevision}-dirty` : shortRevision;
}
