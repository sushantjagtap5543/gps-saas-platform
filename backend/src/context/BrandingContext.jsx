import { createContext, useState, useEffect } from "react";
import api from "../api/axios";

export const BrandingContext = createContext();

export function BrandingProvider({ children }) {

  const [branding, setBranding] = useState(null);

  useEffect(() => {
    api.get("/branding").then(res => {
      setBranding(res.data);

      if (res.data?.primary_color) {
        document.documentElement.style.setProperty(
          "--primary-color",
          res.data.primary_color
        );
      }
    });
  }, []);

  return (
    <BrandingContext.Provider value={{ branding }}>
      {children}
    </BrandingContext.Provider>
  );
}