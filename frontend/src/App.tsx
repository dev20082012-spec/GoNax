import React, { useState } from 'react';
import { Navbar, PageView } from './components/Navbar';
import { Footer } from './components/Footer';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { SpeciesPage } from './pages/SpeciesPage';
import { MeasurementFormPage } from './pages/MeasurementFormPage';
import { ResultPage } from './pages/ResultPage';
import { HistoryPage } from './pages/HistoryPage';
import { ComparisonPage } from './pages/ComparisonPage';
import { ModelsPage } from './pages/ModelsPage';
import { DatasetsPage } from './pages/DatasetsPage';
import { EvidencePage } from './pages/EvidencePage';
import { ScientificAssistantPage } from './pages/ScientificAssistantPage';
import { AboutPage } from './pages/AboutPage';
import { ResearchAdminPage } from './pages/ResearchAdminPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { EnrichedPrediction } from './types';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageView>('landing');
  const [selectedSpeciesIdForMeasurement, setSelectedSpeciesIdForMeasurement] = useState<string | null>(null);
  const [activePredictionId, setActivePredictionId] = useState<string | null>(null);
  const [activePredictionData, setActivePredictionData] = useState<EnrichedPrediction | null>(null);
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);

  // dont touch this state otherwise routing goess crazy lol
  const handleSelectSpeciesToMeasure = (speciesId: string) => {
    setSelectedSpeciesIdForMeasurement(speciesId);
    setCurrentPage('measure');
  };

  // autometically save prediciton into compare list
  const handlePredictionComplete = (prediction: EnrichedPrediction) => {
    setActivePredictionId(prediction.prediction.id);
    setActivePredictionData(prediction);
    if (!comparisonIds.includes(prediction.prediction.id)) {
      setComparisonIds(prev => [...prev, prediction.prediction.id]);
    }
    setCurrentPage('result');
  };

  // reseting data here so it reload fresh from backend servr
  const handleViewPrediction = (id: string) => {
    setActivePredictionId(id);
    setActivePredictionData(null); 
    setCurrentPage('result');
  };

  const handleNewMeasurement = () => {
    setCurrentPage('measure');
  };

  const handleAddToComparison = (id: string) => {
    if (!comparisonIds.includes(id)) {
      setComparisonIds(prev => [...prev, id]);
    }
    setCurrentPage('comparison');
  };

  const handleComparePredictions = (ids: string[]) => {
    setComparisonIds(ids);
    setCurrentPage('comparison');
  };

  const handleRemoveFromComparison = (id: string) => {
    setComparisonIds(prev => prev.filter(x => x !== id));
  };

  const handleClearComparison = () => {
    setComparisonIds([]);
  };

  const handleAskAssistant = (speciesId?: string) => {
    if (speciesId) {
      setSelectedSpeciesIdForMeasurement(speciesId);
    }
    setCurrentPage('assistant');
  };

  return (
    <div className="app-container">
      <Navbar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        comparisonCount={comparisonIds.length}
      />

      <main className="main-content">
        {currentPage === 'landing' && (
          <LandingPage
            setCurrentPage={setCurrentPage}
            onSelectSpeciesToMeasure={handleSelectSpeciesToMeasure}
          />
        )}

        {currentPage === 'dashboard' && (
          <DashboardPage
            setCurrentPage={setCurrentPage}
            onViewPrediction={handleViewPrediction}
            onSelectSpecies={handleSelectSpeciesToMeasure}
          />
        )}

        {currentPage === 'species' && (
          <SpeciesPage
            onSelectForMeasurement={handleSelectSpeciesToMeasure}
            onAskAssistant={handleAskAssistant}
          />
        )}

        {currentPage === 'measure' && (
          <MeasurementFormPage
            initialSpeciesId={selectedSpeciesIdForMeasurement}
            onPredictionComplete={handlePredictionComplete}
          />
        )}

        {currentPage === 'result' && (
          <ResultPage
            predictionId={activePredictionId}
            initialPrediction={activePredictionData}
            setCurrentPage={setCurrentPage}
            onNewMeasurement={handleNewMeasurement}
            onCompare={handleAddToComparison}
          />
        )}

        {currentPage === 'comparison' && (
          <ComparisonPage
            selectedPredictionIds={comparisonIds}
            onRemoveFromComparison={handleRemoveFromComparison}
            onClearComparison={handleClearComparison}
            onViewPrediction={handleViewPrediction}
            onNewMeasurement={handleNewMeasurement}
          />
        )}

        {currentPage === 'history' && (
          <HistoryPage
            onViewPrediction={handleViewPrediction}
            onNewMeasurement={handleNewMeasurement}
            onComparePredictions={handleComparePredictions}
          />
        )}

        {currentPage === 'models' && <ModelsPage />}

        {currentPage === 'datasets' && <DatasetsPage />}

        {currentPage === 'evidence' && <EvidencePage />}

        {currentPage === 'assistant' && (
          <ScientificAssistantPage
            initialSpeciesId={selectedSpeciesIdForMeasurement}
            initialPrediction={activePredictionData}
            onNavigateToMeasurement={handleSelectSpeciesToMeasure}
          />
        )}

        {currentPage === 'research' && <ResearchAdminPage />}

        {currentPage === 'about' && <AboutPage />}

        {currentPage === 'privacy' && <PrivacyPage setCurrentPage={setCurrentPage} />}

        {currentPage === 'terms' && <TermsPage setCurrentPage={setCurrentPage} />}
      </main>

      <Footer setCurrentPage={setCurrentPage} />
    </div>
  );
};
