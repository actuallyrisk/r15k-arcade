/** Whether the fatal-error box may show technical details (set once by createApp). */
let isDetailEnabled = false;

/** Lets the fatal-error box append the error message (development builds only). */
export function setFatalDetails(isDevBuild: boolean): void {
  isDetailEnabled = isDevBuild;
}

/** Whether the fatal-error box appends the error message. */
export function hasFatalDetails(): boolean {
  return isDetailEnabled;
}
