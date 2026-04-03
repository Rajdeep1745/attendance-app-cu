import { createContext, useEffect, useState } from "react";

const AuthContext = createContext();

const readStoredUser = () => {
  try {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  } catch (error) {
    console.error("Failed to read stored user", error);
    localStorage.removeItem("user");
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUserState] = useState(() => readStoredUser());

  useEffect(() => {
    const syncUser = () => setUserState(readStoredUser());

    window.addEventListener("storage", syncUser);
    return () => window.removeEventListener("storage", syncUser);
  }, []);

  const setUser = (nextUser) => {
    setUserState(nextUser);

    if (nextUser) {
      localStorage.setItem("user", JSON.stringify(nextUser));
    } else {
      localStorage.removeItem("user");
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
