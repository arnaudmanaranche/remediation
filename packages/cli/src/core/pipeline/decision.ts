import { Cluster } from './clusterer';

export interface TokenProposal {
  cluster: Cluster;
  tokenName: string;
  frequency: number;
  filesCount: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface DecisionResult {
  proposals: TokenProposal[];
  summary: {
    totalValues: number;
    totalClusters: number;
    proposedTokens: number;
    skippedClusters: number;
  };
}

const FREQUENCY_THRESHOLD = 3;
const CLUSTER_SIZE_THRESHOLD = 2;

function calculateConfidence(cluster: Cluster): 'high' | 'medium' | 'low' {
  if (cluster.count >= 5 && cluster.files.length >= 3) return 'high';
  if (cluster.count >= 3 || cluster.files.length >= 2) return 'medium';
  return 'low';
}

function generateTokenName(baseName: string, index: number): string {
  const prefixes = ['colors', 'spacing', 'typography'];
  const prefix = baseName === 'unknown' ? 'token' : baseName;
  return index === 0 ? prefix : `${prefix}${index + 1}`;
}

export function decideTokens(
  clusters: Cluster[],
  suggestedNames: Map<number, string>
): DecisionResult {
  const proposals: TokenProposal[] = [];
  let skippedClusters = 0;

  for (const cluster of clusters) {
    const shouldPropose =
      cluster.count >= FREQUENCY_THRESHOLD ||
      cluster.values.length >= CLUSTER_SIZE_THRESHOLD;

    if (shouldPropose) {
      const suggestedName = suggestedNames.get(cluster.id) || 'unknown';
      proposals.push({
        cluster,
        tokenName: suggestedName,
        frequency: cluster.count,
        filesCount: cluster.files.length,
        confidence: calculateConfidence(cluster),
      });
    } else {
      skippedClusters++;
    }
  }

  proposals.sort((a, b) => {
    const confidenceOrder = { high: 0, medium: 1, low: 2 };
    return confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
  });

  return {
    proposals,
    summary: {
      totalValues: clusters.reduce((sum, c) => sum + c.count, 0),
      totalClusters: clusters.length,
      proposedTokens: proposals.length,
      skippedClusters,
    },
  };
}

