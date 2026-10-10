import ChatBodyAndChatHead from "./components/chart";
import JoinOrCreate from "./components/joinorcreate";
import { connect } from "react-redux";
import AliasGate from "./components/alias/AliasGate";
import ShareReceiver from "./components/share/ShareReceiver";
import { Hero, MobileMore, TopBar } from "./components/landing/Landing";
import { getLastAlias } from "./utils/ownership";

// faax.me/<alias>          -> alias room (owner walks in, others knock)
// faax.me/<alias>?pair=X   -> add this device as an owner
// faax.me/                 -> opens your own room if this device owns one (?home=1 to stay home)
function resolveRoute() {
  const params = new URLSearchParams(window.location.search);
  let alias = decodeURIComponent(window.location.pathname.replace(/^\/+|\/+$/g, ""));
  if (!alias && !params.has("home") && !params.has("join") && !params.has("new")) {
    const mine = getLastAlias();
    if (mine) {
      alias = mine;
      window.history.replaceState(null, "", "/" + mine);
    }
  }
  if (alias === "share") {
    return { share: true, shareId: params.get("id"), shareError: params.has("error") };
  }
  return {
    alias: alias || null,
    pairCode: params.get("pair"),
    removed: params.has("removed"),
  };
}

const route = resolveRoute();

function Home({ joined }) {
  const inRoom = joined.status;
  const app = inRoom
    ? <ChatBodyAndChatHead />
    : route.share
      ? <ShareReceiver id={route.shareId} error={route.shareError} />
      : route.alias
        ? <AliasGate alias={route.alias} pairCode={route.pairCode} removed={route.removed} />
        : <JoinOrCreate />;
  const showPitch = !route.share; // the share sheet screen gets straight to the point

  return (
    <div className="min-h-full sm:max-w-[1180px] sm:mx-auto">
      <TopBar />
      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-10 sm:min-h-[calc(100vh-150px)]">
        {/* Left: what faax is (desktop) */}
        <section className="hidden sm:flex sm:w-1/2 sm:justify-start">
          {showPitch && <Hero />}
        </section>

        {/* Phone: short pitch above the cards (not while in a room) */}
        {showPitch && !inRoom && (
          <section className="sm:hidden">
            <Hero compact />
          </section>
        )}

        {/* Right: the app */}
        <section className="sm:w-1/2 flex justify-center">
          {app}
        </section>
      </div>

      {showPitch && !inRoom && (
        <section className="sm:hidden">
          <MobileMore />
        </section>
      )}
    </div>
  );
}

const mapStateToProps = (state) => ({ ...state });

export default connect(mapStateToProps)(Home);
