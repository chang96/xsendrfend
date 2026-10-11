import "../tasks/tasks.css";
import "./apps.css";
import { useContext, useEffect, useState } from "react";
import { WebSocketContext } from "../../utils/websocket";
import { getApp, initApps, getAlias } from "../../utils/appsStore";
import { getOwnership } from "../../utils/ownership";
import { useApps } from "./hooks";
import AppRunner from "./AppRunner";
import { AppsToastHost, AppIcon, Spinner } from "./ui";

// faax.me/<alias>/a/<appId>: one app, full-screen, nothing else. This is what an installed app opens.
// Owners see their app straight away from this device's storage (even offline); the room
// connects in the background. Guests get here after being let in, for apps shared to keep.
export default function StandaloneApp({ alias, appId, autoInstall }) {
    const { aliasSession } = useContext(WebSocketContext);
    const owner = !!getOwnership(alias);
    useApps(); // re-render as apps load / sync
    const [waited, setWaited] = useState(false);

    useEffect(() => {
        // owner device: open local storage now instead of waiting for the room (works offline)
        if (owner && getAlias() !== alias) initApps(alias, "owner", {});
        const t = setTimeout(() => setWaited(true), 9000);
        return () => clearTimeout(t);
    }, [owner, alias]);

    const app = getApp(appId);
    const isOwner = owner || (aliasSession && aliasSession.role === "owner");

    if (!app) {
        return (
            <div className="planner fixed inset-0 bg-[#0c0c0e] flex flex-col items-center justify-center text-center px-8">
                {waited ? (
                    <>
                        <AppIcon app={null} size={56} />
                        <p className="text-white text-[14px] font-semibold mt-4">This app isn't on this device</p>
                        <p className="text-gray-500 text-[12px] mt-1 max-w-[18rem]">
                            {isOwner ? "It may have been deleted, or it hasn't synced from your other device yet." : "The owner may have stopped sharing it."}
                        </p>
                        <a href={"/" + alias} className="mt-5 text-[12.5px] font-semibold text-[#8e9bff] hover:text-white">Open the faax room</a>
                    </>
                ) : (
                    <>
                        <Spinner className="w-5 h-5 text-[#8e9bff]" />
                        <p className="text-gray-500 text-[12px] mt-3">Opening…</p>
                    </>
                )}
            </div>
        );
    }

    return (
        <>
            <AppRunner app={app} isOwner={isOwner} standalone autoInstall={autoInstall} onClose={() => window.location.assign("/" + alias)} />
            <AppsToastHost />
        </>
    );
}
