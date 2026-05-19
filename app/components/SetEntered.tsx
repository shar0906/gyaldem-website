"use client";

import { useEffect } from "react";

export default function SetEntered() {
  useEffect(() => {
    sessionStorage.setItem("entered", "true");
    document.cookie = "gd_entered=true; path=/; max-age=86400";
  }, []);
  return null;
}