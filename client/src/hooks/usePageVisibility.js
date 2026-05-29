import { useEffect, useState } from "react";

function readIsVisible() {
  if (typeof document === "undefined") return true;
  return !document.hidden;
}

export default function usePageVisibility() {
  const [isVisible, setIsVisible] = useState(readIsVisible);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  return isVisible;
}

