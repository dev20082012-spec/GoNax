import { SpeciesRepository } from '../repositories/speciesRepository';
import { ReferenceRepository } from '../repositories/referenceRepository';
import { SpeciesEntity, SpeciesDatasetEntity, SpeciesModelEntity } from '../domain/entities/species';

export class SpeciesService {
  constructor(
    private speciesRepo: SpeciesRepository = new SpeciesRepository(),
    private refRepo: ReferenceRepository = new ReferenceRepository()
  ) {}

  async getAllSpecies(): Promise<SpeciesEntity[]> {
    return this.speciesRepo.findAll();
  }

  async getSpeciesById(id: string): Promise<{
    species: SpeciesEntity;
    datasets: SpeciesDatasetEntity[];
    models: SpeciesModelEntity[];
    references: any[];
  } | null> {
    const species = await this.speciesRepo.findById(id);
    if (!species) return null;

    const datasets = await this.speciesRepo.getDatasetsBySpeciesId(id);
    const models = await this.speciesRepo.getModelsBySpeciesId(id);

    // Collect references from datasets
    const refIds = datasets.map(d => d.reference_id).filter(Boolean);
    const references = [];
    for (const refId of refIds) {
      const ref = await this.refRepo.findById(refId);
      if (ref && !references.some(r => r.id === ref.id)) {
        references.push(ref);
      }
    }

    return {
      species,
      datasets,
      models,
      references
    };
  }

  async getDatasets(speciesId: string): Promise<SpeciesDatasetEntity[]> {
    return this.speciesRepo.getDatasetsBySpeciesId(speciesId);
  }

  async getModels(speciesId: string): Promise<SpeciesModelEntity[]> {
    return this.speciesRepo.getModelsBySpeciesId(speciesId);
  }
}
