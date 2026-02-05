export function devLog(...args: any[]) {
  if (__DEV__) {
    console.log(...args);
  }
}

export function devWarn(...args: any[]) {
  if (__DEV__) {
    console.warn(...args);
  }
}
