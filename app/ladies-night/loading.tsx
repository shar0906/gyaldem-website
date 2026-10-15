// ladies-night/loading.tsx
//
// While the Ladies Night hub loads: the spinning record.

import { LnLoader } from "./Loaders";

export default function Loading() {
  return (
    <div style={{ minHeight: "100dvh", background: "#160C0E" }}>
      <LnLoader kind="record" title="Ladies Night" />
    </div>
  );
}
