const moduleStatus: Record<string, boolean> = {};

export const moduleExists = async (moduleName: string) => {
  if (moduleStatus[moduleName] === undefined) {
    moduleStatus[moduleName] = await checkIfModuleExists(moduleName);
  }
  return moduleStatus[moduleName];
};

const checkIfModuleExists = async (moduleName: string) => {
  try {
    await import(moduleName);
    return true;
  } catch (e) {
    return false;
  }
};
