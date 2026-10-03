import { createContext } from "react";

// notify({ text, action?, actionLabel?, ms? }) shows a toast; newIds highlights freshly organized tasks
export const PlannerContext = createContext({ notify: () => {}, newIds: new Set() });
