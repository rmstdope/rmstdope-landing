import { stats } from "../data/stats";

// The build-time snapshot, served as /stats.json until the container's
// refresher replaces it with fresh numbers from GitHub.
export function GET() {
  return new Response(JSON.stringify(stats));
}
