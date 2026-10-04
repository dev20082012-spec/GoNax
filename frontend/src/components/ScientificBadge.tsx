import React from 'react';
import { ConfidenceStatus } from '../types';

interface Props {
  status?: ConfidenceStatus;
  isPrototype?: boolean;
}

export const ScientificBadge: React.FC<Props> = ({ status, isPrototype = false }) => {
  return (
    <div style={{ display: 'inline-flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
      {isPrototype ? (
        <span className="badge badge-prototype" title="Prototype Demonstration: Calibrated for pipeline evaluation.">
          PROTOTYPE MODEL
        </span>
      ) : (
        <span className="badge badge-high" style={{ background: 'rgba(46, 125, 50, 0.15)', color: '#2e7d32', borderColor: 'rgba(46, 125, 50, 0.3)', fontWeight: 700 }} title="Real trained scientific ML model trained on peer-reviewed destructive harvest data">
          REAL TRAINED MODEL
        </span>
      )}
      {(status === 'HIGH_CONFIDENCE' || (status as string) === 'HIGH') && (
        <span className="badge badge-high" title="Within calibrated core envelope (RSE < 12%)">
          HIGH CONFIDENCE
        </span>
      )}
      {(status === 'CALIBRATED_RANGE' || (status as string) === 'MEDIUM') && (
        <span className="badge badge-medium" title="Within empirical calibration domain">
          CALIBRATED RANGE
        </span>
      )}
      {status === 'EXTRAPOLATION_WARNING' && (
        <span className="badge badge-warning" title="Field measurements exceed training calibration boundaries. Mathematical extrapolation.">
          EXTRAPOLATION WARNING
        </span>
      )}
      {status === 'GEOGRAPHIC_MISMATCH' && (
        <span className="badge badge-warning" title="Coordinates or climate zone mismatch model calibration domain.">
          GEOGRAPHIC MISMATCH
        </span>
      )}
      {status === 'HIGH_UNCERTAINTY' && (
        <span className="badge badge-warning" title="Wide prediction intervals or high residual error.">
          HIGH UNCERTAINTY
        </span>
      )}
    </div>
  );
};
