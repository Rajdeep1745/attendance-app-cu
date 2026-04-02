import { createContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const backendUrl = "http://localhost:5000/";
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(`${backendUrl}api/auth/me`, {
          headers: {
            "auth-token": localStorage.getItem("token"),
          },
        });

        const data = await res.json();
        setUser(data);
      } catch (err) {
        console.error(err);
      }
      };
      
    fetchUser();
    }, []);

return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;