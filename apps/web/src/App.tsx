// SPDX-License-Identifier: MIT
import { Route, Routes } from "react-router";
import { Layout } from "./components/Layout";
import { SwapPage } from "./pages/SwapPage";
import { PoolsPage } from "./pages/PoolsPage";
import { PoolDetailPage } from "./pages/PoolDetailPage";

// Task 8 adds the Layout shell (nav/wallet/theme); Tasks 9-11 replace the
// placeholder page components rendered inside it.
export function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<SwapPage />} />
        <Route path="/pools" element={<PoolsPage />} />
        {/* Both routes render PoolDetailPage; it tells them apart by
            whether `:pairAddress` matched (undefined on "/pools/new") and
            renders new-pool-picker mode vs. fetch-by-address mode
            accordingly — see PoolDetailPage's module doc comment. */}
        <Route path="/pools/new" element={<PoolDetailPage />} />
        <Route path="/pools/:pairAddress" element={<PoolDetailPage />} />
      </Routes>
    </Layout>
  );
}
