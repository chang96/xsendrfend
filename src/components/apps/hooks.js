import { useEffect, useState } from "react";
import { getRole, listApps, listGuestApps, getUnseen, subscribeApps } from "../../utils/appsStore";
import { getJobs, onJobs } from "./jobs";

export function useApps() {
    const read = () => ({ role: getRole(), apps: listApps(), guestApps: listGuestApps(), unseen: getUnseen() });
    const [s, setS] = useState(read);
    useEffect(() => { setS(read()); return subscribeApps(() => setS(read())); }, []);
    return s;
}

export function useJobs() {
    const [j, setJ] = useState(getJobs);
    useEffect(() => onJobs(setJ), []);
    return j;
}
