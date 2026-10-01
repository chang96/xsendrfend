import { useContext } from "react";
import { WebSocketContext } from "../../utils/websocket";

// Owner side: "<device> wants to join" with Let in / Deny. Shows on every online owner device;
// the first one to answer wins and the prompt disappears everywhere.
export default function KnockPrompt() {
    const { knocks, decideKnock, aliasSession } = useContext(WebSocketContext);
    if (!aliasSession || aliasSession.role !== "owner" || knocks.length === 0) return null;
    const k = knocks[0];

    return (
        <div className="absolute top-[46px] left-1/2 -translate-x-1/2 transform z-[45] w-[calc(100%-2rem)] max-w-xs bg-[#1E1E1F]/95 border border-[#001AFF]/50 rounded-xl shadow-2xl px-3 py-2.5 backdrop-blur-md flex items-center justify-between space-x-2">
            <div className="min-w-0 text-left">
                <p className="text-white text-[11px] font-semibold truncate">{k.name}</p>
                <p className="text-gray-400 text-[10px]">
                    wants to join{knocks.length > 1 ? ` · +${knocks.length - 1} more` : ""}
                </p>
            </div>
            <div className="flex items-center space-x-1.5 flex-shrink-0">
                <button
                    onClick={() => decideKnock(k.requestId, false)}
                    className="text-[10px] font-semibold text-gray-400 hover:text-white px-2 py-1 rounded-lg"
                >
                    Deny
                </button>
                <button
                    onClick={() => decideKnock(k.requestId, true)}
                    className="text-[10px] font-bold text-white bg-[#001AFF] hover:bg-blue-700 px-2.5 py-1 rounded-lg active:scale-95 transition-all"
                >
                    Let in
                </button>
            </div>
        </div>
    );
}
