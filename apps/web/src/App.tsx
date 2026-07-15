// SPDX-License-Identifier: MIT
import { Route, Routes } from "react-router";
import { SwapPage } from "./pages/SwapPage";
import { PoolsPage } from "./pages/PoolsPage";
import { PoolDetailPage } from "./pages/PoolDetailPage";

// Routing skeleton — Task 8-11 layer the real Layout/Swap/Pools pages on top.
export function App() {
  return (
    <Routes>
      <Route path="/" element={<SwapPage />} />
      <Route path="/pools" element={<PoolsPage />} />
      <Route path="/pools/:pairAddress" element={<PoolDetailPage />} />
    </Routes>
  );
}
