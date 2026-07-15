// SPDX-License-Identifier: MIT
import { useParams } from "react-router";

// Placeholder — replaced by the real pool detail UI in a later task.
export function PoolDetailPage() {
  const { pairAddress } = useParams<{ pairAddress: string }>();
  return (
    <div>
      <h1>pool</h1>
      <p>{pairAddress}</p>
    </div>
  );
}
