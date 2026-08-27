export type MethodWrapper = (method: any, propertyKey: PropertyKey, target?: object) => any;

export function wrapMethod(decoratorArgs: any[], createWrapper: MethodWrapper): any {
  if (decoratorArgs.length === 3) {
    const [target, propertyKey, descriptor] = decoratorArgs;
    const method = descriptor.value;
    if (!method) return descriptor;

    descriptor.value = createWrapper(method, propertyKey, target);
    return descriptor;
  }

  const [method, context] = decoratorArgs;
  return createWrapper(method, context.name);
}

export function registerMethodMetadata(
  decoratorArgs: any[],
  register: (target: object, propertyKey: PropertyKey) => void
): void {
  if (decoratorArgs.length === 3) {
    const [target, propertyKey] = decoratorArgs;
    register(target, propertyKey);
    return;
  }

  const [, context] = decoratorArgs;
  context.addInitializer(function registerMethodMetadataInitializer(this: any) {
    register(Object.getPrototypeOf(this), context.name);
  });
}
