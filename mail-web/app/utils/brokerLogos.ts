import manifest from "../../public/broker-logos/manifest.json";

interface BrokerIdentifier {
  brokerId?: string;
  id?: string;
  name: string;
  website?: string;
}

function normalizeKey(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Matches a data broker to its local SVG/PNG logo in public/broker-logos/.
 * Returns the public URL path (e.g. "/broker-logos/Spokeo.svg") or null if no match.
 */
export function getBrokerLogoUrl(broker: BrokerIdentifier): string | null {
  const manifestMap = manifest as Record<string, string>;

  // 1. Direct match on brokerId or id
  const id = broker.brokerId || broker.id;
  if (id && manifestMap[id]) {
    return manifestMap[id];
  }
  if (id && manifestMap[normalizeKey(id)]) {
    return manifestMap[normalizeKey(id)];
  }

  // 2. Normalized broker name match
  const nameNorm = normalizeKey(broker.name);
  if (manifestMap[nameNorm]) {
    return manifestMap[nameNorm];
  }

  // 3. Domain match
  if (broker.website) {
    const domain = broker.website
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("/")[0]
      .split(":")[0];

    const domainNorm = normalizeKey(domain);
    if (manifestMap[domainNorm]) {
      return manifestMap[domainNorm];
    }

    const hostPrefix = domain.split(".")[0];
    const hostNorm = normalizeKey(hostPrefix);
    if (manifestMap[hostNorm]) {
      return manifestMap[hostNorm];
    }
  }

  return null;
}
