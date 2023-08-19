export default function alicloud<T>(constructor: T): T {
  return (constructor as any)!.default! as T;
}
