import { useEffect, useState } from "react";
import { ConversationPage } from "./ConversationPage";
import { TranslatorPage } from "./features/translator/TranslatorPage";

type AppRoute = "translator" | "conversation";

function readRoute(): AppRoute {
  return window.location.pathname.replace(/\/+$/, "").endsWith("/conversation")
    ? "conversation"
    : "translator";
}

function buildRoutePath(route: AppRoute) {
  const base = import.meta.env.BASE_URL || "/";

  if (route === "translator") {
    return base;
  }

  return `${base}${base.endsWith("/") ? "" : "/"}conversation`;
}

export function App() {
  const [route, setRoute] = useState<AppRoute>(() => readRoute());

  useEffect(() => {
    const handlePopState = () => setRoute(readRoute());

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
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
