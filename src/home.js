import ChatBodyAndChatHead from "./components/chart";
import JoinOrCreate from "./components/joinorcreate";
import { connect } from "react-redux";
import AliasGate from "./components/alias/AliasGate";
import ShareReceiver from "./components/share/ShareReceiver";
import { Hero, TopBar } from "./components/landing/Landing";
import { getLastAlias, getOwnership } from "./utils/ownership";
import StandaloneApp from "./components/apps/StandaloneApp";

// faax.me/<alias>          -> alias room (owner walks in, others knock)
// faax.me/<alias>?pair=X   -> add this device as an owner
// faax.me/<alias>/a/<appId> -> one generated app on its own (what an installed app opens)
// faax.me/                 -> opens your own room if this device owns one (?home=1 to stay home)
function resolveRoute() {
  const params = new URLSearchParams(window.location.search);
  let alias = decodeURIComponent(window.location.pathname.replace(/^\/+|\/+$/g, ""));
  const single = alias.match(/^([a-z0-9-]{3,20})\/a\/(app_[a-z0-9]{4,40})$/i);
  if (single) {
    return { alias: single[1].toLowerCase(), appId: single[2], autoInstall: params.has("install") };
  }
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

  // A single app: full-screen, no landing around it. Owners see it at once (the room joins
  // quietly in the background); guests go through the door first.
  if (route.appId) {
    const owner = !!getOwnership(route.alias);
    return (
      <>
        {(owner || inRoom) && <StandaloneApp alias={route.alias} appId={route.appId} autoInstall={route.autoInstall} />}
        {!inRoom && (
          <div className={owner ? "hidden" : "min-h-full flex items-center justify-center px-4"}>
            <AliasGate alias={route.alias} />
          </div>
        )}
      </>
    );
  }

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
        {/* Left: the room animation (desktop only; phones get straight to the cards) */}
        <section className="hidden sm:flex sm:w-1/2 sm:justify-start">
          {showPitch && <Hero />}
        </section>

        {/* Right: the app */}
        <section className="sm:w-1/2 flex justify-center">
          {app}
        </section>
      </div>
    </div>
  );
}

const mapStateToProps = (state) => ({ ...state });

export default connect(mapStateToProps)(Home);
