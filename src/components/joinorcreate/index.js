import { useContext, useEffect, useState } from "react"
import CreateSpace from "../createspace"
import Or from "../../elements/or"
import JoinSpace from "../joinspace"
import ClaimAlias from "../alias/ClaimAlias"
import { WebSocketContext } from "../../utils/websocket"
import { InstallLink } from "../share/InstallSheet"

function JoinOrCreate(){
    const [claiming, setClaiming] = useState(false)
    const { joinRoom, createRoom } = useContext(WebSocketContext)

    // Scanned a throwaway room's QR code: faax.me/?join=ABCD
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const code = params.get("join")
        if (code) {
            window.history.replaceState(null, "", "/")
            joinRoom(code)
        } else if (params.has("new")) {
            // from the share sheet: "New room"
            window.history.replaceState(null, "", "/")
            createRoom()
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    if (claiming) {
        return (
            <div className="flex flex-col items-center justify-center py-6 w-full max-w-sm mx-auto">
                <ClaimAlias onCancel={() => setClaiming(false)} />
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center justify-center py-6 w-full max-w-sm mx-auto">
            <CreateSpace />
            <Or />
            <JoinSpace />
            <button
                onClick={() => setClaiming(true)}
                className="mt-4 text-[11px] text-gray-500 hover:text-white transition-colors"
            >
                Claim your own link →
            </button>
            <InstallLink className="mt-3" />
        </div>
    )
}

export default JoinOrCreate
