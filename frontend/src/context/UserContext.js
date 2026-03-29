// src/context/UserContext.js
import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";
const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null); // { user_id, nickname, instagram_url, is_public }
  const [loading, setLoading] = useState(true);

  // 앱 시작 시 로컬스토리지에서 유저 복원
  useEffect(() => {
    const saved = localStorage.getItem("matzip_user");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (e) {
        localStorage.removeItem("matzip_user");
      }
    }
    setLoading(false);
  }, []);

  const login = async (nickname, pin) => {
    const res = await axios.post(`${API_BASE}/users/login`, { nickname, pin });
    const userData = res.data;
    setUser(userData);
    localStorage.setItem("matzip_user", JSON.stringify(userData));
    return userData;
  };

  const register = async (nickname, pin) => {
    const res = await axios.post(`${API_BASE}/users/register`, { nickname, pin });
    const userData = res.data;
    setUser(userData);
    localStorage.setItem("matzip_user", JSON.stringify(userData));
    return userData;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("matzip_user");
  };

  const updateUser = (updates) => {
    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem("matzip_user", JSON.stringify(updated));
  };

  return (
    <UserContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}

export { API_BASE };
