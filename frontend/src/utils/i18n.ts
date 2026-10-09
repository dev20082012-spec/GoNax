/**
 * GoNax Internationalization, Formatting & Unit Conversion Engine
 *
 * Provides locale-aware number and date formatting, explicit unit conversion
 * helpers, and centralized scientific terminology definitions.
 *
 * Core Axioms:
 * 1. Metric units (cm, m, kg, g/cm³) are the canonical scientific standard.
 * 2. Compatible units (inches, feet, lbs) are converted with explicit mathematical
 *    traceability — user inputs are never silently mutated or discarded.
 * 3. Numerical precision is preserved to avoid false rounding artifacts.
 */

export type MeasurementUnitSystem = 'metric' | 'imperial';

export interface UnitConversionResult {
  originalValue: number;
  originalUnit: string;
  metricValue: number;
  metricUnit: string;
  displayExplanation: string;
}

// Canonical conversion constants (NIST / SI standards)
export const INCH_TO_CM = 2.54;
export const CM_TO_INCH = 1 / 2.54;
export const FOOT_TO_M = 0.3048;
export const M_TO_FOOT = 1 / 0.3048;
export const KG_TO_LB = 2.20462262;

/**
 * Format a number using locale-aware formatting while preserving precision.
 */
export function formatLocaleNumber(
  value: number,
  fractionDigits: number = 2,
  locale: string = 'en-US'
): string {
  if (value === undefined || value === null || isNaN(value)) {
    return 'N/A';
  }
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits
  }).format(value);
}

/**
 * Format a timestamp into locale-aware date and time string.
 */
export function formatLocaleDateTime(
  dateInput: string | Date,
  locale: string = 'en-US'
): string {
  if (!dateInput) return 'N/A';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return 'N/A';
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);
}

/**
 * Convert DBH from inches to canonical centimeters.
 */
export function convertInchesToCm(inches: number): UnitConversionResult {
  const cm = inches * INCH_TO_CM;
  return {
    originalValue: inches,
    originalUnit: 'in',
    metricValue: parseFloat(cm.toFixed(2)),
    metricUnit: 'cm',
    displayExplanation: `${inches} in × 2.54 = ${cm.toFixed(2)} cm`
  };
}

/**
 * Convert DBH from centimeters to display inches.
 */
export function convertCmToInches(cm: number): UnitConversionResult {
  const inches = cm * CM_TO_INCH;
  return {
    originalValue: cm,
    originalUnit: 'cm',
    metricValue: cm,
    metricUnit: 'cm',
    displayExplanation: `${cm} cm × 0.3937 = ${inches.toFixed(2)} in`
  };
}

/**
 * Convert Tree Height from feet to canonical meters.
 */
export function convertFeetToMeters(feet: number): UnitConversionResult {
  const meters = feet * FOOT_TO_M;
  return {
    originalValue: feet,
    originalUnit: 'ft',
    metricValue: parseFloat(meters.toFixed(2)),
    metricUnit: 'm',
    displayExplanation: `${feet} ft × 0.3048 = ${meters.toFixed(2)} m`
  };
}

/**
 * Convert Tree Height from meters to display feet.
 */
export function convertMetersToFeet(meters: number): UnitConversionResult {
  const feet = meters * M_TO_FOOT;
  return {
    originalValue: meters,
    originalUnit: 'm',
    metricValue: meters,
    metricUnit: 'm',
    displayExplanation: `${meters} m × 3.2808 = ${feet.toFixed(2)} ft`
  };
}

/**
 * Scientific terminology definitions for accessible contextual guidance.
 */
export interface GlossaryTerm {
  term: string;
  abbreviation?: string;
  plainMeaning: string;
  scientificDefinition: string;
  importance: string;
  measurementMethod: string;
  unit: string;
  typicalRange?: string;
}

export const SCIENTIFIC_GLOSSARY: Record<string, GlossaryTerm> = {
  dbh: {
    term: 'Diameter at Breast Height',
    abbreviation: 'DBH',
    plainMeaning: 'The thickness of the tree trunk measured at adult chest height (1.30 meters above the ground).',
    scientificDefinition: 'Standardized stem diameter measured at 1.30 m above ground level on the uphill side of the tree trunk, avoiding swellings, branch whorls, or bark abnormalities.',
    importance: 'The primary biometric predictor in allometric forestry models. Trunk diameter directly scales with sapwood area and conductive xylem mass.',
    measurementMethod: 'Measured with a forestry diameter tape (D-tape) wrapped around the stem, or tree calipers measuring two perpendicular diameters averaged.',
    unit: 'Centimeters (cm) or inches (in)',
    typicalRange: '5 to 150 cm for temperate mature trees; up to 400 cm for ancient giant specimens'
  },
  height: {
    term: 'Total Tree Height',
    abbreviation: 'H',
    plainMeaning: 'The vertical distance from the ground at the base of the trunk to the highest tip of the crown.',
    scientificDefinition: 'Vertical linear distance from the base of the tree stem at ground level to the highest photosynthetic apex of the canopy.',
    importance: 'Combines with DBH to quantify stem taper, vertical volume, and mechanical canopy architecture.',
    measurementMethod: 'Measured in the field using an optical clinometer, laser hypsometer, or ultrasonic vertex instrument from a known distance.',
    unit: 'Meters (m) or feet (ft)',
    typicalRange: '2 to 45 m for temperate species; up to 115+ m for coastal redwoods'
  },
  agb: {
    term: 'Above-Ground Dry Biomass',
    abbreviation: 'AGB',
    plainMeaning: 'The total dry weight of all living parts of the tree above the ground (trunk, branches, bark, and foliage) with all moisture removed.',
    scientificDefinition: 'Oven-dry mass (dried to constant weight at 103 ± 2°C) of all living tree components above the root collar, including trunk wood, bark, branches, and leaves.',
    importance: 'The foundational baseline metric for carbon accounting. Fresh green wood contains 40–60% water; dry biomass reflects pure biological tissue.',
    measurementMethod: 'Historically determined by destructive harvesting and oven drying; in GoNax, estimated deterministically using species-specific empirical power laws.',
    unit: 'Kilograms (kg) or Metric Tonnes (t)',
    typicalRange: '10 kg for saplings to 10,000+ kg for massive mature oaks'
  },
  bgb: {
    term: 'Below-Ground Biomass',
    abbreviation: 'BGB',
    plainMeaning: 'The dry weight of the root system beneath the soil surface.',
    scientificDefinition: 'Oven-dry mass of all living roots, partitioned into coarse structural roots (diameter > 2 mm) and fine absorptive roots.',
    importance: 'Roots typically comprise 18% to 26% of total tree biomass depending on taxon, soil depth, and moisture availability (root-to-shoot ratio).',
    measurementMethod: 'Estimated using species root-to-shoot allometric expansion factors or destructive trench excavations.',
    unit: 'Kilograms (kg) or Metric Tonnes (t)',
    typicalRange: 'Approximately 20–25% of above-ground dry biomass'
  },
  carbon_fraction: {
    term: 'Carbon Fraction',
    abbreviation: 'CF',
    plainMeaning: 'The percentage of the tree’s dry wood mass that consists of elemental carbon atoms.',
    scientificDefinition: 'The stoichiometric mass fraction of pure elemental carbon (C) present in dry wood cellulose, hemicellulose, and lignin compounds.',
    importance: 'Universal default calculators assume 50% for all trees, introducing significant error. GoNax applies species-specific empirical fractions (e.g., 48.2% for Quercus robur, 50.5% for Pinus sylvestris).',
    measurementMethod: 'Laboratory elemental combustion analysis (carbon-nitrogen analyzers) on dried core samples.',
    unit: 'Percentage (%) or dimensionless decimal fraction (e.g. 0.482)',
    typicalRange: '46.0% to 51.5% across temperate tree taxa'
  },
  co2e: {
    term: 'Carbon Dioxide Equivalent',
    abbreviation: 'CO₂e',
    plainMeaning: 'The amount of carbon dioxide gas from the atmosphere that the tree had to absorb to produce its stored carbon.',
    scientificDefinition: 'Atmospheric carbon dioxide equivalent calculated from elemental carbon mass using the stoichiometric molecular weight ratio: CO₂e = C × (44.01 g/mol CO₂ ÷ 12.011 g/mol C) ≈ C × 3.6667.',
    importance: 'Standard currency in climate science, greenhouse gas registries, and carbon credit projects. Explains why stored carbon weighs less than the sequestered gas.',
    measurementMethod: 'Deterministic stoichiometric calculation from verified elemental carbon stock.',
    unit: 'Kilograms CO₂e (kg CO₂e) or Metric Tonnes CO₂e (t CO₂e)',
    typicalRange: 'Always exactly 3.6667 times the elemental carbon stock'
  },
  prediction_interval: {
    term: '95% Prediction Interval',
    abbreviation: '95% PI',
    plainMeaning: 'A realistic range: 95 out of 100 trees with these exact measurements are expected to fall between these lower and upper estimates.',
    scientificDefinition: 'Log-normal statistical confidence bounds computed from the regression model residual standard error (RSE) and variance inflation: [B · exp(-1.96 · RSE), B · exp(+1.96 · RSE)].',
    importance: 'No mathematical model can predict biological wood weight with 100% exactness due to hollow stems, wind stress, or soil variability. The interval reveals real-world uncertainty.',
    measurementMethod: 'Calculated analytically from the residual variance matrix of destructive harvest training datasets.',
    unit: 'Kilograms (kg) [Lower Bound – Upper Bound]',
    typicalRange: 'Typically ±12% to ±25% for high-confidence calibrated models'
  },
  model_applicability: {
    term: 'Model Applicability Envelope',
    abbreviation: 'Calibration Domain',
    plainMeaning: 'The range of tree sizes, ages, and regions where the scientific formula is proven to work accurately.',
    scientificDefinition: 'The multidimensional convex hull of physical variables (DBH, Height, Wood Density) and geographic boundaries represented in the model’s empirical training dataset.',
    importance: 'Applying an equation to a tree larger than the biggest sampled tree in the study causes dangerous mathematical extrapolation error.',
    measurementMethod: 'Empirically defined by the minimum and maximum dimensions recorded in destructive harvest plots.',
    unit: 'Range intervals [min, max]',
    typicalRange: 'Explicitly displayed per model in GoNax (e.g. Oak DBH [10, 140] cm)'
  },
  wood_density: {
    term: 'Basic Wood Density',
    abbreviation: 'ρ (rho)',
    plainMeaning: 'How compact and heavy the dry wood is for a given volume.',
    scientificDefinition: 'The ratio of oven-dry mass of wood to its green (fresh/swollen) volume, expressed in grams per cubic centimeter (g/cm³).',
    importance: 'Directly converts geometric stem volume into dry mass. Dense hardwoods store significantly more carbon per cubic meter than light softwoods.',
    measurementMethod: 'Water displacement on green xylem cores followed by oven drying, or global wood density databases (Zanne et al., Chave et al.).',
    unit: 'Grams per cubic centimeter (g/cm³)',
    typicalRange: '0.35 to 0.85 g/cm³ for temperate species (Oak ≈ 0.65, Pine ≈ 0.45)'
  }
};
