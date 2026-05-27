import { useEffect, useState } from "react";
import { ConversationPage } from "./ConversationPage";
import { TranslatorPage } from "./features/translator/TranslatorPage";

type AppRoute = "translator" | "conversation";

function readRoute(): AppRoute {
  const hashRoute = window.location.hash.replace(/^#\/?/, "").replace(/\/+$/, "");
  const pathRoute = window.location.pathname.replace(/\/+$/, "");

  return hashRoute === "conversation" || pathRoute.endsWith("/conversation")
    ? "conversation"
    : "translator";
}

function buildRoutePath(route: AppRoute) {
  const base = import.meta.env.BASE_URL || "/";

  if (route === "translator") {
    return base;
  }

  return `${base}#/conversation`;
}

export function App() {
  const [route, setRoute] = useState<AppRoute>(() => readRoute());

  useEffect(() => {
    const handlePopState = () => setRoute(readRoute());

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("hashchange", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("hashchange", handlePopState);
    };
  }, []);

  function navigate(routeName: AppRoute) {
    window.history.pushState({ route: routeName }, "", buildRoutePath(routeName));
    setRoute(routeName);
    window.scrollTo({ top: 0 });
  }

  if (route === "conversation") {
    return <ConversationPage onBack={() => navigate("translator")} />;
  }

  return <TranslatorPage onOpenConversation={() => navigate("conversation")} />;
}
