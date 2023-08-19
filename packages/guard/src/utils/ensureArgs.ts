export default function ensureArgs(args: Record<string, string | undefined>, requiredKeys: string[]): void {
  for (const key of requiredKeys) {
    if (!args[key]) {
      throw new Error(`Missing required argument: --${key}`);
    }
  }
}
