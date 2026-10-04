import { v4 as uuidv4 } from 'uuid';
import { ObservationRepository } from '../repositories/observationRepository';
import { SpeciesRepository } from '../repositories/speciesRepository';
import { TreeObservationEntity } from '../domain/entities/observation';
import { TreeMeasurementInput } from '../domain/engine/types';
import { ValidationService } from './validationService';

export class ObservationService {
  private validationService: ValidationService;

  constructor(
    private obsRepo: ObservationRepository = new ObservationRepository(),
    private speciesRepo: SpeciesRepository = new SpeciesRepository()
  ) {
    this.validationService = new ValidationService();
  }

  async validateAndCreate(input: TreeMeasurementInput): Promise<{ observation: TreeObservationEntity; species: any; validationReport: any }> {
    if (!input.speciesId || typeof input.speciesId !== 'string') {
      throw new Error('Invalid speciesId: must be a valid string identifier.');
    }

    let species = await this.speciesRepo.findById(input.speciesId);
    if (!species) {
      const all = await this.speciesRepo.findAll();
      species = all.find(
        s => s.scientific_name.toLowerCase() === input.speciesId.toLowerCase() ||
             s.scientific_name.toLowerCase().replace(/\s+/g, '_') === input.speciesId.toLowerCase() ||
             s.common_name.toLowerCase().includes(input.speciesId.toLowerCase())
      ) || null;
    }
    if (!species) {
      throw new Error(`Species with identifier or name "${input.speciesId}" not found in scientific database.`);
    }

    const report = this.validationService.validate(input, species, null);

    const observation: TreeObservationEntity = {
      id: uuidv4(),
      species_id: species.id,
      dbh_cm: report.sanitizedInput.dbhCm,
      height_m: report.sanitizedInput.heightM,
      crown_diameter_m: report.sanitizedInput.crownDiameterM,
      wood_density_override: report.sanitizedInput.woodDensityOverride,
      latitude: report.sanitizedInput.latitude,
      longitude: report.sanitizedInput.longitude,
      observation_notes: report.sanitizedInput.notes,
      created_at: new Date().toISOString()
    };

    const saved = await this.obsRepo.create(observation);
    return { observation: saved, species, validationReport: report };
  }

  async getObservationById(id: string): Promise<TreeObservationEntity | null> {
    return this.obsRepo.findById(id);
  }
}
