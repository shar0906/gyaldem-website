"use client";

import { useEffect } from "react";

export default function SetEntered() {
  useEffect(() => {
    sessionStorage.setItem("entered", "true");
  }, []);
  return null;
}