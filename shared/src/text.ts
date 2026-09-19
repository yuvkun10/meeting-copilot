/** Removes trailing "." and "。" characters, like `value.replace(/[.。]+$/, "")` in linear time. */
export function trimTrailingPeriods(value: string): string {
  let end = value.length;
  while (end > 0 && (value[end - 1] === "." || value[end - 1] === "。")) {
    end -= 1;
  }
  return value.slice(0, end);
}
