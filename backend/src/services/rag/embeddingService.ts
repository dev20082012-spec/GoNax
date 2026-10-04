import crypto from 'crypto';
import { config } from '../../config';

export class EmbeddingService {
  private dimension = 256;

  private domainKeywords: Record<string, number> = {
    allometry: 0,
    allometric: 1,
    biomass: 2,
    carbon: 3,
    density: 4,
    wood: 5,
    dbh: 6,
    diameter: 7,
    height: 8,
    stem: 9,
    volume: 10,
    uncertainty: 11,
    residual: 12,
    rse: 13,
    rmse: 14,
    r2: 15,
    destructive: 16,
    harvest: 17,
    foliage: 18,
    needle: 19,
    branch: 20,
    bark: 21,
    root: 22,
    shoot: 23,
    co2: 24,
    stoichiometry: 25,
    ratio: 26,
    quercus: 27,
    robur: 28,
    pinus: 29,
    sylvestris: 30,
    fagus: 31,
    sylvatica: 32,
    oak: 33,
    pine: 34,
    beech: 35,
    baad: 36,
    zianis: 37,
    chave: 38,
    jenkins: 39,
    thomas: 40,
    ipcc: 41,
    fennoscandia: 42,
    sweden: 43,
    finland: 44,
    europe: 45,
    ridge: 46,
    regression: 47,
    extrapolation: 48,
    power: 49,
    model: 50,
    dataset: 51,
    sample: 52,
    tier: 53,
    confidence: 54
  };

  async generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim() === '') {
      return new Array(this.dimension).fill(0);
    }

    const clean = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
    const tokens = clean.split(/\s+/).filter(t => t.length > 1);

    const vec = new Array(this.dimension).fill(0);

    for (const token of tokens) {
      if (this.domainKeywords[token] !== undefined) {
        const dim = this.domainKeywords[token];
        vec[dim] += 3.5;
      }
    }

    for (const token of tokens) {
      const hash1 = this.hashString(token);
      const dim1 = 55 + (Math.abs(hash1) % (this.dimension - 55));
      vec[dim1] += 1.0;

      for (let i = 0; i < token.length - 2; i++) {
        const tri = token.slice(i, i + 3);
        const hashTri = this.hashString(tri);
        const dimTri = 55 + (Math.abs(hashTri) % (this.dimension - 55));
        vec[dimTri] += 0.35;
      }
    }

    for (let i = 0; i < tokens.length - 1; i++) {
      const bi = `${tokens[i]}_${tokens[i + 1]}`;
      const hashBi = this.hashString(bi);
      const dimBi = 55 + (Math.abs(hashBi) % (this.dimension - 55));
      vec[dimBi] += 0.75;
    }

    let normSq = 0;
    for (let i = 0; i < this.dimension; i++) {
      normSq += vec[i] * vec[i];
    }
    const norm = Math.sqrt(normSq);
    if (norm > 0) {
      for (let i = 0; i < this.dimension; i++) {
        vec[i] = Number((vec[i] / norm).toFixed(6));
      }
    }

    return vec;
  }

  cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
    const len = Math.min(vecA.length, vecB.length);
    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < len; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return Number((dot / (Math.sqrt(normA) * Math.sqrt(normB))).toFixed(5));
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}
