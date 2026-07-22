export function isDryRun() {
  return (
    process.argv.includes('--dry-run') ||
    process.argv.includes('--dryRun') ||
    process.env.npm_config_dry_run === 'true'
  );
}
