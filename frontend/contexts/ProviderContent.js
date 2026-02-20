// app/Providers.js (or wherever this file lives)

"use client";

import PropTypes from "prop-types";
import { AuthProvider } from "@/contexts/AuthContext";

export default function Providers({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}

Providers.propTypes = {
  children: PropTypes.node.isRequired,
};
