// ladies-night/[series]/loading.tsx
//
// A series page and its live page show their own loader (the series'
// record or rose, or the bingo balls) once they start, so this only
// holds a plain dark screen for the moment before.

export default function Loading() {
  return <div style={{ minHeight: "100dvh", background: "#160C0E" }} />;
}
