export function toPgVector(arr: number[]): string {
  return `[${arr.join(",")}]`;
}

