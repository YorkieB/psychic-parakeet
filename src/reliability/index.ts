// Jarvis AI-Powered Reliability Assessment System
// Main exports for component-based architecture with 99% Accuracy Research Integration

// Phase 2 - AI Assessment Engine (Completed)
export * from "./components/ai-engine/index.js";
// Phase 4 - Chain of Thought Engine (Advanced Critical Thinking)
// Includes Multi-Agent Debate (MAD) Framework and Enhanced Fallacy Detection
export * from "./components/cot-engine/index.js";
// Phase 5 - Ground Truth Verification Protocol (GTVP)
// Multi-authority verification with conflict resolution for dataset validation
export * from "./components/gtvp/index.js";
// Phase 3 - Reliability Algorithm (Completed)
export * from "./components/reliability-algorithm/index.js";
// Phase 1 - Rules Engine (Completed)
export * from "./components/rules-engine/index.js";

// Legacy exports (deprecated in favor of component architecture)
export type SourceType =
  | "peer_reviewed"
  | "official_site"
  | "reputable_news"
  | "technical_blog"
  | "personal_blog"
  | "forum_post"
  | "user_note";

export type ReliabilityLabel = "unreliable" | "low" | "moderate" | "high";

export interface SourceInput {
  id: string;
  title: string | null;
  url: string | null;
  source_type: SourceType;
  author_name: string | null;
  author_affiliation: string | null;
  published_at: string | null; // ISO string or partial (YYYY or YYYY-MM)
  citations_count: number | null;
  has_references: boolean | null;
  is_official_domain: boolean | null;
  is_corporate_marketing: boolean | null;
  overlaps_with_other_sources: number | null; // 0–5 agreement score
}

export interface ReliabilityScores {
  source_type_score: number;
  author_credentials_score: number;
  evidence_quality_score: number;
  recency_score: number;
  consensus_score: number;
  independence_score: number;
  reliability: number;
  label: ReliabilityLabel;
  trace?: string[];
  normalized?: InternalizedSource;
}

interface InternalizedSource {
  id: string;
  title: string | null;
  url: string | null;
  source_type: SourceType;
  author_name: string | null;
  author_affiliation: string | null;
  published_at: string | null;
  citations_count: number;
  has_references: boolean;
  is_official_domain: boolean;
  is_corporate_marketing: boolean;
  overlaps_with_other_sources: number; // defaults applied
}

const clamp = (value: number, min = 0, max = 5): number => Math.min(Math.max(value, min), max);

const normalizeDateString = (value: string | null): string | null => {
  if (!value) return null;
  if (/^\d{4}$/.test(value)) return `${value}-07-01`;
  if (/^\d{4}-\d{2}$/.test(value)) return `${value}-01`;
  return value;
};

const toDateOrNull = (value: string | null): Date | null => {
  if (!value) return null;
  const normalized = normalizeDateString(value);
  if (!normalized) return null;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const yearsSince = (date: Date, today: Date): number => {
  const msPerYear = 1000 * 60 * 60 * 24 * 365.25;
  const diff = today.getTime() - date.getTime();
  return diff < 0 ? 0 : diff / msPerYear;
};

const labelFor = (score: number): ReliabilityLabel => {
  if (score < 1) return "unreliable";
  if (score < 2.5) return "low";
  if (score < 4) return "moderate";
  return "high";
};

const coerceSource = (input: SourceInput): InternalizedSource => ({
  ...input,
  citations_count: input.citations_count ?? 0,
  has_references: input.has_references ?? false,
  is_official_domain: input.is_official_domain ?? false,
  is_corporate_marketing: input.is_corporate_marketing ?? false,
  overlaps_with_other_sources: input.overlaps_with_other_sources ?? 2,
});

const sourceTypeScore = (sourceType: SourceType, log?: string[]): number => {
  switch (sourceType) {
    case "peer_reviewed":
      log?.push("source_type peer_reviewed -> 5");
      return 5;
    case "official_site":
      log?.push("source_type official_site -> 4.5");
      return 4.5;
    case "reputable_news":
      log?.push("source_type reputable_news -> 4");
      return 4;
    case "technical_blog":
      log?.push("source_type technical_blog -> 3");
      return 3;
    case "personal_blog":
      log?.push("source_type personal_blog -> 2");
      return 2;
    case "forum_post":
      log?.push("source_type forum_post -> 1.5");
      return 1.5;
    default:
      log?.push("source_type user_note -> 1");
      return 1;
  }
};

const authorCredentialsScore = (s: InternalizedSource, log?: string[]): number => {
  const hasAffiliation = Boolean(s.author_affiliation);
  const hasName = Boolean(s.author_name);

  if (s.is_official_domain && hasAffiliation) {
    log?.push("author_credentials official_domain+affiliation -> 4.5");
    return 4.5;
  }
  if (s.is_official_domain && !hasAffiliation) {
    log?.push("author_credentials official_domain no affiliation -> 4");
    return 4;
  }
  if (
    hasAffiliation &&
    ["peer_reviewed", "reputable_news", "technical_blog"].includes(s.source_type)
  ) {
    log?.push("author_credentials affiliation + supported type -> 4");
    return 4;
  }
  if (hasAffiliation) {
    log?.push("author_credentials affiliation only -> 3");
    return 3;
  }
  if (hasName) {
    log?.push("author_credentials name only -> 2");
    return 2;
  }
  log?.push("author_credentials none -> 1");
  return 1;
};

const evidenceQualityScore = (s: InternalizedSource, log?: string[]): number => {
  const c = s.citations_count;
  let citationBucket = 0;
  if (c >= 50) {
    citationBucket = 4;
  } else if (c >= 20) {
    citationBucket = 3;
  } else if (c >= 5) {
    citationBucket = 2;
  } else if (c >= 1) {
    citationBucket = 1;
  }
  const tableWithRefs = [3, 3.5, 4, 4.5, 5];
  const tableNoRefs = [1.5, 2.5, 3, 3.5, 3.5];
  const base = (s.has_references ? tableWithRefs : tableNoRefs)[citationBucket];
  const adjusted = s.is_corporate_marketing ? base - 0.5 : base;
  const finalScore = clamp(adjusted);
  log?.push(
    `evidence_quality refs=${s.has_references} citations=${c} bucket=${citationBucket} marketing=${s.is_corporate_marketing} -> ${finalScore}`,
  );
  return finalScore;
};

const recencyScore = (publishedAt: string | null, today: Date, log?: string[]): number => {
  const date = toDateOrNull(publishedAt);
  if (!date) return 1.5;

  const age = yearsSince(date, today);
  const buckets: Array<{ maxAge: number; score: number }> = [
    { maxAge: 1, score: 5 },
    { maxAge: 2, score: 4.5 },
    { maxAge: 5, score: 3.5 },
    { maxAge: 10, score: 2.5 },
  ];

  for (const bucket of buckets) {
    if (age <= bucket.maxAge) {
      log?.push(`recency age=${age.toFixed(2)}y -> ${bucket.score}`);
      return bucket.score;
    }
  }

  const fallbackScore = 1.5;
  log?.push(`recency age=${age.toFixed(2)}y -> ${fallbackScore}`);
  return fallbackScore;
};

const consensusScore = (s: InternalizedSource, log?: string[]): number => {
  const overlap = s.overlaps_with_other_sources;
  const citations = s.citations_count;

  let overlapBucket = 0;
  if (overlap >= 4) {
    overlapBucket = 2;
  } else if (overlap >= 2) {
    overlapBucket = 1;
  }

  let citationBucket = 0;
  if (citations >= 20) {
    citationBucket = 3;
  } else if (citations >= 5) {
    citationBucket = 2;
  } else if (citations >= 1) {
    citationBucket = 1;
  }

  // Matrix rows: overlap bucket 0/1/2; cols: citation bucket 0/1/2/3
  const table: number[][] = [
    [1.5, 2.5, 3, 3.5], // overlap <2
    [2.5, 3, 3.5, 4], // overlap 2-3.99
    [3.5, 4, 4.5, 5], // overlap >=4
  ];

  const score = table[overlapBucket][citationBucket];
  log?.push(
    `consensus overlap=${overlap} citations=${citations} bucket=(${overlapBucket},${citationBucket}) -> ${score}`,
  );
  return score;
};

const independenceScore = (s: InternalizedSource, log?: string[]): number => {
  if (s.is_corporate_marketing) {
    log?.push("independence corporate_marketing -> 1.5");
    return 1.5;
  }
  if (s.is_official_domain) {
    log?.push("independence official_domain -> 4.5");
    return 4.5;
  }
  if (["peer_reviewed", "reputable_news"].includes(s.source_type)) {
    log?.push("independence peer_reviewed/reputable_news -> 4");
    return 4;
  }
  if (s.source_type === "technical_blog") {
    log?.push("independence technical_blog -> 3.5");
    return 3.5;
  }
  if (["personal_blog", "forum_post", "user_note"].includes(s.source_type)) {
    log?.push("independence personal/blog/forum/user_note -> 2.5");
    return 2.5;
  }
  log?.push("independence default -> 2.5");
  return 2.5;
};

export interface ScoreOptions {
  today?: Date;
  debug?: boolean;
}

export const scoreSource = (input: SourceInput, options: ScoreOptions = {}): ReliabilityScores => {
  const today = options.today ?? new Date();
  const debug = options.debug ?? false;
  const trace: string[] | undefined = debug ? [] : undefined;
  const s = coerceSource(input);

  const sourceType = sourceTypeScore(s.source_type, trace);
  const author = authorCredentialsScore(s, trace);
  const evidence = evidenceQualityScore(s, trace);
  const recency = recencyScore(s.published_at, today, trace);
  const consensus = consensusScore(s, trace);
  const independence = independenceScore(s, trace);

  const reliability = clamp(
    0.25 * sourceType +
      0.15 * author +
      0.2 * evidence +
      0.1 * recency +
      0.15 * consensus +
      0.15 * independence,
  );

  trace?.push(
    `reliability weighted -> ${reliability.toFixed(2)} (source=${sourceType}, author=${author}, evidence=${evidence}, recency=${recency}, consensus=${consensus}, independence=${independence})`,
  );

  const label = labelFor(reliability);

  return {
    source_type_score: sourceType,
    author_credentials_score: author,
    evidence_quality_score: evidence,
    recency_score: recency,
    consensus_score: consensus,
    independence_score: independence,
    reliability,
    label,
    trace,
    normalized: debug ? s : undefined,
  };
};
