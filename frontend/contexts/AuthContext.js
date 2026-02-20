import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";
import PropTypes from "prop-types";
import axios from "axios";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [groups, setGroups] = useState([]);
  const [permissions, setPerms] = useState([]);
  const [csrfToken, setToken] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAuthData = async () => {
      setLoading(true);
      try {
        const response = await axios.get("/auth/status");
        if (response.data.user) {
          setUser(response.data.user);
          setGroups(response.data.groups);
          setPerms(response.data.permissions);
          setToken(response.data.csrfToken);
        } else {
          setUser(null);
          setGroups([]);
          setPerms([]);
          setToken(response.data.csrfToken);
        }
      } catch {
        setUser(null);
        setGroups([]);
        setPerms([]);
        setToken("");
      }
      setLoading(false);
    };
    fetchAuthData();
  }, []);

  const value = useMemo(
    () => ({ user, groups, permissions, loading, csrfToken }),
    [user, groups, permissions, loading, csrfToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
