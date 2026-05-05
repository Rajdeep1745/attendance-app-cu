import { useEffect, useState } from "react";

const useDelayedLoading = (isLoading, delay = 140) => {
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setShowLoading(false);
      return undefined;
    }

    const timer = setTimeout(() => {
      setShowLoading(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, isLoading]);

  return showLoading;
};

export default useDelayedLoading;
